"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"

import { PedidoCompraSummaryModal } from "@/components/pedido-compra/PedidoCompraSummaryModal"
import { PageLayout } from "@/components/ui/pageLayout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PedidoCompraListFilters } from "./list/PedidoCompraListFilters"
import { PedidoCompraListHeader } from "./list/PedidoCompraListHeader"
import { PedidoCompraListPagination } from "./list/PedidoCompraListPagination"
import { PedidoCompraListTable } from "./list/PedidoCompraListTable"
import { PedidoCompraListToolbar } from "./list/PedidoCompraListToolbar"
import { PedidoCompraSelectionToolbar } from "./list/PedidoCompraSelectionToolbar"
import { PedidoCompraStatusTabs } from "./list/PedidoCompraStatusTabs"
import { listShellClass, listToolbarClass } from "./list/styles"

import { editableStatusList, statusConfig, statusList, type StatusSlug } from "@/lib/pedido-compra-theme"
import {
  deletePedidoCompraBulkRequest,
  deletePedidoCompraRequest,
  fetchPedidoCompraList,
  integratePedidoCompraBulkRequest,
  integratePedidoCompraRequest,
  reversePedidoCompraIntegrationBulkRequest,
  reversePedidoCompraIntegrationRequest,
  updatePedidoCompraStatusBulkRequest,
  updatePedidoCompraStatusRequest,
} from "@/lib/pedido-compra-client"
import { formatDateOnlyPtBr, fromDateOnlyDb } from "@/lib/date-only"
import {
  canIntegratePedido,
  canReversePedidoIntegration,
  getPedidoFinanceBadgeClass,
  getPedidoFinanceLabel,
} from "@/lib/pedido-compra-finance"
import {
  asNumber,
  formatMoney,
  formatPedidoId,
  fromSlugStatus,
  normalizeStatus as normalizeStatusUtil,
  toCategoryLabel,
  toSlugStatus,
} from "@/lib/pedido-compra-utils"
import type {
  FornecedorOption,
  ListarResult,
  ObraSearchItem,
  PedidoCompraSummaryInitialData,
  PedidoStatus,
  PurchaseOrder,
  PurchaseOrderCategoryLabel,
  PurchaseOrderStatusSlug,
} from "@/types/pedido-compra"

type Props = {
  initialList: ListarResult
  initialFornecedores: FornecedorOption[]
  initialObrasById: Record<number, ObraSearchItem>
}

type PedidoCompraSortBy = "date" | "number" | "description" | "category" | "value" | "actualValue" | "delivery" | "status" | "integration"

type PedidoCompraUIState = {
  viewMode: "list" | "kanban"
  kanbanGroupBy: "category" | "status"
  showEmptyColumns: boolean
  onlyActiveObras: boolean
  searchTerm: string
  selectedStatus: PurchaseOrderStatusSlug
  selectedCategory: PurchaseOrderCategoryLabel | "todas"
  selectedSupplierId: number | "all"
  selectedProjectId: number | null
  sortBy: PedidoCompraSortBy
  sortOrder: "asc" | "desc"
}

const STORAGE_KEY = "pedido_compra_ui_state_v1"
const categories: PurchaseOrderCategoryLabel[] = ["Madeira", "Telha", "Andaime", "Materiais"]
const statuses = statusList

function loadUIState(): Partial<PedidoCompraUIState> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PedidoCompraUIState>) : null
  } catch {
    return null
  }
}

function saveUIState(state: PedidoCompraUIState) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function formatProjectLabel(obraId: number, obrasById: Record<number, ObraSearchItem>) {
  const obra = obrasById?.[obraId]
  const titulo = (obra?.titulo ?? "").trim()
  if (titulo) return `Obra #${obraId} — ${titulo}`
  return `Obra #${obraId}`
}

function getCategoryColor(category: string) {
  switch (category?.toLowerCase()) {
    case "telha":
    case "telhas":
      return "bg-red-100 text-red-800 border-red-200"
    case "madeira":
      return "bg-amber-100 text-amber-900 border-amber-200"
    case "andaime":
      return "bg-gray-200 text-gray-800 border-gray-300"
    case "materiais":
    case "material":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-secondary text-secondary-foreground border-border"
  }
}

function formatSafeDate(dateValue: string | null | undefined) {
  if (!dateValue) return "-"
  return formatDateOnlyPtBr(dateValue)
}

function mapApiToOrders(list: ListarResult, obrasById: Record<number, ObraSearchItem>): PurchaseOrder[] {
  return (list.items ?? []).map((item) => {
    const obraId = Number(item.obra_id)
    const fornecedorId = item.fornecedor?.id != null ? Number(item.fornecedor.id) : null

    return {
      id: String(item.id),
      number: formatPedidoId(item.id, item.obra_id),
      description: (item.descricao ?? "").trim() || "—",
      category: toCategoryLabel(item.categoria),
      supplier: (item.fornecedor?.nome ?? "").trim() || "—",
      supplierId: fornecedorId,
      project: formatProjectLabel(obraId, obrasById),
      obraId,
      obraStatus: item.obra_status ?? null,
      obraTitulo: item.obra_titulo ?? null,
      obraCidade: item.obra_cidade ?? null,
      expectedValue: asNumber(item.valor_pedido ?? item.valor_orcado),
      orderValue: asNumber(item.valor_pedido ?? item.valor_orcado),
      actualValue: item.valor_realizado == null ? undefined : asNumber(item.valor_realizado),
      deliveryDate: fromDateOnlyDb(item.data_entrega),
      status: toSlugStatus(item.status),
      integrated: item.financeiro_integracao_status === "INTEGRADO",
      financeiroIntegracaoStatus: item.financeiro_integracao_status,
      financeiroContaPagarId: item.financeiro_conta_pagar_id,
      financeiroContaPagarStatus: item.financeiro_conta_pagar_status,
      integratedCode: item.financeiro_conta_pagar_id == null ? undefined : `CP #${item.financeiro_conta_pagar_id}`,
      viewed: true,
      createdAt: item.created_at ? String(item.created_at) : new Date().toISOString(),
    }
  })
}

function mapOrderToSummaryInitialData(order: PurchaseOrder): PedidoCompraSummaryInitialData {
  return {
    id: Number(order.id),
    obraId: order.obraId,
    obraTitulo: order.obraTitulo,
    descricao: order.description,
    categoria: order.category,
    status: fromSlugStatus(order.status as StatusSlug),
    fornecedorNome: order.supplier,
    valorOrcado: order.expectedValue,
    valorPedido: order.orderValue ?? order.expectedValue,
    valorRealizado: order.actualValue ?? null,
    dataEntrega: order.deliveryDate,
    integrado: order.integrated,
    integracaoFinanceiraStatus: order.financeiroIntegracaoStatus,
    financeiroContaPagarId: order.financeiroContaPagarId ?? null,
    financeiroContaPagarStatus: order.financeiroContaPagarStatus ?? null,
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function parseFornecedorOptions(body: unknown): FornecedorOption[] {
  const list = Array.isArray(body)
    ? body
    : typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data
      : []

  return list
    .map((item) => {
      if (typeof item !== "object" || item === null) return null
      const record = item as Record<string, unknown>
      const id = Number(record.id)
      return Number.isFinite(id) && id > 0 ? { id, nome: String(record.nome ?? "") } : null
    })
    .filter((item): item is FornecedorOption => item !== null)
}

function parseObraSearchItems(body: unknown): ObraSearchItem[] {
  const list = typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data)
    ? (body as { data: unknown[] }).data
    : Array.isArray(body)
      ? body
      : []

  return list
    .map((item) => {
      if (typeof item !== "object" || item === null) return null
      const record = item as Record<string, unknown>
      const id = Number(record.id)
      if (!Number.isFinite(id) || id <= 0) return null
      return {
        id,
        titulo: record.titulo == null ? null : String(record.titulo),
        nomeReceptor: record.nomeReceptor == null ? null : String(record.nomeReceptor),
        telefoneReceptor: record.telefoneReceptor == null ? null : String(record.telefoneReceptor),
        enderecoEntrega: record.enderecoEntrega == null ? null : String(record.enderecoEntrega),
        linkMaps: record.linkMaps == null ? null : String(record.linkMaps),
      }
    })
    .filter((item): item is ObraSearchItem => item !== null)
}

export default function PedidoCompraPageClient({ initialList, initialFornecedores, initialObrasById }: Props) {
  const router = useRouter()
  const persisted = React.useMemo(() => loadUIState(), [])

  const [searchTerm, setSearchTerm] = React.useState(persisted?.searchTerm ?? "")
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(persisted?.selectedProjectId ?? null)
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<number | "all">(persisted?.selectedSupplierId ?? "all")
  const [selectedStatus, setSelectedStatus] = React.useState<PurchaseOrderStatusSlug>(persisted?.selectedStatus ?? "todos")
  const [selectedCategory, setSelectedCategory] = React.useState<PurchaseOrderCategoryLabel | "todas">(persisted?.selectedCategory ?? "todas")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [viewMode, setViewMode] = React.useState<"list" | "kanban">(persisted?.viewMode ?? "list")
  const [kanbanGroupBy, setKanbanGroupBy] = React.useState<"category" | "status">(persisted?.kanbanGroupBy ?? "status")
  const [showEmptyColumns, setShowEmptyColumns] = React.useState(persisted?.showEmptyColumns ?? true)
  const [onlyActiveObras, setOnlyActiveObras] = React.useState(persisted?.onlyActiveObras ?? true)
  const [sortBy, setSortBy] = React.useState<PedidoCompraSortBy>(persisted?.sortBy ?? "date")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(persisted?.sortOrder ?? "desc")
  const [fornecedores, setFornecedores] = React.useState<FornecedorOption[]>(initialFornecedores ?? [])
  const [obrasById, setObrasById] = React.useState<Record<number, ObraSearchItem>>(initialObrasById ?? {})
  const [orders, setOrders] = React.useState<PurchaseOrder[]>(() => mapApiToOrders(initialList, initialObrasById))
  const [draggedItem, setDraggedItem] = React.useState<PurchaseOrder | null>(null)
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [selectedOrderInitialData, setSelectedOrderInitialData] = React.useState<PedidoCompraSummaryInitialData | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = React.useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)
  const [financeActionDialogOpen, setFinanceActionDialogOpen] = React.useState(false)
  const [bulkStatusDraft, setBulkStatusDraft] = React.useState<PedidoStatus>("RASCUNHO")
  const [bulkStatusSaving, setBulkStatusSaving] = React.useState(false)
  const [bulkDeleteSaving, setBulkDeleteSaving] = React.useState(false)
  const [financeActionSaving, setFinanceActionSaving] = React.useState(false)
  const [financeActionKind, setFinanceActionKind] = React.useState<"integrate" | "reverse">("integrate")
  const [financeActionTargetIds, setFinanceActionTargetIds] = React.useState<string[]>([])
  const [obraOpen, setObraOpen] = React.useState(false)
  const [obraQuery, setObraQuery] = React.useState("")
  const [obraLoading, setObraLoading] = React.useState(false)
  const [obraOptions, setObraOptions] = React.useState<ObraSearchItem[]>([])
  const [obraSelected, setObraSelected] = React.useState<ObraSearchItem | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(() => (persisted?.selectedProjectId ?? null) != null)

  const itemsPerPage = 15
  const kanbanScrollRef = React.useRef<HTMLDivElement | null>(null)
  const panStateRef = React.useRef({ active: false, startX: 0, startLeft: 0 })
  const didPanRef = React.useRef(false)
  const didInitialLoad = React.useRef(false)
  const [isPanning, setIsPanning] = React.useState(false)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  React.useEffect(() => {
    if ((initialFornecedores ?? []).length > 0) return

    const loadFornecedores = async () => {
      try {
        const response = await fetch("/api/fornecedores", { cache: "no-store" })
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.error || body?.message || "Falha ao listar fornecedores")
        setFornecedores(parseFornecedorOptions(body))
      } catch {}
    }

    void loadFornecedores()
  }, [initialFornecedores])

  React.useEffect(() => {
    if (!obraOpen) return
    const query = obraQuery.trim()
    if (!query) {
      setObraOptions([])
      return
    }

    let canceled = false
    const timeoutId = window.setTimeout(async () => {
      setObraLoading(true)
      try {
        const response = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.error || body?.message || "Falha ao pesquisar obras")
        const mapped = parseObraSearchItems(body)
        if (!canceled) setObraOptions(mapped)
      } catch {
        if (!canceled) setObraOptions([])
      } finally {
        if (!canceled) setObraLoading(false)
      }
    }, 400)

    return () => {
      canceled = true
      clearTimeout(timeoutId)
    }
  }, [obraOpen, obraQuery])

  React.useEffect(() => {
    if (!selectedProjectId) {
      setObraSelected(null)
      return
    }

    const cached = obrasById[selectedProjectId]
    if (cached) {
      setObraSelected(cached)
      return
    }

    let canceled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(String(selectedProjectId))}`, {
          cache: "no-store",
        })
        const body = await response.json().catch(() => null)
        const [first] = parseObraSearchItems(body)
        if (!first || canceled) return
        setObrasById((current) => ({ ...current, [first.id]: first }))
        setObraSelected(first)
      } catch {}
    }, 0)

    return () => {
      canceled = true
      clearTimeout(timeoutId)
    }
  }, [obrasById, selectedProjectId])

  const hasActiveFilters =
    selectedProjectId != null ||
    selectedSupplierId !== "all" ||
    searchTerm !== "" ||
    selectedStatus !== "todos" ||
    selectedCategory !== "todas" ||
    onlyActiveObras

  const clearFilters = React.useCallback(() => {
    setSearchTerm("")
    setSelectedProjectId(null)
    setSelectedSupplierId("all")
    setSelectedStatus("todos")
    setSelectedCategory("todas")
    setOnlyActiveObras(false)
    setObraSelected(null)
    setObraQuery("")
    setShowAdvancedFilters(false)
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
  }, [])

  const baseFilteredOrders = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      if (onlyActiveObras && order.obraStatus === "Finalizado") return false

      const matchesSearch =
        !query ||
        order.number.toLowerCase().includes(query) ||
        order.supplier.toLowerCase().includes(query) ||
        order.description.toLowerCase().includes(query) ||
        order.project.toLowerCase().includes(query) ||
        (order.obraTitulo ?? "").toLowerCase().includes(query)

      const matchesProject = selectedProjectId == null || order.obraId === selectedProjectId
      const matchesSupplier = selectedSupplierId === "all" || order.supplierId === selectedSupplierId
      const matchesCategory = selectedCategory === "todas" || order.category === selectedCategory

      return matchesSearch && matchesProject && matchesSupplier && matchesCategory
    })
  }, [onlyActiveObras, orders, searchTerm, selectedCategory, selectedProjectId, selectedSupplierId])

  const statusCounts = React.useMemo(
    () => ({
      todos: baseFilteredOrders.length,
      rascunho: baseFilteredOrders.filter((order) => order.status === "rascunho").length,
      aprovado: baseFilteredOrders.filter((order) => order.status === "aprovado").length,
      "em-compra": baseFilteredOrders.filter((order) => order.status === "em-compra").length,
      "aguardando-pagamento": baseFilteredOrders.filter((order) => order.status === "aguardando-pagamento").length,
      "aguardando-entrega": baseFilteredOrders.filter((order) => order.status === "aguardando-entrega").length,
      entregue: baseFilteredOrders.filter((order) => order.status === "entregue").length,
    }),
    [baseFilteredOrders]
  )

  const filteredOrders = React.useMemo(() => {
    if (selectedStatus === "todos") return baseFilteredOrders
    return baseFilteredOrders.filter((order) => order.status === selectedStatus)
  }, [baseFilteredOrders, selectedStatus])

  const sortedOrders = React.useMemo(() => {
    const next = [...filteredOrders]
    next.sort((a, b) => {
      let comparison = 0
      if (sortBy === "date") comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "number") comparison = Number(a.id) - Number(b.id)
      if (sortBy === "description") comparison = a.description.localeCompare(b.description, "pt-BR")
      if (sortBy === "category") comparison = a.category.localeCompare(b.category, "pt-BR")
      if (sortBy === "value") comparison = a.expectedValue - b.expectedValue
      if (sortBy === "actualValue") comparison = (a.actualValue ?? -Infinity) - (b.actualValue ?? -Infinity)
      if (sortBy === "delivery") comparison = (a.deliveryDate ?? "9999-12-31").localeCompare(b.deliveryDate ?? "9999-12-31")
      if (sortBy === "status") {
        const order = ["todos", "rascunho", "aprovado", "em-compra", "aguardando-pagamento", "aguardando-entrega", "entregue"]
        comparison = order.indexOf(a.status) - order.indexOf(b.status)
      }
      if (sortBy === "integration") comparison = a.financeiroIntegracaoStatus.localeCompare(b.financeiroIntegracaoStatus, "pt-BR")
      return sortOrder === "asc" ? comparison : -comparison
    })
    return next
  }, [filteredOrders, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage)
  const paginatedOrderIds = React.useMemo(() => paginatedOrders.map((order) => order.id), [paginatedOrders])
  const selectedVisibleCount = React.useMemo(
    () => paginatedOrderIds.filter((orderId) => selectedIds.includes(orderId)).length,
    [paginatedOrderIds, selectedIds]
  )
  const selectedCount = selectedIds.length
  const allVisibleSelected = paginatedOrderIds.length > 0 && selectedVisibleCount === paginatedOrderIds.length
  const visibleSelectionState: boolean | "indeterminate" = allVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false
  const selectedOrder = React.useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedProjectId, selectedSupplierId, selectedStatus, selectedCategory])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  React.useEffect(() => {
    setSelectedIds([])
  }, [viewMode, currentPage, searchTerm, selectedProjectId, selectedSupplierId, selectedStatus, selectedCategory, sortBy, sortOrder])

  const ordersByCategory = React.useMemo(
    () =>
      categories.reduce((acc, category) => {
        acc[category] = sortedOrders.filter((order) => order.category === category)
        return acc
      }, {} as Record<PurchaseOrderCategoryLabel, PurchaseOrder[]>),
    [sortedOrders]
  )

  const ordersByStatus = React.useMemo(
    () =>
      statuses.reduce((acc, status) => {
        acc[status] = sortedOrders.filter((order) => order.status === status)
        return acc
      }, {} as Record<Exclude<PurchaseOrderStatusSlug, "todos">, PurchaseOrder[]>),
    [sortedOrders]
  )

  const getDisplayGroups = React.useCallback(() => {
    if (kanbanGroupBy === "category") {
      const list = showEmptyColumns ? categories : categories.filter((category) => ordersByCategory[category].length > 0)
      return list.map((category) => ({ key: category, label: category, orders: ordersByCategory[category] }))
    }

    const list = showEmptyColumns ? statuses : statuses.filter((status) => ordersByStatus[status].length > 0)
    return list.map((status) => ({ key: status, label: statusConfig[status].label, orders: ordersByStatus[status] }))
  }, [kanbanGroupBy, ordersByCategory, ordersByStatus, showEmptyColumns])

  const activeFilterChips = React.useMemo(() => {
    const chips: Array<{ key: string; label: string }> = []
    if (selectedCategory !== "todas") chips.push({ key: "category", label: `Categoria: ${selectedCategory}` })
    if (selectedSupplierId !== "all") {
      const supplier = fornecedores.find((item) => item.id === selectedSupplierId)
      if (supplier) chips.push({ key: "supplier", label: `Fornecedor: ${supplier.nome}` })
    }
    if (selectedProjectId != null) {
      chips.push({
        key: "project",
        label: obraSelected?.titulo ? `Obra: #${selectedProjectId} — ${obraSelected.titulo}` : `Obra: #${selectedProjectId}`,
      })
    }
    if (onlyActiveObras) chips.push({ key: "active-obras", label: "Obras ativas" })
    return chips
  }, [fornecedores, obraSelected, onlyActiveObras, selectedCategory, selectedProjectId, selectedSupplierId])

  const removeFilterChip = React.useCallback((key: string) => {
    if (key === "category") setSelectedCategory("todas")
    if (key === "supplier") setSelectedSupplierId("all")
    if (key === "project") {
      setSelectedProjectId(null)
      setObraSelected(null)
      setObraQuery("")
    }
    if (key === "active-obras") setOnlyActiveObras(false)
  }, [])

  const handleSortChange = React.useCallback((column: PedidoCompraSortBy) => {
    setSortBy((current) => {
      if (current === column) {
        setSortOrder((direction) => direction === "asc" ? "desc" : "asc")
        return current
      }

      setSortOrder(["date", "value", "actualValue", "delivery"].includes(column) ? "desc" : "asc")
      return column
    })
  }, [])

  const handleRecarregar = React.useCallback(async () => {
    try {
      const list = await fetchPedidoCompraList({})
      const obraIds = Array.from(new Set((list.items ?? []).map((item) => Number(item?.obra_id)).filter((id) => Number.isFinite(id) && id > 0)))
      const nextObrasById = { ...obrasById }

      await Promise.all(
        obraIds.map(async (id) => {
          if (nextObrasById[id]) return
          const response = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(String(id))}`, { cache: "no-store" })
          const body = await response.json().catch(() => null)
          const [first] = parseObraSearchItems(body)
          if (!first) return
          nextObrasById[id] = first
        })
      )

      setObrasById(nextObrasById)
      setOrders(mapApiToOrders(list, nextObrasById))
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao carregar pedidos"))
    }
  }, [obrasById])

  React.useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    if ((initialList.items ?? []).length === 0) void handleRecarregar()
  }, [handleRecarregar, initialList])

  const handleDrop = async (event: React.DragEvent, targetGroup: string) => {
    event.preventDefault()
    if (!draggedItem || kanbanGroupBy !== "status") {
      setDraggedItem(null)
      return
    }

    const nextStatus = targetGroup as Exclude<PurchaseOrderStatusSlug, "todos">
    if (draggedItem.status === nextStatus) {
      setDraggedItem(null)
      return
    }

    const previous = orders
    setOrders(previous.map((order) => (order.id === draggedItem.id ? { ...order, status: nextStatus } : order)))
    setDraggedItem(null)

    try {
      await updatePedidoCompraStatusRequest(draggedItem.id, fromSlugStatus(nextStatus))
      toast.success("Status atualizado")
      await handleRecarregar()
    } catch (error) {
      setOrders(previous)
      toast.error(getErrorMessage(error, "Falha ao atualizar status"))
    }
  }

  const toggleOrderSelection = React.useCallback((orderId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return current.includes(orderId) ? current : [...current, orderId]
      return current.filter((id) => id !== orderId)
    })
  }, [])

  const toggleVisibleSelection = React.useCallback((checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...paginatedOrderIds]))
      return current.filter((id) => !paginatedOrderIds.includes(id))
    })
  }, [paginatedOrderIds])

  const handleOrderClick = React.useCallback((order: PurchaseOrder) => {
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, viewed: true } : item)))
    setSelectedOrderId(order.id)
    setSelectedOrderInitialData(mapOrderToSummaryInitialData(order))
  }, [])

  const handleExcluir = React.useCallback(async (order: PurchaseOrder) => {
    if (order.integrated) {
      toast.error("Estorne a integração financeira antes de excluir o pedido.")
      return
    }
    const confirmed = window.confirm(`Excluir o pedido ${order.number}? Esta acao nao pode ser desfeita.`)
    if (!confirmed) return
    try {
      await deletePedidoCompraRequest(order.id)
      toast.success("Pedido excluido")
      if (selectedOrderId === order.id) {
        setSelectedOrderId(null)
        setSelectedOrderInitialData(null)
      }
      await handleRecarregar()
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao excluir pedido"))
    }
  }, [handleRecarregar, selectedOrderId])

  const openFinanceActionDialog = React.useCallback((kind: "integrate" | "reverse", ids: Array<string | number>) => {
    const normalized = Array.from(new Set(ids.map((id) => String(id)).filter(Boolean)))
    if (normalized.length === 0) return
    setFinanceActionKind(kind)
    setFinanceActionTargetIds(normalized)
    setFinanceActionDialogOpen(true)
  }, [])

  const handleFinanceActionApply = React.useCallback(async () => {
    if (financeActionTargetIds.length === 0) return

    setFinanceActionSaving(true)
    try {
      const isBulk = financeActionTargetIds.length > 1
      const response =
        financeActionKind === "integrate"
          ? isBulk
            ? await integratePedidoCompraBulkRequest(financeActionTargetIds)
            : await integratePedidoCompraRequest(financeActionTargetIds[0])
          : isBulk
            ? await reversePedidoCompraIntegrationBulkRequest(financeActionTargetIds)
            : await reversePedidoCompraIntegrationRequest(financeActionTargetIds[0])

      if (isBulk) {
        const processed = Array.isArray(response?.processed) ? response.processed.length : 0
        const failed = Array.isArray(response?.failed) ? response.failed : []
        if (processed > 0) {
          toast.success(
            financeActionKind === "integrate"
              ? `${processed} pedido(s) integrado(s) ao financeiro.`
              : `${processed} integração(ões) financeira(s) estornada(s).`
          )
        }
        if (failed.length > 0) {
          toast.error(failed.map((item: { pedidoId: number; message: string }) => `#${item.pedidoId}: ${item.message}`).slice(0, 3).join(" | "))
        }
      } else {
        toast.success(response?.message ?? (financeActionKind === "integrate" ? "Pedido integrado ao financeiro." : "Integração financeira estornada."))
      }

      setFinanceActionDialogOpen(false)
      setFinanceActionTargetIds([])
      setSelectedIds([])
      await handleRecarregar()
    } catch (error) {
      toast.error(getErrorMessage(error, financeActionKind === "integrate" ? "Falha ao integrar pedido ao financeiro" : "Falha ao estornar integração financeira"))
    } finally {
      setFinanceActionSaving(false)
    }
  }, [financeActionKind, financeActionTargetIds, handleRecarregar])

  const handleBulkStatusApply = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkStatusSaving(true)
    try {
      await updatePedidoCompraStatusBulkRequest(selectedIds, bulkStatusDraft)
      toast.success("Status dos pedidos atualizado")
      setBulkStatusDialogOpen(false)
      setSelectedIds([])
      await handleRecarregar()
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao atualizar os pedidos"))
    } finally {
      setBulkStatusSaving(false)
    }
  }, [bulkStatusDraft, handleRecarregar, selectedIds])

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleteSaving(true)
    try {
      await deletePedidoCompraBulkRequest(selectedIds)
      toast.success("Pedidos excluídos")
      setBulkDeleteDialogOpen(false)
      setSelectedIds([])
      await handleRecarregar()
    } catch (error) {
      toast.error(getErrorMessage(error, "Falha ao excluir os pedidos"))
    } finally {
      setBulkDeleteSaving(false)
    }
  }, [handleRecarregar, selectedIds])

  const handleBulkExport = React.useCallback(() => {
    if (selectedIds.length === 0) return
    const query = new URLSearchParams({ ids: selectedIds.join(",") })
    window.open(`/pedido_compra/exportar?${query.toString()}`, "_blank", "noopener,noreferrer")
  }, [selectedIds])

  const selectObraFilter = React.useCallback((obra: ObraSearchItem) => {
    setObraSelected(obra)
    setSelectedProjectId(obra.id)
    setObraOpen(false)
    setShowAdvancedFilters(true)
  }, [])

  const updateKanbanScrollButtons = React.useCallback(() => {
    const element = kanbanScrollRef.current
    if (!element) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    setCanScrollLeft(element.scrollLeft > 2)
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2)
  }, [])

  React.useEffect(() => {
    updateKanbanScrollButtons()
  }, [getDisplayGroups, showEmptyColumns, sortedOrders.length, updateKanbanScrollButtons, viewMode])

  React.useEffect(() => {
    const element = kanbanScrollRef.current
    if (!element) return
    const onScroll = () => updateKanbanScrollButtons()
    const onResize = () => updateKanbanScrollButtons()
    element.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)
    return () => {
      element.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [updateKanbanScrollButtons])

  const scrollKanbanBy = (direction: "left" | "right") => {
    kanbanScrollRef.current?.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" })
  }

  const onKanbanPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (kanbanGroupBy === "status" && target?.closest?.('[draggable="true"]')) return
    if (target?.closest?.('button, a, [role="menuitem"], [role="menu"], [data-radix-collection-item], [data-radix-popper-content-wrapper]')) return
    const element = kanbanScrollRef.current
    if (!element) return
    didPanRef.current = false
    panStateRef.current = { active: true, startX: event.clientX, startLeft: element.scrollLeft }
    setIsPanning(true)
    element.setPointerCapture(event.pointerId)
  }

  const onKanbanPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = kanbanScrollRef.current
    if (!element || !panStateRef.current.active) return
    const deltaX = event.clientX - panStateRef.current.startX
    if (Math.abs(deltaX) > 6) didPanRef.current = true
    element.scrollLeft = panStateRef.current.startLeft - deltaX
    event.preventDefault()
  }

  const endPan = (pointerId?: number) => {
    const element = kanbanScrollRef.current
    if (element && pointerId != null) {
      try {
        element.releasePointerCapture(pointerId)
      } catch {}
    }
    panStateRef.current.active = false
    setIsPanning(false)
  }

  React.useEffect(() => {
    saveUIState({
      viewMode,
      kanbanGroupBy,
      showEmptyColumns,
      onlyActiveObras,
      searchTerm,
      selectedStatus,
      selectedCategory,
      selectedSupplierId,
      selectedProjectId,
      sortBy,
      sortOrder,
    })
  }, [kanbanGroupBy, onlyActiveObras, searchTerm, selectedCategory, selectedProjectId, selectedStatus, selectedSupplierId, showEmptyColumns, sortBy, sortOrder, viewMode])

  const hasVisibleOrders = viewMode === "list" ? paginatedOrders.length > 0 : sortedOrders.length > 0

  return (
    <PageLayout title="Pedidos de Compra" links={[{ label: "Home", href: "/" }]} pageBackground="bg-[#f7f6f2]">
      <div className="min-h-screen bg-transparent px-2 pb-4 pt-2 md:px-4 md:pb-6 md:pt-3">
        <div className="mx-auto max-w-7xl space-y-4">
          <PedidoCompraListHeader
            resultCount={sortedOrders.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreatePedido={() => router.push("/pedido_compra/cadastrar")}
          />

          <PedidoCompraListFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSupplierId={selectedSupplierId}
            onSupplierChange={setSelectedSupplierId}
            fornecedores={fornecedores}
            selectedProjectId={selectedProjectId}
            obraSelected={obraSelected}
            obraOpen={obraOpen}
            onObraOpenChange={setObraOpen}
            obraQuery={obraQuery}
            onObraQueryChange={setObraQuery}
            obraLoading={obraLoading}
            obraOptions={obraOptions}
            onSelectObra={selectObraFilter}
            onClearObra={() => {
              setSelectedProjectId(null)
              setObraSelected(null)
              setObraOpen(false)
            }}
            onlyActiveObras={onlyActiveObras}
            onOnlyActiveObrasChange={setOnlyActiveObras}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            showAdvancedFilters={showAdvancedFilters}
            onShowAdvancedFiltersChange={setShowAdvancedFilters}
            categories={categories}
          />

          {viewMode === "list" ? (
            <PedidoCompraStatusTabs value={selectedStatus} onValueChange={setSelectedStatus} counts={statusCounts} />
          ) : (
            <div className={`${listToolbarClass} flex flex-wrap items-center gap-3`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#2c201b]">Agrupar por</span>
                <Select value={kanbanGroupBy} onValueChange={(value) => setKanbanGroupBy(value as "category" | "status")}>
                  <SelectTrigger className="h-9 w-40 rounded-lg border-[#d9d3c8] bg-white text-[#2c201b]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#2c201b]">Colunas vazias</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmptyColumns(!showEmptyColumns)}
                  className="h-9 rounded-lg border-[#ddd7cc] bg-white px-3 text-[#2c201b]"
                >
                  {showEmptyColumns ? "Exibir" : "Ocultar"}
                </Button>
              </div>
            </div>
          )}

          {viewMode === "list" ? (
            selectedCount > 0 ? (
              <PedidoCompraSelectionToolbar
                selectedCount={selectedCount}
                visibleSelectionState={visibleSelectionState}
                onToggleVisibleSelection={toggleVisibleSelection}
                onClearSelection={() => setSelectedIds([])}
                onOpenBulkStatus={() => setBulkStatusDialogOpen(true)}
                onOpenBulkIntegrate={() => openFinanceActionDialog("integrate", selectedIds)}
                onOpenBulkReverse={() => openFinanceActionDialog("reverse", selectedIds)}
                onExport={handleBulkExport}
                onOpenBulkDelete={() => setBulkDeleteDialogOpen(true)}
              />
            ) : (
              <PedidoCompraListToolbar
                resultCount={sortedOrders.length}
                activeFilterChips={activeFilterChips}
                onRemoveFilterChip={removeFilterChip}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onToggleSortOrder={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              />
            )
          ) : null}

          {hasVisibleOrders ? (
            viewMode === "list" ? (
              <PedidoCompraListTable
                orders={paginatedOrders}
                selectedIds={selectedIds}
                visibleSelectionState={visibleSelectionState}
                onToggleVisibleSelection={toggleVisibleSelection}
                onToggleOrderSelection={toggleOrderSelection}
                onOrderClick={handleOrderClick}
                onViewOrder={(order) => router.push(`/pedido_compra/ver/${order.id}`)}
                onOpenFinanceAction={openFinanceActionDialog}
                onDeleteOrder={handleExcluir}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  {canScrollLeft ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => scrollKanbanBy("left")}
                      className="absolute left-2 top-[calc(50%-18px)] z-10 h-9 w-9 rounded-lg p-0 shadow-sm"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  ) : null}

                  {canScrollRight ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => scrollKanbanBy("right")}
                      className="absolute right-2 top-[calc(50%-18px)] z-10 h-9 w-9 rounded-lg p-0 shadow-sm"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  ) : null}

                  <div
                    ref={kanbanScrollRef}
                    className={`flex select-none gap-4 overflow-x-auto px-10 pb-3 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                    onPointerDown={onKanbanPointerDown}
                    onPointerMove={onKanbanPointerMove}
                    onPointerUp={(event) => endPan(event.pointerId)}
                    onPointerCancel={(event) => endPan(event.pointerId)}
                    onPointerLeave={() => {
                      if (panStateRef.current.active) endPan()
                    }}
                  >
                    {getDisplayGroups().map((group) => (
                      <div
                        key={group.key}
                        className="w-80 flex-shrink-0 rounded-2xl border border-[#e8e1d6] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = "move"
                        }}
                        onDrop={(event) => void handleDrop(event, group.key)}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#2c201b]">{group.label}</h3>
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                            {group.orders.length}
                          </Badge>
                        </div>

                        <div className="max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pr-1">
                          {group.orders.map((order) => {
                            return (
                              <div
                                key={order.id}
                                draggable={kanbanGroupBy === "status"}
                                onDragStart={(event) => {
                                  setDraggedItem(order)
                                  event.dataTransfer.effectAllowed = "move"
                                }}
                                className={`space-y-3 rounded-[20px] border border-[#eadfca] bg-white p-4 transition-shadow hover:shadow-md ${
                                  kanbanGroupBy === "status" ? "cursor-move" : "cursor-pointer"
                                }`}
                                onClick={() => {
                                  if (didPanRef.current) {
                                    didPanRef.current = false
                                    return
                                  }
                                  handleOrderClick(order)
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs font-semibold text-[#2c201b]">#{order.number}</div>
                                    <div className="truncate text-xs text-[#7b705f]">{order.supplier}</div>
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 rounded-full p-0">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/pedido_compra/ver/${order.id}`} target="_blank" rel="noopener noreferrer">
                                          Visualizar pedido
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/obras/${order.obraId}`} target="_blank" rel="noopener noreferrer">
                                          Visualizar obra
                                        </Link>
                                      </DropdownMenuItem>
                                      {!order.integrated ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/pedido_compra/edit/${order.id}`}>Editar pedido</Link>
                                        </DropdownMenuItem>
                                      ) : null}
                                      {canIntegratePedido(order.financeiroIntegracaoStatus) ? (
                                        <DropdownMenuItem onClick={() => openFinanceActionDialog("integrate", [order.id])}>
                                          Integrar financeiro
                                        </DropdownMenuItem>
                                      ) : null}
                                      {canReversePedidoIntegration(order.financeiroIntegracaoStatus) ? (
                                        <DropdownMenuItem onClick={() => openFinanceActionDialog("reverse", [order.id])}>
                                          Estornar integração financeira
                                        </DropdownMenuItem>
                                      ) : null}
                                      {!order.integrated ? (
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleExcluir(order)}>
                                          Excluir pedido
                                        </DropdownMenuItem>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {(order.obraTitulo || order.obraCidade) ? (
                                  <div className="flex items-center gap-3 text-xs text-[#7b705f]">
                                    {order.obraTitulo ? (
                                      <Link
                                        href={`/obras/${order.obraId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 truncate hover:text-[#2c201b] hover:underline"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <Building2 className="h-3 w-3 flex-shrink-0" />
                                        {order.obraTitulo}
                                      </Link>
                                    ) : null}
                                    {order.obraCidade ? (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        {order.obraCidade}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}

                                <p className="line-clamp-2 text-sm text-[#2c201b]">{order.description}</p>

                                <div className="flex flex-wrap items-center gap-2">
                                  {kanbanGroupBy === "status" ? (
                                    <Badge variant="outline" className={`text-xs ${getCategoryColor(order.category)}`}>
                                      {order.category}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className={`text-xs ${statusConfig[order.status as StatusSlug]?.badgeClass}`}>
                                      {statusConfig[order.status as StatusSlug]?.label}
                                    </Badge>
                                  )}
                                </div>

                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-[#7b705f]">Valor do pedido:</span>
                                    <span className="font-medium text-[#2c201b]">{formatMoney(order.expectedValue)}</span>
                                  </div>
                                </div>

                                {order.deliveryDate ? (
                                  <div className="flex items-center gap-2 text-xs text-[#7b705f]">
                                    <Calendar className="h-3 w-3" />
                                    {formatSafeDate(order.deliveryDate)}
                                  </div>
                                ) : null}

                                <Badge variant="outline" className={`w-full justify-center rounded-full text-xs ${getPedidoFinanceBadgeClass(order.financeiroIntegracaoStatus)}`}>
                                  {getPedidoFinanceLabel(order.financeiroIntegracaoStatus)}
                                </Badge>
                              </div>
                            )
                          })}

                          {group.orders.length === 0 ? <div className="py-8 text-center text-sm text-[#7b705f]">Nenhum pedido</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className={`${listShellClass} px-6 py-12 text-center text-[#7b705f]`}>
              <p>Nenhum pedido encontrado</p>
            </div>
          )}

          {viewMode === "list" && totalPages > 1 ? (
            <PedidoCompraListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedOrders.length}
              startIndex={startIndex + 1}
              endIndex={Math.min(startIndex + itemsPerPage, sortedOrders.length)}
              onPageChange={setCurrentPage}
            />
          ) : null}

          <PedidoCompraSummaryModal
            open={Boolean(selectedOrderId)}
            pedidoId={selectedOrderId ? Number(selectedOrderId) : null}
            obraId={selectedOrder?.obraId ?? selectedOrderInitialData?.obraId ?? null}
            initialData={selectedOrder ? mapOrderToSummaryInitialData(selectedOrder) : selectedOrderInitialData}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedOrderId(null)
                setSelectedOrderInitialData(null)
              }
            }}
            onEdit={(pedidoId) => router.push(`/pedido_compra/edit/${pedidoId}`)}
            onMutationComplete={handleRecarregar}
          />

          <Dialog
            open={financeActionDialogOpen}
            onOpenChange={(open) => {
              setFinanceActionDialogOpen(open)
              if (!open && !financeActionSaving) setFinanceActionTargetIds([])
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{financeActionKind === "integrate" ? "Integrar financeiro" : "Estornar integração financeira"}</DialogTitle>
                <DialogDescription>
                  {financeActionKind === "integrate"
                    ? `A ação vai criar a conta a pagar vinculada para ${financeActionTargetIds.length} pedido(s).`
                    : `A ação vai cancelar ou estornar a obrigação financeira de ${financeActionTargetIds.length} pedido(s), conforme o histórico de pagamento.`}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                {financeActionKind === "integrate"
                  ? "Pedidos integrados ficam bloqueados para edição até o estorno da integração."
                  : "Sem pagamento: cancelamento operacional. Com pagamento: reversão financeira por lançamentos reversos."}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setFinanceActionDialogOpen(false)} disabled={financeActionSaving}>
                  Cancelar
                </Button>
                <Button onClick={() => void handleFinanceActionApply()} disabled={financeActionSaving || financeActionTargetIds.length === 0}>
                  {financeActionSaving
                    ? financeActionKind === "integrate"
                      ? "Integrando..."
                      : "Estornando..."
                    : financeActionKind === "integrate"
                      ? "Confirmar integração"
                      : "Confirmar estorno"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Alterar status</DialogTitle>
                <DialogDescription>{selectedCount} pedido(s) serão atualizados.</DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="bulk-status-select">Novo status</Label>
                <Select value={bulkStatusDraft} onValueChange={(value) => setBulkStatusDraft(value as PedidoStatus)}>
                  <SelectTrigger id="bulk-status-select">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {editableStatusList.map((status) => (
                      <SelectItem key={status} value={normalizeStatusUtil(status)}>
                        {statusConfig[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkStatusSaving}>
                  Cancelar
                </Button>
                <Button onClick={() => void handleBulkStatusApply()} disabled={bulkStatusSaving || selectedCount === 0}>
                  {bulkStatusSaving ? "Aplicando..." : "Aplicar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir pedidos</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação vai excluir {selectedCount} pedido(s) de compra e não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkDeleteSaving}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault()
                    void handleBulkDelete()
                  }}
                  disabled={bulkDeleteSaving || selectedCount === 0}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {bulkDeleteSaving ? "Excluindo..." : "Confirmar exclusão"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PageLayout>
  )
}
