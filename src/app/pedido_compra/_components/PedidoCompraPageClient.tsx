"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  X,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  MoreVertical,
  Calendar,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Shared utilities (centralized - no more duplication)
import { statusConfig, statusList, type StatusSlug } from "@/lib/pedido-compra-theme"
import {
  formatMoney,
  asNumber,
  toSlugStatus,
  fromSlugStatus,
  toCategoryLabel,
  normalizeStatus as normalizeStatusUtil,
  formatPedidoId
} from "@/lib/pedido-compra-utils"
import type {
  PedidoCategoria,
  PedidoStatus,
  PurchaseOrderStatusSlug,
  PurchaseOrderCategoryLabel,
  FornecedorOption,
  ObraSearchItem,
  PedidoCompraListItem,
  ListarResult,
  PurchaseOrder,
} from "@/types/pedido-compra"

// Types are now imported from @/types/pedido-compra

type Props = {
  initialList: ListarResult
  initialFornecedores: FornecedorOption[]
  initialObrasById: Record<number, ObraSearchItem>
}

/* ─────────────────────────────────────────────
   Persistência de UI (localStorage)
───────────────────────────────────────────── */
type PedidoCompraUIState = {
  viewMode: "list" | "kanban"
  kanbanGroupBy: "category" | "status"
  showEmptyColumns: boolean
  onlyActiveObras: boolean

  searchTerm: string
  selectedStatus: PurchaseOrderStatusSlug
  selectedCategory: PurchaseOrderCategoryLabel | "todas" // Added
  selectedSupplierId: number | "all"
  selectedProjectId: number | null

  sortBy: "date" | "value" | "delivery" | "status"
  sortOrder: "asc" | "desc"
}

const STORAGE_KEY = "pedido_compra_ui_state_v1"

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

// asNumber removed - using shared utility

// Type converters removed - using shared utilities

function formatProjectLabel(obraId: number, obrasById: Record<number, ObraSearchItem>) {
  const o = obrasById?.[obraId]
  const t = (o?.titulo ?? "").trim()
  if (t) return `Obra #${obraId} — ${t}`
  return `Obra #${obraId}`
}

// fmtMoney replaced by formatMoney from utils

// statusConfig removed - using shared theme

const categories: PurchaseOrderCategoryLabel[] = ["Madeira", "Telha", "Andaime", "Materiais"]
// statuses replaced by statusList from theme
const statuses = statusList

function mapApiToOrders(list: ListarResult, obrasById: Record<number, ObraSearchItem>): PurchaseOrder[] {
  const items = list?.items ?? []
  return items.map((x) => {
    const obraId = Number(x.obra_id)
    const fornecedorId = x.fornecedor?.id != null ? Number(x.fornecedor.id) : null
    const supplierName = (x.fornecedor?.nome ?? "").trim() || "—"
    const expected = asNumber(x.valor_orcado)
    const actual = x.valor_realizado == null ? undefined : asNumber(x.valor_realizado)
    const createdAt = x.created_at ? String(x.created_at) : new Date().toISOString()

    // Using shared utilities for conversion
    return {
      id: String(x.id),
      number: formatPedidoId(x.id, x.obra_id),
      description: (x.descricao ?? "").trim() || "—",
      category: toCategoryLabel(x.categoria),
      supplier: supplierName,
      supplierId: fornecedorId,
      project: formatProjectLabel(obraId, obrasById),
      obraId,
      obraStatus: (x as any).obra_status ?? null,
      obraTitulo: (x as any).obra_titulo ?? null,
      obraCidade: (x as any).obra_cidade ?? null,
      expectedValue: expected,
      actualValue: actual,
      deliveryDate: x.data_entrega ? String(x.data_entrega).slice(0, 10) : null,
      status: toSlugStatus(x.status),
      integrated: false,
      viewed: true,
      createdAt,
    }
  })
}

async function fetchList(params: { q?: string; status?: PurchaseOrderStatusSlug; obraId?: number | null }) {
  const sp = new URLSearchParams()
  sp.set("page", "1")
  sp.set("pageSize", "100")
  if (params.q) sp.set("q", params.q)
  if (params.status && params.status !== "todos") sp.set("status", params.status)
  if (params.obraId && params.obraId > 0) sp.set("obraId", String(params.obraId))

  const res = await fetch(`/api/pedido_compra/listar?${sp.toString()}`, { cache: "no-store" })
  const body = await res.json().catch(() => null)

  console.log("[PedidoCompra/Client] listar response JSON:\n", JSON.stringify(body, null, 2))

  if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao listar pedidos")
  const data = body?.data
  return (data ?? { items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }) as ListarResult
}

async function patchStatus(pedidoId: string, next: PedidoStatus) {
  const res = await fetch(`/api/pedido_compra/status/${pedidoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: next }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao atualizar status")
  return body?.data
}

async function deletePedido(pedidoId: string) {
  const res = await fetch(`/api/pedido_compra/excluir/${pedidoId}`, { method: "DELETE" })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao excluir pedido")
  return body?.data
}

export default function PedidoCompraPageClient({ initialList, initialFornecedores, initialObrasById }: Props) {
  const router = useRouter()

  const persisted = React.useMemo(() => loadUIState(), [])

  const [searchTerm, setSearchTerm] = React.useState(persisted?.searchTerm ?? "")
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(persisted?.selectedProjectId ?? null)
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<number | "all">(
    persisted?.selectedSupplierId ?? "all"
  )
  const [selectedStatus, setSelectedStatus] = React.useState<PurchaseOrderStatusSlug>(persisted?.selectedStatus ?? "todos")
  const [selectedCategory, setSelectedCategory] = React.useState<PurchaseOrderCategoryLabel | "todas">( // Added
    persisted?.selectedCategory ?? "todas"
  )

  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(15)

  const [viewMode, setViewMode] = React.useState<"list" | "kanban">(persisted?.viewMode ?? "list")
  const [kanbanGroupBy, setKanbanGroupBy] = React.useState<"category" | "status">(persisted?.kanbanGroupBy ?? "status")
  const [showEmptyColumns, setShowEmptyColumns] = React.useState(persisted?.showEmptyColumns ?? true)
  const [onlyActiveObras, setOnlyActiveObras] = React.useState(persisted?.onlyActiveObras ?? true)

  const [sortBy, setSortBy] = React.useState<"date" | "value" | "delivery" | "status">(persisted?.sortBy ?? "date")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(persisted?.sortOrder ?? "desc")

  const [fornecedores, setFornecedores] = React.useState<FornecedorOption[]>(initialFornecedores ?? [])
  const [obrasById, setObrasById] = React.useState<Record<number, ObraSearchItem>>(initialObrasById ?? {})

  const [orders, setOrders] = React.useState<PurchaseOrder[]>(() => mapApiToOrders(initialList, initialObrasById))
  const [draggedItem, setDraggedItem] = React.useState<PurchaseOrder | null>(null)

  const [obraOpen, setObraOpen] = React.useState(false)
  const [obraQuery, setObraQuery] = React.useState("")
  const [obraLoading, setObraLoading] = React.useState(false)
  const [obraOptions, setObraOptions] = React.useState<ObraSearchItem[]>([])
  const [obraSelected, setObraSelected] = React.useState<ObraSearchItem | null>(null)

  const kanbanScrollRef = React.useRef<HTMLDivElement | null>(null)
  const panStateRef = React.useRef<{ active: boolean; startX: number; startLeft: number }>({
    active: false,
    startX: 0,
    startLeft: 0,
  })
  const didPanRef = React.useRef(false)
  const [isPanning, setIsPanning] = React.useState(false)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  React.useEffect(() => {
    console.log("[PedidoCompra/Client] initialList JSON:\n", JSON.stringify(initialList, null, 2))
    console.log("[PedidoCompra/Client] initialFornecedores JSON:\n", JSON.stringify(initialFornecedores, null, 2))
    console.log("[PedidoCompra/Client] initialObrasById JSON:\n", JSON.stringify(initialObrasById, null, 2))
  }, [initialList, initialFornecedores, initialObrasById])

  React.useEffect(() => {
    const loadFornecedores = async () => {
      try {
        const res = await fetch(`/api/fornecedores`, { cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao listar fornecedores")
        const arr: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
        const mapped = arr
          .map((f) => ({ id: Number(f?.id), nome: String(f?.nome ?? "") }))
          .filter((x) => Number.isFinite(x.id) && x.id > 0)
        setFornecedores(mapped)
      } catch { }
    }
    if ((initialFornecedores ?? []).length === 0) loadFornecedores()
  }, [initialFornecedores])

  React.useEffect(() => {
    if (!obraOpen) return
    const q = obraQuery.trim()
    if (!q) {
      setObraOptions([])
      return
    }

    let canceled = false
    const t = setTimeout(async () => {
      setObraLoading(true)
      try {
        const res = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(q)}`, { cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao pesquisar obras")
        const arr: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []
        const mapped: ObraSearchItem[] = arr
          .map((x) => ({
            id: Number(x?.id),
            titulo: x?.titulo == null ? null : String(x.titulo),
            nomeReceptor: x?.nomeReceptor == null ? null : String(x.nomeReceptor),
            telefoneReceptor: x?.telefoneReceptor == null ? null : String(x.telefoneReceptor),
            enderecoEntrega: x?.enderecoEntrega == null ? null : String(x.enderecoEntrega),
            linkMaps: x?.linkMaps == null ? null : String(x.linkMaps),
          }))
          .filter((x) => Number.isFinite(x.id) && x.id > 0)

        if (!canceled) setObraOptions(mapped)
      } catch {
        if (!canceled) setObraOptions([])
      } finally {
        if (!canceled) setObraLoading(false)
      }
    }, 400)

    return () => {
      canceled = true
      clearTimeout(t)
    }
  }, [obraOpen, obraQuery])

  React.useEffect(() => {
    if (!selectedProjectId) {
      setObraSelected(null)
      return
    }

    const cached = obrasById?.[selectedProjectId]
    if (cached) {
      setObraSelected({
        id: cached.id,
        titulo: cached.titulo,
        nomeReceptor: cached.nomeReceptor,
        telefoneReceptor: cached.telefoneReceptor,
        enderecoEntrega: cached.enderecoEntrega,
        linkMaps: cached.linkMaps,
      })
      return
    }

    let canceled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(String(selectedProjectId))}`, {
          cache: "no-store",
        })
        const body = await res.json().catch(() => null)
        const arr: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []
        const first = arr?.[0]
        if (!first) return

        const mapped: ObraSearchItem = {
          id: Number(first?.id),
          titulo: first?.titulo == null ? null : String(first.titulo),
          nomeReceptor: first?.nomeReceptor == null ? null : String(first.nomeReceptor),
          telefoneReceptor: first?.telefoneReceptor == null ? null : String(first.telefoneReceptor),
          enderecoEntrega: first?.enderecoEntrega == null ? null : String(first.enderecoEntrega),
          linkMaps: first?.linkMaps == null ? null : String(first.linkMaps),
        }

        if (canceled) return
        if (!Number.isFinite(mapped.id) || mapped.id <= 0) return

        setObrasById((prev) => ({ ...prev, [mapped.id]: mapped }))
        setObraSelected(mapped)
      } catch { }
    }, 0)

    return () => {
      canceled = true
      clearTimeout(t)
    }
  }, [selectedProjectId, obrasById])

  const statusCounts = React.useMemo(() => {
    return {
      todos: orders.length,
      rascunho: orders.filter((o) => o.status === "rascunho").length,
      aprovado: orders.filter((o) => o.status === "aprovado").length,
      "em-compra": orders.filter((o) => o.status === "em-compra").length,
      "aguardando-pagamento": orders.filter((o) => o.status === "aguardando-pagamento").length,
      "aguardando-entrega": orders.filter((o) => o.status === "aguardando-entrega").length,
      entregue: orders.filter((o) => o.status === "entregue").length,
    }
  }, [orders])

  const hasActiveFilters =
    selectedProjectId != null ||
    selectedSupplierId !== "all" ||
    searchTerm !== "" ||
    selectedStatus !== "todos" ||
    selectedCategory !== "todas" // Added

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedProjectId(null)
    setSelectedSupplierId("all")
    setSelectedStatus("todos")
    setSelectedCategory("todas") // Added
    setObraSelected(null)
    setObraQuery("")
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
  }

  const filteredOrders = React.useMemo(() => {
    const st = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      if (onlyActiveObras && order.obraStatus === "Finalizado") return false

      const matchesSearch =
        !st ||
        order.number.toLowerCase().includes(st) ||
        order.supplier.toLowerCase().includes(st) ||
        order.description.toLowerCase().includes(st)

      const matchesProject = selectedProjectId == null || order.obraId === selectedProjectId
      const matchesSupplier = selectedSupplierId === "all" || order.supplierId === selectedSupplierId
      const matchesStatus = selectedStatus === "todos" || order.status === selectedStatus
      const matchesCategory = selectedCategory === "todas" || order.category === selectedCategory // Added

      return matchesSearch && matchesProject && matchesSupplier && matchesStatus && matchesCategory
    })
  }, [orders, searchTerm, selectedProjectId, selectedSupplierId, selectedStatus, selectedCategory, onlyActiveObras])

  const sortedOrders = React.useMemo(() => {
    const arr = [...filteredOrders]
    arr.sort((a, b) => {
      let comparison = 0

      if (sortBy === "date") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortBy === "value") {
        comparison = a.expectedValue - b.expectedValue
      } else if (sortBy === "delivery") {
        const ad = new Date(a.deliveryDate || "9999-12-31").getTime()
        const bd = new Date(b.deliveryDate || "9999-12-31").getTime()
        comparison = ad - bd
      } else {
        const statusOrder: PurchaseOrderStatusSlug[] = [
          "todos",
          "rascunho",
          "aprovado",
          "em-compra",
          "aguardando-pagamento",
          "aguardando-entrega",
          "entregue",
        ]
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      }

      return sortOrder === "asc" ? comparison : -comparison
    })
    return arr
  }, [filteredOrders, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedProjectId, selectedSupplierId, selectedStatus, itemsPerPage])

  const ordersByCategory = React.useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category] = sortedOrders.filter((o) => o.category === category)
      return acc
    }, {} as Record<PurchaseOrderCategoryLabel, PurchaseOrder[]>)
  }, [sortedOrders])

  const ordersByStatus = React.useMemo(() => {
    return statuses.reduce((acc, status) => {
      acc[status] = sortedOrders.filter((o) => o.status === status)
      return acc
    }, {} as Record<Exclude<PurchaseOrderStatusSlug, "todos">, PurchaseOrder[]>)
  }, [sortedOrders])

  const getDisplayGroups = React.useCallback(() => {
    if (kanbanGroupBy === "category") {
      if (showEmptyColumns) return categories.map((cat) => ({ key: cat, label: cat, orders: ordersByCategory[cat] }))
      return categories
        .filter((cat) => ordersByCategory[cat].length > 0)
        .map((cat) => ({ key: cat, label: cat, orders: ordersByCategory[cat] }))
    }

    if (showEmptyColumns) {
      return statuses.map((st) => ({
        key: st,
        label: statusConfig[st].label,
        orders: ordersByStatus[st],
      }))
    }
    return statuses
      .filter((st) => ordersByStatus[st].length > 0)
      .map((st) => ({
        key: st,
        label: statusConfig[st].label,
        orders: ordersByStatus[st],
      }))
  }, [kanbanGroupBy, showEmptyColumns, ordersByCategory, ordersByStatus])

  const handleDragStart = (e: React.DragEvent, order: PurchaseOrder) => {
    setDraggedItem(order)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleRecarregar = React.useCallback(async () => {
    try {
      const list = await fetchList({
        q: searchTerm.trim() || undefined,
        status: selectedStatus === "todos" ? undefined : selectedStatus,
        obraId: selectedProjectId,
      })

      const obraIds = Array.from(
        new Set((list.items ?? []).map((x) => Number(x?.obra_id)).filter((n) => Number.isFinite(n) && n > 0))
      )

      const nextObrasById = { ...obrasById }

      await Promise.all(
        obraIds.map(async (id) => {
          if (nextObrasById[id]) return
          const r = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(String(id))}`, { cache: "no-store" })
          const b = await r.json().catch(() => null)
          const arr: any[] = Array.isArray(b?.data) ? b.data : Array.isArray(b) ? b : []
          const first = arr?.[0]
          if (!first) return
          nextObrasById[id] = {
            id: Number(first?.id),
            titulo: first?.titulo == null ? null : String(first.titulo),
            nomeReceptor: first?.nomeReceptor == null ? null : String(first.nomeReceptor),
            telefoneReceptor: first?.telefoneReceptor == null ? null : String(first.telefoneReceptor),
            enderecoEntrega: first?.enderecoEntrega == null ? null : String(first.enderecoEntrega),
            linkMaps: first?.linkMaps == null ? null : String(first.linkMaps),
          }
        })
      )

      setObrasById(nextObrasById)
      setOrders(mapApiToOrders(list, nextObrasById))
    } catch (err: any) {
      toast.error(err?.message || "Falha ao carregar pedidos")
    }
  }, [searchTerm, selectedStatus, selectedProjectId, obrasById])

  const didInitialLoad = React.useRef(false)
  React.useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true

    const hasSSR = (initialList?.items ?? []).length > 0
    if (!hasSSR) handleRecarregar()
  }, [handleRecarregar, initialList])

  const handleDrop = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault()
    if (!draggedItem) return

    if (kanbanGroupBy !== "status") {
      setDraggedItem(null)
      return
    }

    const nextSlug = targetGroup as Exclude<PurchaseOrderStatusSlug, "todos">
    const prevSlug = draggedItem.status
    if (prevSlug === nextSlug) {
      setDraggedItem(null)
      return
    }

    const prevOrders = orders
    const optimistic = prevOrders.map((o) => (o.id === draggedItem.id ? { ...o, status: nextSlug } : o))
    setOrders(optimistic)
    setDraggedItem(null)

    try {
      await patchStatus(draggedItem.id, fromSlugStatus(nextSlug))
      toast.success("Status atualizado")
    } catch (err: any) {
      setOrders(prevOrders)
      toast.error(err?.message || "Falha ao atualizar status")
    }
  }

  const handleOrderClick = (order: PurchaseOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, viewed: true } : o)))
    router.push(`/pedido_compra/ver/${order.id}`)
  }

  const handleExcluir = async (order: PurchaseOrder) => {
    const ok = window.confirm(`Excluir o pedido ${order.number}? Esta acao nao pode ser desfeita.`)
    if (!ok) return
    const prevOrders = orders
    setOrders((p) => p.filter((o) => o.id !== order.id))
    try {
      await deletePedido(order.id)
      toast.success("Pedido excluido")
    } catch (err: any) {
      setOrders(prevOrders)
      toast.error(err?.message || "Falha ao excluir pedido")
    }
  }

  const selectObraFilter = (o: ObraSearchItem) => {
    setObraSelected(o)
    setSelectedProjectId(o.id)
    setObraOpen(false)
  }

  const updateKanbanScrollButtons = React.useCallback(() => {
    const el = kanbanScrollRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setCanScrollLeft(left)
    setCanScrollRight(right)
  }, [])

  React.useEffect(() => {
    updateKanbanScrollButtons()
  }, [updateKanbanScrollButtons, viewMode, kanbanGroupBy, showEmptyColumns, sortedOrders.length])

  React.useEffect(() => {
    const el = kanbanScrollRef.current
    if (!el) return

    const onScroll = () => updateKanbanScrollButtons()
    el.addEventListener("scroll", onScroll, { passive: true })

    const onResize = () => updateKanbanScrollButtons()
    window.addEventListener("resize", onResize)

    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [updateKanbanScrollButtons])

  const scrollKanbanBy = (dir: "left" | "right") => {
    const el = kanbanScrollRef.current
    if (!el) return
    const amount = dir === "left" ? -360 : 360
    el.scrollBy({ left: amount, behavior: "smooth" })
  }

  const onKanbanPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return

    const target = e.target as HTMLElement | null
    const onDraggable = target?.closest?.('[draggable="true"]')
    if (kanbanGroupBy === "status" && onDraggable) return

    // Skip pointer capture for interactive elements (buttons, links, dropdowns)
    const onInteractive = target?.closest?.(
      'button, a, [role="menuitem"], [role="menu"], [data-radix-collection-item], [data-radix-popper-content-wrapper]'
    )
    if (onInteractive) return

    const el = kanbanScrollRef.current
    if (!el) return

    didPanRef.current = false
    panStateRef.current = {
      active: true,
      startX: e.clientX,
      startLeft: el.scrollLeft,
    }
    setIsPanning(true)
    el.setPointerCapture(e.pointerId)
  }

  const onKanbanPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = kanbanScrollRef.current
    if (!el) return
    if (!panStateRef.current.active) return

    const dx = e.clientX - panStateRef.current.startX
    if (Math.abs(dx) > 6) didPanRef.current = true

    el.scrollLeft = panStateRef.current.startLeft - dx
    e.preventDefault()
  }

  const endPan = (pointerId?: number) => {
    const el = kanbanScrollRef.current
    if (el && pointerId != null) {
      try {
        el.releasePointerCapture(pointerId)
      } catch { }
    }
    panStateRef.current.active = false
    setIsPanning(false)
  }

  const onKanbanPointerUp = (e: React.PointerEvent<HTMLDivElement>) => endPan(e.pointerId)
  const onKanbanPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => endPan(e.pointerId)
  const onKanbanPointerLeave = () => {
    if (panStateRef.current.active) endPan()
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
  }, [
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
  ])

  return (
    <PageLayout
      title="Pedidos de Compra"
      links={[
        { label: "Home", href: "/" },
      ]}
      pageBackground="bg-white"
      headerActions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "success" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <LayoutList className="w-4 h-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "success" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Kanban
            </Button>
          </div>

          <Button onClick={() => router.push("/pedido_compra/cadastrar")} variant={"success"}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      }
      isTitulo
    >
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">


          {viewMode === "kanban" && (
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Agrupar por:</span>
                  <Select value={kanbanGroupBy} onValueChange={(v) => setKanbanGroupBy(v as "category" | "status")}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Mostrar colunas vazias:</span>
                  <Button
                    variant={showEmptyColumns ? "success" : "default"}
                    size="sm"
                    onClick={() => setShowEmptyColumns(!showEmptyColumns)}
                    className="h-8"
                  >
                    {showEmptyColumns ? "Sim" : "Não"}
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Ordenar por:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data de Criação</SelectItem>
                      <SelectItem value="value">Valor</SelectItem>
                      <SelectItem value="delivery">Data de Entrega</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant={"success"}
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card border rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, fornecedor ou descrição"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v as PurchaseOrderCategoryLabel | "todas")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={obraOpen} onOpenChange={setObraOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" className="justify-between w-full md:w-48 shrink-0">
                    <span className="truncate">
                      {obraSelected
                        ? `Obra #${obraSelected.id}${obraSelected.titulo ? ` — ${obraSelected.titulo}` : ""}`
                        : "Obra"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <div className="border-b p-2">
                      <CommandInput
                        value={obraQuery}
                        onValueChange={setObraQuery}
                        placeholder="Digite o ID (ex: 12) ou o título (ex: Residencial)..."
                      />
                    </div>
                    <CommandList>
                      {obraLoading ? (
                        <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                      ) : (
                        <>
                          <CommandEmpty>Nenhuma obra encontrada</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setSelectedProjectId(null)
                                setObraSelected(null)
                                setObraOpen(false)
                              }}
                            >
                              Todas as obras
                            </CommandItem>

                            {obraOptions.map((o) => (
                              <CommandItem key={o.id} value={String(o.id)} onSelect={() => selectObraFilter(o)}>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    Obra #{o.id}
                                    {o.titulo ? ` — ${o.titulo}` : ""}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {(o.nomeReceptor ?? "").trim() || "Sem dados do cliente"}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select
                value={selectedSupplierId === "all" ? "all" : String(selectedSupplierId)}
                onValueChange={(v) => setSelectedSupplierId(v === "all" ? "all" : Number(v))}
              >
                <SelectTrigger className="w-full md:w-48 shrink-0">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id="only-active-obras"
                  checked={onlyActiveObras}
                  onCheckedChange={setOnlyActiveObras}
                />
                <Label
                  htmlFor="only-active-obras"
                  className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer select-none"
                >
                  Apenas obras ativas
                </Label>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {viewMode === "list" && (
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as PurchaseOrderStatusSlug)} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
                <TabsTrigger value="todos" className="gap-2">
                  Todos <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.todos}</span>
                </TabsTrigger>
                <TabsTrigger value="rascunho" className="gap-2">
                  Rascunho <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.rascunho}</span>
                </TabsTrigger>
                <TabsTrigger value="aprovado" className="gap-2">
                  Aprovado <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.aprovado}</span>
                </TabsTrigger>
                <TabsTrigger value="em-compra" className="gap-2">
                  Em Compra <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["em-compra"]}</span>
                </TabsTrigger>
                <TabsTrigger value="aguardando-pagamento" className="gap-2 whitespace-nowrap">
                  Aguardando Pagamento{" "}
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["aguardando-pagamento"]}</span>
                </TabsTrigger>
                <TabsTrigger value="aguardando-entrega" className="gap-2 whitespace-nowrap">
                  Aguardando Entrega{" "}
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["aguardando-entrega"]}</span>
                </TabsTrigger>
                <TabsTrigger value="entregue" className="gap-2">
                  Entregue <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.entregue}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {viewMode === "list" && (
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm font-medium">Ordenar por:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Data de Criação</SelectItem>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="delivery">Data de Entrega</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={"success"}
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 w-9 p-0"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          {paginatedOrders.length > 0 ? (
            <>
              {viewMode === "list" ? (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm">Número</th>
                        <th className="text-left p-4 font-medium text-sm">Descrição</th>
                        <th className="text-left p-4 font-medium text-sm">Categoria</th>
                        <th className="text-left p-4 font-medium text-sm">Status</th>
                        <th className="text-left p-4 font-medium text-sm">Valor Previsto</th>
                        <th className="text-left p-4 font-medium text-sm">Valor Realizado</th>
                        <th className="text-left p-4 font-medium text-sm">Entrega</th>
                        <th className="text-left p-4 font-medium text-sm">Integração</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedOrders.map((order) => {
                        const variance =
                          order.actualValue != null && order.expectedValue
                            ? ((order.actualValue - order.expectedValue) / order.expectedValue) * 100
                            : null

                        return (
                          <tr
                            key={order.id}
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleOrderClick(order)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {!order.viewed && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Novo pedido" />
                                )}
                                <div>
                                  <div className="font-mono text-sm font-medium">{order.number}</div>
                                  <div className="text-xs text-muted-foreground">{order.supplier}</div>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="text-sm line-clamp-2 max-w-md">{order.description}</div>
                              <div className="text-xs text-muted-foreground mt-1">{order.project}</div>
                            </td>

                            <td className="p-4">
                              <Badge variant="outline" className="font-medium">
                                {order.category}
                              </Badge>
                            </td>

                            <td className="p-4">
                              <Badge
                                variant="outline"
                                className={statusConfig[order.status as StatusSlug]?.badgeClass}
                              >
                                {statusConfig[order.status as StatusSlug]?.label}
                              </Badge>
                            </td>

                            <td className="p-4">
                              <div className="text-sm font-medium">{formatMoney(order.expectedValue)}</div>
                            </td>

                            <td className="p-4">
                              {order.actualValue != null ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">{formatMoney(order.actualValue)}</div>
                                  {variance !== null && (
                                    <div
                                      className={`flex items-center gap-1 text-xs ${variance > 0 ? "text-red-600" : "text-green-600"
                                        }`}
                                    >
                                      {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {Math.abs(variance).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>

                            <td className="p-4">
                              {order.deliveryDate ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {new Date(order.deliveryDate).toLocaleDateString("pt-BR")}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>

                            <td className="p-4">
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                Não integrado
                              </Badge>
                            </td>

                            <td className="p-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/pedido_compra/ver/${order.id}`)}>
                                    Visualizar pedido
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/pedido_compra/edit/${order.id}`}>Editar pedido</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleExcluir(order)}>
                                    Excluir pedido
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    {canScrollLeft && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => scrollKanbanBy("left")}
                        className="absolute left-2 top-[calc(50%-20px)] h-10 w-10 p-0 rounded-full shadow z-10"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    )}

                    {canScrollRight && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => scrollKanbanBy("right")}
                        className="absolute right-2 top-[calc(50%-20px)] h-10 w-10 p-0 rounded-full shadow z-10"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    )}

                    <div
                      ref={kanbanScrollRef}
                      className={`flex gap-6 overflow-x-auto pb-4 px-12 ${isPanning ? "cursor-grabbing" : "cursor-grab"} select-none`}
                      onPointerDown={onKanbanPointerDown}
                      onPointerMove={onKanbanPointerMove}
                      onPointerUp={onKanbanPointerUp}
                      onPointerCancel={onKanbanPointerCancel}
                      onPointerLeave={onKanbanPointerLeave}
                    >
                      {getDisplayGroups().map((group) => (
                        <div
                          key={group.key}
                          className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, group.key)}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">{group.label}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {group.orders.length}
                            </Badge>
                          </div>

                          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                            {group.orders.map((order) => {
                              const variance =
                                order.actualValue != null && order.expectedValue
                                  ? ((order.actualValue - order.expectedValue) / order.expectedValue) * 100
                                  : null

                              return (
                                <div
                                  key={order.id}
                                  draggable={kanbanGroupBy === "status"}
                                  onDragStart={(e) => handleDragStart(e, order)}
                                  className={`bg-card border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow ${kanbanGroupBy === "status" ? "cursor-move" : "cursor-pointer"}`}
                                  onClick={() => {
                                    if (didPanRef.current) {
                                      didPanRef.current = false
                                      return
                                    }
                                    handleOrderClick(order)
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {!order.viewed && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" title="Novo pedido" />
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-mono text-xs font-medium">#{order.number}</div>
                                        <div className="text-xs text-muted-foreground truncate">{order.supplier}</div>
                                      </div>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                                          <MoreVertical className="w-3 h-3" />
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
                                        <DropdownMenuItem asChild>
                                          <Link href={`/pedido_compra/edit/${order.id}`}>Editar pedido</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleExcluir(order)}>
                                          Excluir pedido
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {(order.obraTitulo || order.obraCidade) && (
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {order.obraTitulo && (
                                        <Link
                                          href={`/obras/${order.obraId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 truncate hover:text-primary transition-colors hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Ver obra (nova aba)"
                                        >
                                          <Building2 className="w-3 h-3 flex-shrink-0" />
                                          {order.obraTitulo}
                                        </Link>
                                      )}
                                      {order.obraCidade && (
                                        <span className="flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          {order.obraCidade}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <p className="text-sm line-clamp-2">{order.description}</p>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {kanbanGroupBy === "status" && (
                                      <Badge variant="outline" className="text-xs">
                                        {order.category}
                                      </Badge>
                                    )}
                                    {kanbanGroupBy === "category" && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${statusConfig[order.status as StatusSlug]?.badgeClass}`}
                                      >
                                        {statusConfig[order.status as StatusSlug]?.label}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Previsto:</span>
                                      <span className="font-medium">{formatMoney(order.expectedValue)}</span>
                                    </div>

                                    {order.actualValue != null && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Realizado:</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{formatMoney(order.actualValue)}</span>
                                          {variance !== null && (
                                            <span className={`flex items-center gap-0.5 ${variance > 0 ? "text-red-600" : "text-green-600"}`}>
                                              {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                              {Math.abs(variance).toFixed(1)}%
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {order.deliveryDate && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(order.deliveryDate).toLocaleDateString("pt-BR")}
                                    </div>
                                  )}

                                  <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-xs w-full justify-center">
                                    Não integrado
                                  </Badge>
                                </div>
                              )
                            })}

                            {group.orders.length === 0 && (
                              <div className="text-center py-8 text-sm text-muted-foreground">Nenhum pedido</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum pedido encontrado</p>
            </div>
          )}

          {viewMode === "list" && totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedOrders.length)} de{" "}
                {sortedOrders.length} pedidos
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
