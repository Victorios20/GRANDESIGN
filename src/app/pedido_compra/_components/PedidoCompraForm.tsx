"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Check,
  ChevronsUpDown,
  Copy,
  Edit,
  ExternalLink,
  FileText,
  MapPin,
  MoreVertical,
  Plus,
  Save,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ComboboxAdd, type ComboItem } from "@/components/ui/comboboxAdd"

import { PedidoCompraDetailHeader } from "@/app/pedido_compra/_components/detail/PedidoCompraDetailHeader"
import { PedidoCompraInlineStatus } from "@/app/pedido_compra/_components/detail/PedidoCompraInlineStatus"
import { PedidoCompraSectionCard } from "@/app/pedido_compra/_components/detail/PedidoCompraSectionCard"
import {
  listControlClass,
  listMutedButtonClass,
  listPrimaryButtonClass,
  listSubtlePanelClass,
} from "@/app/pedido_compra/_components/list/styles"
import { StatusBadge } from "@/components/pedido-compra/StatusBadge"
import { formatDateOnlyLongPtBr, fromDateOnlyDb } from "@/lib/date-only"
import {
  asNumber,
  asNumberOrNull,
  formatMoney,
  formatMoneyCompact,
  formatPedidoId,
  normalizeCategoria as normalizeCategoriaUtil,
  normalizeStatus as normalizeStatusUtil,
} from "@/lib/pedido-compra-utils"
import { cn } from "@/lib/utils"
import type {
  DeliveryAddress,
  FornecedorItem,
  FornecedorOption,
  MaterialDTO,
  MateriaisByTipo,
  ObraSearchItem,
  OrderItem,
  PedidoCategoria,
  PedidoCompraDetalhadoSnake,
  PedidoFormData,
  PedidoStatus,
} from "@/types/pedido-compra"

type Mode = "create" | "edit" | "view"
type FormData = PedidoFormData

type Props = {
  mode: Mode
  pedidoCompraId?: number
  initialData?: PedidoCompraDetalhadoSnake | null
  initialFornecedores?: FornecedorOption[]
  initialFornecedoresRaw?: FornecedorItem[]
  initialMateriaisByTipo?: MateriaisByTipo
  initialComponentes?: { id: number; nome: string }[]
  lockedMessage?: string | null
  disableEditAction?: boolean
}

const emptyMateriaisByTipo: MateriaisByTipo = { madeira: [], telha: [], geral: [], andaime: [] }
const compactControlClass = `${listControlClass} h-9 rounded-xl border-[#d9d3c8] bg-white`
const compactTextareaClass =
  "min-h-[92px] rounded-xl border-[#d9d3c8] bg-white px-3 py-2 text-sm text-[#2c201b] shadow-xs focus-visible:ring-[#393316]/15"
const labelClass = "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
const sectionGridClass = "grid gap-4 md:grid-cols-2 xl:grid-cols-4"

function ObraOptionLabelTop(obra: ObraSearchItem) {
  const titulo = (obra.titulo ?? "").trim()
  return titulo ? `#${obra.id} — ${titulo}` : `#${obra.id}`
}

function ObraOptionLabelBottom(obra: ObraSearchItem) {
  const nome = (obra.nomeReceptor ?? "").trim()
  const telefone = (obra.telefoneReceptor ?? "").trim()
  const parts = [nome, telefone].filter(Boolean)
  return parts.length ? parts.join(" • ") : "Sem dados do cliente"
}

const normalizeCategoria = normalizeCategoriaUtil
const normalizeStatus = normalizeStatusUtil

function normTipo(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase()
}

function categoriaToTipos(categoria: string) {
  const normalized = normTipo(categoria)
  if (!normalized) return null
  if (normalized === "ANDAIMES" || normalized === "ANDAIME") return ["ANDAIME", "ANDAIMES"]
  return [normalized]
}

function categoriaToKey(categoria: PedidoCategoria | ""): keyof MateriaisByTipo | null {
  const normalized = String(categoria ?? "").trim().toUpperCase()
  if (normalized === "MADEIRA") return "madeira"
  if (normalized === "TELHA") return "telha"
  if (normalized === "MATERIAIS") return "geral"
  if (normalized === "ANDAIMES" || normalized === "ANDAIME") return "andaime"
  return null
}

function materialLabel(material: MaterialDTO) {
  const descricao = (material.descricao ?? "").trim()
  const unidade = (material.unidade_de_medida ?? "un").trim() || "un"
  const preco = Number.isFinite(material.preco_unitario) ? formatMoneyCompact(material.preco_unitario) : "0.00"
  return `${descricao} • ${unidade} • R$ ${preco}`
}

function buildComboItems(list: MaterialDTO[]): ComboItem[] {
  return (list ?? [])
    .filter((material) => Number.isFinite(material.id) && material.id > 0 && String(material.descricao ?? "").trim() !== "")
    .map((material) => ({ value: String(material.id), label: materialLabel(material) }))
}

function formatCategoriaLabel(categoria: PedidoCategoria | "" | null | undefined) {
  if (!categoria) return "—"

  const normalized = String(categoria).trim().toUpperCase()

  if (normalized === "MATERIAIS") return "Materiais"
  if (normalized === "ANDAIMES" || normalized === "ANDAIME") return "Andaimes"
  if (normalized === "MADEIRA") return "Madeira"
  if (normalized === "TELHA") return "Telha"

  return normalized
}

const ReadOnlyField = ({
  label,
  value,
  className,
  highlight,
}: {
  label: string
  value: string | number | null | undefined | React.ReactNode
  className?: string
  highlight?: boolean
}) => (
  <div className={cn("space-y-1", className)}>
    <span className={labelClass}>{label}</span>
    <div className={cn("min-h-[24px] py-1.5", highlight ? "text-base font-semibold text-[#2c201b]" : "text-sm text-[#2c201b]")}>
      {value || <span className="text-muted-foreground">—</span>}
    </div>
  </div>
)

export default function PedidoCompraForm({
  mode,
  pedidoCompraId,
  initialData,
  initialFornecedores,
  initialFornecedoresRaw,
  initialMateriaisByTipo,
  initialComponentes,
  lockedMessage,
  disableEditAction = false,
}: Props) {
  const router = useRouter()

  const isView = mode === "view"
  const isEdit = mode === "edit"
  const isCreate = mode === "create"
  const resolvedPedidoId = Number(pedidoCompraId ?? initialData?.id ?? 0)

  const initialSupplierList = useMemo<FornecedorItem[]>(
    () =>
      initialFornecedoresRaw ??
      (initialFornecedores ?? []).map((fornecedor) => ({
        ...fornecedor,
        tipo: null,
      })),
    [initialFornecedores, initialFornecedoresRaw]
  )

  const [saving, setSaving] = useState(false)
  const [fornecedoresRaw, setFornecedoresRaw] = useState<FornecedorItem[]>(() => initialSupplierList)
  const [materiaisByTipo, setMateriaisByTipo] = useState<MateriaisByTipo>(() => initialMateriaisByTipo ?? emptyMateriaisByTipo)
  const initialState = useMemo(() => {
    if (mode === "create" || !initialData) {
      return {
        formData: {
          obraId: "",
          categoria: "" as PedidoCategoria | "",
          fornecedorId: "",
          descricao: "",
          valorOrcado: "",
          valorRealizado: "",
          dataEntrega: "",
          status: "RASCUNHO" as PedidoStatus,
          frete: "0",
          observacoes: "",
          naoPrevisto: false,
          motivoExtra: ""
        } satisfies FormData,
        deliveryAddress: {
          nomeReceptor: "",
          telefoneReceptor: "",
          enderecoEntrega: "",
          linkMaps: "",
        } satisfies DeliveryAddress,
        items: [] as OrderItem[],
        obraSelected: null as ObraSearchItem | null,
      }
    }

    const categoriaNorm = normalizeCategoria(initialData.categoria)
    const statusNorm = normalizeStatus(initialData.status)
    const fornecedorIdStr = initialData.fornecedor_id ? String(initialData.fornecedor_id) : ""

    return {
      formData: {
        obraId: String(initialData.obra_id ?? ""),
        categoria: categoriaNorm,
        fornecedorId: fornecedorIdStr,
        descricao: initialData.descricao ?? "",
        valorOrcado: initialData.valor_orcado == null ? "" : String(initialData.valor_orcado),
        valorRealizado: initialData.valor_realizado == null ? "" : String(initialData.valor_realizado),
        dataEntrega: fromDateOnlyDb(initialData.data_entrega) ?? "",
        status: statusNorm,
        frete: initialData.frete == null ? "0" : String(initialData.frete),
        observacoes: initialData.observacoes ?? "",
        naoPrevisto: initialData.nao_previsto ?? false,
        motivoExtra: initialData.motivo_extra ?? "",
      } satisfies FormData,
      deliveryAddress: {
        nomeReceptor: initialData.nome_receptor ?? "",
        telefoneReceptor: initialData.telefone_receptor ?? "",
        enderecoEntrega: initialData.endereco_entrega ?? "",
        linkMaps: initialData.link_maps ?? "",
      } satisfies DeliveryAddress,
      items: (initialData.itens ?? []).map((item) => ({
        id: item.id,
        clientId: `db-${item.id}`,
        descricao: item.descricao ?? "",
        quantidade: Number(item.quantidade ?? 0),
        precoUnitario: Number(item.preco_unitario ?? 0),
        total: Number(item.total ?? 0),
        tamanho: item.tamanho == null ? null : Number(item.tamanho),
        componente: item.componente ?? null,
      })) as OrderItem[],
      obraSelected: {
        id: Number(initialData.obra_id),
        titulo: initialData.obra?.titulo ?? null,
        nomeReceptor: initialData.nome_receptor ?? null,
        telefoneReceptor: initialData.telefone_receptor ?? null,
        enderecoEntrega: initialData.endereco_entrega ?? null,
        linkMaps: initialData.link_maps ?? null,
      } as ObraSearchItem | null,
    }
  }, [initialData, mode])

  const [formData, setFormData] = useState<FormData>(initialState.formData)
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialState.deliveryAddress)
  const [items, setItems] = useState<OrderItem[]>(initialState.items)
  const [obraSelected, setObraSelected] = useState<ObraSearchItem | null>(initialState.obraSelected)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showExitAlert, setShowExitAlert] = useState(false)

  const [obraOpen, setObraOpen] = useState(false)
  const [obraQuery, setObraQuery] = useState("")
  const [obraLoading, setObraLoading] = useState(false)
  const [obraOptions, setObraOptions] = useState<ObraSearchItem[]>([])

  const isDirty = useMemo(() => {
    if (mode === "view") return false

    const current = JSON.stringify({
      formData,
      deliveryAddress,
      items: items.map((item) => ({ ...item, total: item.total })),
      obraSelected,
    })

    const initial = JSON.stringify({
      formData: initialState.formData,
      deliveryAddress: initialState.deliveryAddress,
      items: initialState.items,
      obraSelected: initialState.obraSelected,
    })

    return current !== initial
  }, [deliveryAddress, formData, initialState, items, mode, obraSelected])

  useEffect(() => {
    if (!isDirty || saving) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty, saving])

  const goBack = useCallback(() => {
    if (isEdit && resolvedPedidoId) {
      router.push(`/pedido_compra/ver/${resolvedPedidoId}`)
      return
    }

    router.push("/pedido_compra")
  }, [isEdit, resolvedPedidoId, router])

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowExitAlert(true)
      return
    }

    goBack()
  }, [goBack, isDirty])

  const confirmExit = () => {
    setShowExitAlert(false)
    goBack()
  }

  useEffect(() => {
    setFornecedoresRaw(initialSupplierList)
  }, [initialSupplierList])

  useEffect(() => {
    setMateriaisByTipo(initialMateriaisByTipo ?? emptyMateriaisByTipo)
  }, [initialMateriaisByTipo])

  const detailHeaderTitle = useMemo(() => {
    if (isCreate) return "Novo Pedido de Compra"
    if (resolvedPedidoId > 0) return `Pedido #${formatPedidoId(resolvedPedidoId, formData.obraId)}`
    return isView ? "Pedido de Compra" : "Editar Pedido de Compra"
  }, [formData.obraId, isCreate, isView, resolvedPedidoId])

  const currentSupplier = useMemo(
    () =>
      fornecedoresRaw.find((fornecedor) => String(fornecedor.id) === String(formData.fornecedorId)) ??
      (initialData?.fornecedor
        ? {
            id: initialData.fornecedor.id,
            nome: initialData.fornecedor.nome,
            tipo: initialData.fornecedor.tipo ?? null,
          }
        : null),
    [fornecedoresRaw, formData.fornecedorId, initialData]
  )

  const obraSummaryLabel = useMemo(() => {
    if (obraSelected) return ObraOptionLabelTop(obraSelected)
    if (formData.obraId) return `Obra #${formData.obraId}`
    return "Sem obra vinculada"
  }, [obraSelected, formData.obraId])

  const fornecedorSummaryLabel = currentSupplier?.nome ?? "Sem fornecedor"
  const categoriaSummaryLabel = formatCategoriaLabel(formData.categoria)
  useEffect(() => {
    let canceled = false

    const load = async () => {
      try {
        const response = await fetch("/api/fornecedores", { cache: "no-store" })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          const message = body?.error || body?.message || "Falha ao listar fornecedores"
          throw new Error(message)
        }

        const arr: unknown[] = Array.isArray(body) ? body : []
        const rawMapped: FornecedorItem[] = arr
          .map((entry) => {
            const item = entry as Record<string, unknown>
            return {
              id: Number(item.id),
              nome: String(item.nome ?? ""),
              tipo: item.tipo == null ? null : String(item.tipo),
            }
          })
          .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.nome.trim() !== "")

        if (!canceled) {
          setFornecedoresRaw(rawMapped)
        }
      } catch {
        if (!canceled) {
          setFornecedoresRaw(initialSupplierList)
        }
      }
    }

    load()

    return () => {
      canceled = true
    }
  }, [initialSupplierList])

  const prevCategoriaRef = useRef<FormData["categoria"]>(initialState.formData.categoria)
  useEffect(() => {
    if (prevCategoriaRef.current === formData.categoria) return

    prevCategoriaRef.current = formData.categoria

    setFormData((previous) => {
      if (!previous.fornecedorId) return previous
      return { ...previous, fornecedorId: "" }
    })

    if (isCreate) {
      setItems([])
    }
  }, [formData.categoria, isCreate, initialState.formData.categoria])

  const prevFornecedorRef = useRef(formData.fornecedorId)
  useEffect(() => {
    if (formData.categoria !== "MADEIRA") return
    if (prevFornecedorRef.current === formData.fornecedorId) return

    prevFornecedorRef.current = formData.fornecedorId
    if (isCreate) {
      setItems([])
    }
  }, [formData.categoria, formData.fornecedorId, isCreate])

  const fornecedoresFiltrados = useMemo(() => {
    const allowed = categoriaToTipos(String(formData.categoria))
    if (!allowed) return fornecedoresRaw

    const allowedSet = new Set(allowed.map((item) => normTipo(item)))
    const filtered = fornecedoresRaw.filter((fornecedor) => allowedSet.has(normTipo(fornecedor.tipo)))

    if (!formData.fornecedorId) return filtered
    if (filtered.some((fornecedor) => String(fornecedor.id) === String(formData.fornecedorId))) return filtered

    const selected = fornecedoresRaw.find((fornecedor) => String(fornecedor.id) === String(formData.fornecedorId))
    return selected ? [selected, ...filtered] : filtered
  }, [fornecedoresRaw, formData.categoria, formData.fornecedorId])

  const isMadeira = formData.categoria === "MADEIRA"

  const subtotal = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + (Number.isFinite(item.total) ? item.total : 0), 0)
    const frete = asNumber(formData.frete)
    return itemsTotal + frete
  }, [formData.frete, items])

  const headerTitle = useMemo(() => {
    if (isCreate) return "Criar Pedido de Compra"
    const formattedId = resolvedPedidoId > 0 ? formatPedidoId(resolvedPedidoId, formData.obraId) : "pedido"
    return isView ? `Visualizar #${formattedId}` : `Editar #${formattedId}`
  }, [formData.obraId, isCreate, isView, resolvedPedidoId])

  useEffect(() => {
    if (!obraOpen) return

    const query = obraQuery.trim()
    if (!query) {
      setObraOptions([])
      return
    }

    let canceled = false
    const timer = setTimeout(async () => {
      setObraLoading(true)
      try {
        const response = await fetch(`/api/obras/pesquisar?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          const message = body?.error || body?.message || "Falha ao pesquisar obras"
          throw new Error(message)
        }

        const arr: unknown[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []
        const mapped: ObraSearchItem[] = arr
          .map((entry) => {
            const item = entry as Record<string, unknown>
            return {
              id: Number(item.id),
              titulo: item.titulo == null ? null : String(item.titulo),
              nomeReceptor: item.nomeReceptor == null ? null : String(item.nomeReceptor),
              telefoneReceptor: item.telefoneReceptor == null ? null : String(item.telefoneReceptor),
              enderecoEntrega: item.enderecoEntrega == null ? null : String(item.enderecoEntrega),
              linkMaps: item.linkMaps == null ? null : String(item.linkMaps),
            }
          })
          .filter((item) => Number.isFinite(item.id) && item.id > 0)

        if (!canceled) {
          setObraOptions(mapped)
        }
      } catch {
        if (!canceled) {
          setObraOptions([])
        }
      } finally {
        if (!canceled) {
          setObraLoading(false)
        }
      }
    }, 500)

    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [obraOpen, obraQuery])

  function selectObra(obra: ObraSearchItem) {
    setObraSelected(obra)
    setFormData((previous) => ({ ...previous, obraId: String(obra.id) }))

    setDeliveryAddress({
      nomeReceptor: (obra.nomeReceptor ?? "").trim(),
      telefoneReceptor: (obra.telefoneReceptor ?? "").trim(),
      enderecoEntrega: (obra.enderecoEntrega ?? "").trim(),
      linkMaps: (obra.linkMaps ?? "").trim(),
    })

    setObraOpen(false)
  }

  function addItem() {
    const newItem: OrderItem = {
      clientId: `new-${Date.now()}`,
      descricao: "",
      quantidade: 0,
      precoUnitario: 0,
      total: 0,
      tamanho: null,
      componente: null,
    }

    setItems((previous) => [...previous, newItem])
  }

  function updateItem(clientId: string, field: keyof OrderItem, value: string | number | null) {
    setItems((previous) =>
      previous.map((item) => {
        if (item.clientId !== clientId) return item

        const next = { ...item, [field]: value } as OrderItem
        const quantidade = Number(next.quantidade ?? 0)
        const preco = Number(next.precoUnitario ?? 0)
        const tamanho = Number(next.tamanho)

        if (formData.categoria === "MADEIRA" && Number.isFinite(tamanho) && tamanho > 0) {
          next.total = quantidade * preco * tamanho
        } else {
          next.total = quantidade * preco
        }

        return next
      })
    )
  }

  function removeItem(clientId: string) {
    setItems((previous) => previous.filter((item) => item.clientId !== clientId))
  }
  const hasFornecedorSelected = Boolean(
    formData.fornecedorId && Number.isFinite(Number(formData.fornecedorId)) && Number(formData.fornecedorId) > 0
  )
  const needsSupplierForItems = formData.categoria === "MADEIRA"
  const itemSelectionDisabled = !formData.categoria || (needsSupplierForItems && !hasFornecedorSelected)

  const materiaisFiltradosParaCategoria = useMemo(() => {
    const key = categoriaToKey(formData.categoria)
    if (!key) return [] as MaterialDTO[]
    if (formData.categoria === "MADEIRA" && !hasFornecedorSelected) return [] as MaterialDTO[]

    const base = materiaisByTipo[key] ?? []
    const fornecedorId = Number(formData.fornecedorId)

    if (!hasFornecedorSelected) return base
    return base.filter((material) => material.fornecedorId == null || material.fornecedorId === fornecedorId)
  }, [formData.categoria, formData.fornecedorId, hasFornecedorSelected, materiaisByTipo])

  const comboItemsMateriais = useMemo(() => buildComboItems(materiaisFiltradosParaCategoria), [materiaisFiltradosParaCategoria])

  function getComboLabelForDescricao(descricao: string) {
    const normalized = (descricao ?? "").trim()
    if (!normalized) return "Selecione"
    return normalized
  }

  function onSelectMaterialForItem(clientId: string, materialIdValue: string) {
    if (materialIdValue === "vazio") return

    const materialId = Number(materialIdValue)
    if (!Number.isFinite(materialId) || materialId <= 0) return

    const material = materiaisFiltradosParaCategoria.find((item) => item.id === materialId)
    if (!material) return

    setItems((previous) =>
      previous.map((item) => {
        if (item.clientId !== clientId) return item

        const next: OrderItem = { ...item }
        next.descricao = String(material.descricao ?? "").trim()
        next.precoUnitario = Number(material.preco_unitario ?? 0)

        const quantidade = Number(next.quantidade ?? 0)
        if (!Number.isFinite(quantidade) || quantidade <= 0) next.quantidade = 1

        const preco = Number(next.precoUnitario ?? 0)
        const tamanho = Number(next.tamanho)

        if (formData.categoria === "MADEIRA" && Number.isFinite(tamanho) && tamanho > 0) {
          next.total = Number(next.quantidade ?? 0) * preco * tamanho
        } else {
          next.total = Number(next.quantidade ?? 0) * preco
        }

        return next
      })
    )
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || isView) return

    const obraIdNum = Number(formData.obraId)
    if (!Number.isFinite(obraIdNum) || obraIdNum <= 0) {
      toast.error("Selecione uma obra válida")
      return
    }

    if (!formData.categoria) {
      toast.error("Selecione a categoria")
      return
    }

    if (!items.length) {
      toast.error("Adicione pelo menos 1 item")
      return
    }

    setSaving(true)
    try {
      const payload = {
        obra_id: obraIdNum,
        categoria: formData.categoria,
        status: formData.status,
        fornecedor_id: formData.fornecedorId ? Number(formData.fornecedorId) : null,
        descricao: formData.descricao?.trim() || null,
        valor_orcado: asNumberOrNull(formData.valorOrcado),
        valor_realizado: asNumberOrNull(formData.valorRealizado),
        frete: asNumberOrNull(formData.frete) ?? 0,
        observacoes: formData.observacoes?.trim() || null,

        nao_previsto: formData.naoPrevisto,
        motivo_extra: formData.motivoExtra?.trim() || null,

        data_entrega: formData.dataEntrega ? formData.dataEntrega : null,
        nome_receptor: deliveryAddress.nomeReceptor?.trim() || null,
        telefone_receptor: deliveryAddress.telefoneReceptor?.trim() || null,
        endereco_entrega: deliveryAddress.enderecoEntrega?.trim() || null,
        link_maps: deliveryAddress.linkMaps?.trim() || null,
        itens: items.map((item) => ({
          id: item.id ?? null,
          descricao: item.descricao ?? "",
          quantidade: Number(item.quantidade ?? 0),
          preco_unitario: Number(item.precoUnitario ?? 0),
          total: Number(item.total ?? 0),
          tamanho: formData.categoria === "MADEIRA" ? (item.tamanho == null ? null : Number(item.tamanho)) : null,
          componente: item.componente ?? null,
        })),
      }

      const isEditMode = isEdit
      const url = isEditMode ? `/api/pedido_compra/editar/${pedidoCompraId}` : "/api/pedido_compra/cadastrar"
      const method = isEditMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const message = body?.error || body?.message || "Falha ao salvar"
        throw new Error(message)
      }

      const savedId = body?.data?.id ?? body?.data?.pedidoCompraId ?? body?.id ?? pedidoCompraId
      toast.success(isEditMode ? "Pedido atualizado" : "Pedido cadastrado")

      if (savedId) {
        window.location.href = `/pedido_compra/ver/${savedId}`
        return
      }

      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar pedido"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function patchPedidoStatus(pedidoId: number, status: PedidoStatus) {
    const response = await fetch(`/api/pedido_compra/status/${pedidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body?.error || body?.message || "Falha ao atualizar status")
    return body?.data
  }

  const handleInlineStatusUpdate = useCallback(
    async (nextStatus: PedidoStatus) => {
      if (!resolvedPedidoId || nextStatus === formData.status) return

      const previousStatus = formData.status
      setFormData((previous) => ({ ...previous, status: nextStatus }))

      try {
        await patchPedidoStatus(resolvedPedidoId, nextStatus)
        toast.success("Status atualizado")
      } catch (error: unknown) {
        setFormData((previous) => ({ ...previous, status: previousStatus }))
        const message = error instanceof Error ? error.message : "Falha ao atualizar status"
        toast.error(message)
        throw error
      }
    },
    [formData.status, resolvedPedidoId]
  )

  async function deletePedido(pedidoId: number) {
    const response = await fetch(`/api/pedido_compra/excluir/${pedidoId}`, { method: "DELETE" })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body?.error || body?.message || "Falha ao excluir pedido")
    return body?.data
  }

  const handleExcluirPedido = async () => {
    if (!resolvedPedidoId || !Number.isFinite(resolvedPedidoId)) return

    try {
      await deletePedido(resolvedPedidoId)
      toast.success("Pedido excluído")
      router.push("/pedido_compra")
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao excluir pedido"
      toast.error(message)
    }
  }

  const pageHeaderActions = !isView ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={handleBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
        Cancelar
      </Button>
      <Button type="submit" form="pedido-compra-form" disabled={saving} variant="success" className="gap-2">
        <Save className="size-4" />
        {saving ? "Salvando..." : isCreate ? "Cadastrar" : "Salvar"}
      </Button>
    </div>
  ) : undefined

  const copyDeliveryData = async () => {
    const text = [
      deliveryAddress.nomeReceptor,
      deliveryAddress.telefoneReceptor,
      deliveryAddress.enderecoEntrega,
      deliveryAddress.linkMaps,
    ]
      .filter(Boolean)
      .join("\n")

    if (!text) {
      toast.error("Sem dados para copiar")
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      toast.success("Dados copiados!")
    } catch {
      toast.error("Erro ao copiar")
    }
  }
  return (
    <PageLayout
      title={isCreate ? "Criar Pedido de Compra" : headerTitle}
      links={[
        { label: "Home", href: "/" },
        { label: "Pedidos de Compra", href: "/pedido_compra" },
      ]}
      headerActions={pageHeaderActions}
      isTitulo
    >
      <div className="mx-auto w-full max-w-6xl">
        <form id="pedido-compra-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <PedidoCompraDetailHeader
            title={detailHeaderTitle}
            meta={
              <>
                <span>{categoriaSummaryLabel}</span>
                <span className="text-[#c9c1b5]">•</span>
                <span>{fornecedorSummaryLabel}</span>
                <span className="text-[#c9c1b5]">•</span>
                {formData.obraId ? (
                  <Link
                    href={`/obras/${obraSelected?.id || formData.obraId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#6f6556] transition-colors hover:text-[#2c201b]"
                  >
                    {obraSummaryLabel}
                    <ExternalLink className="size-3.5" />
                  </Link>
                ) : (
                  <span>{obraSummaryLabel}</span>
                )}
              </>
            }
            status={
              isView || isEdit ? (
                <PedidoCompraInlineStatus status={formData.status} onSubmit={handleInlineStatusUpdate} />
              ) : (
                <StatusBadge status={formData.status} />
              )
            }
            actions={
              isView ? (
                <>
                  {!disableEditAction ? (
                    <Button
                      type="button"
                      size="sm"
                      className={cn(listPrimaryButtonClass, "h-9 rounded-lg")}
                      onClick={() => resolvedPedidoId > 0 && router.push(`/pedido_compra/edit/${resolvedPedidoId}`)}
                      disabled={resolvedPedidoId <= 0}
                    >
                      <Edit className="size-4" />
                      Editar
                    </Button>
                  ) : null}
                  {!disableEditAction ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className={cn(listMutedButtonClass, "size-9 rounded-lg px-0")}>
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-[#e8e1d6]">
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onSelect={() => setDeleteDialogOpen(true)}
                          disabled={resolvedPedidoId <= 0}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </>
              ) : null
            }
          />

          {lockedMessage ? (
            <Alert>
              <AlertDescription>{lockedMessage}</AlertDescription>
            </Alert>
          ) : null}

          {!isView ? (
            <PedidoCompraSectionCard
              title="Controle do pedido"
              description="Defina os dados operacionais que controlam o pedido e liberam a edição dos itens."
              icon={<Building2 className="size-4" />}
              className="order-1"
            >
              <div className={sectionGridClass}>
                <div className="space-y-2 xl:col-span-2">
                  <Label className={labelClass}>Obra</Label>
                  <Popover open={obraOpen} onOpenChange={setObraOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={cn(listMutedButtonClass, "w-full justify-between rounded-xl px-3")}>
                        <span className="truncate text-left">
                          {obraSelected ? ObraOptionLabelTop(obraSelected) : "Pesquisar por ID ou título..."}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <div className="border-b p-2">
                          <CommandInput
                            value={obraQuery}
                            onValueChange={setObraQuery}
                            placeholder="Digite o ID ou o título da obra..."
                          />
                        </div>

                        <CommandList>
                          {obraLoading ? (
                            <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                          ) : (
                            <>
                              <CommandEmpty>Nenhuma obra encontrada</CommandEmpty>
                              <CommandGroup>
                                {obraOptions.map((obra) => {
                                  const selected = String(obra.id) === String(formData.obraId)
                                  return (
                                    <CommandItem
                                      key={obra.id}
                                      value={String(obra.id)}
                                      onSelect={() => selectObra(obra)}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="mt-0.5 flex size-5 items-center justify-center">
                                        {selected ? <Check className="size-4" /> : null}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{ObraOptionLabelTop(obra)}</div>
                                        <div className="truncate text-xs text-muted-foreground">{ObraOptionLabelBottom(obra)}</div>
                                      </div>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Input id="obraIdHidden" value={formData.obraId} readOnly className="hidden" />
                  <p className="text-xs text-muted-foreground">
                    Ao selecionar a obra, os dados de entrega são sugeridos automaticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria" className={labelClass}>
                    Categoria
                  </Label>
                  <Select
                    key={`cat-${String(formData.categoria)}`}
                    value={formData.categoria}
                    onValueChange={(value) => setFormData((previous) => ({ ...previous, categoria: value as PedidoCategoria }))}
                  >
                    <SelectTrigger id="categoria" className={compactControlClass}>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MADEIRA">Madeira</SelectItem>
                      <SelectItem value="TELHA">Telha</SelectItem>
                      <SelectItem value="ANDAIMES">Andaimes</SelectItem>
                      <SelectItem value="MATERIAIS">Materiais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedor" className={labelClass}>
                    Fornecedor
                  </Label>
                  <Select
                    key={`forn-${String(formData.fornecedorId)}-${fornecedoresFiltrados.length}`}
                    value={formData.fornecedorId || "none"}
                    onValueChange={(value) => setFormData((previous) => ({ ...previous, fornecedorId: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger id="fornecedor" className={compactControlClass}>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {fornecedoresFiltrados.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                          {fornecedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.categoria === "MADEIRA" ? (
                    <p className="text-xs text-muted-foreground">Necessário para liberar os itens de madeira.</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorOrcado" className={labelClass}>
                    Valor previsto
                  </Label>
                  <Input
                    id="valorOrcado"
                    type="number"
                    step="0.01"
                    value={formData.valorOrcado}
                    onChange={(event) => setFormData((previous) => ({ ...previous, valorOrcado: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorRealizado" className={labelClass}>
                    Valor realizado
                  </Label>
                  <Input
                    id="valorRealizado"
                    type="number"
                    step="0.01"
                    value={formData.valorRealizado}
                    onChange={(event) => setFormData((previous) => ({ ...previous, valorRealizado: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frete" className={labelClass}>
                    Frete
                  </Label>
                  <Input
                    id="frete"
                    type="number"
                    step="0.01"
                    value={formData.frete}
                    onChange={(event) => setFormData((previous) => ({ ...previous, frete: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataEntrega" className={labelClass}>
                    Data de entrega
                  </Label>
                  <Input
                    id="dataEntrega"
                    type="date"
                    value={formData.dataEntrega}
                    onChange={(event) => setFormData((previous) => ({ ...previous, dataEntrega: event.target.value }))}
                    className={compactControlClass}
                  />
                </div>

              </div>
            </PedidoCompraSectionCard>
          ) : null}

          <PedidoCompraSectionCard
            title="Dados principais"
            description="Identificação do pedido e contexto que ajuda a equipe a entender rapidamente o que está sendo comprado."
            icon={<FileText className="size-4" />}
            className="order-3"
          >
            {isView ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                <ReadOnlyField label="Descrição do pedido" value={formData.descricao} className="min-w-0" />
                <ReadOnlyField label="Observações" value={formData.observacoes} className="min-w-0" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                <div className="space-y-2">
                  <Label htmlFor="descricao" className={labelClass}>
                    Descrição do pedido
                  </Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(event) => setFormData((previous) => ({ ...previous, descricao: event.target.value }))}
                    placeholder="Ex: Compra de telhas cerâmicas para cobertura principal"
                    className={compactTextareaClass}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes" className={labelClass}>
                    Observações
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(event) => setFormData((previous) => ({ ...previous, observacoes: event.target.value }))}
                    placeholder="Informações adicionais, alinhamentos ou pendências do pedido"
                    className={compactTextareaClass}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </PedidoCompraSectionCard>

          <PedidoCompraSectionCard
            title="Financeiro e acompanhamento"
            description="Consolida valores e prazos em um bloco curto, mais próximo da lógica operacional do pedido."
            icon={<Wallet className="size-4" />}
            className={isView ? "order-2" : "hidden"}
          >
            {isView ? (
              <div className={sectionGridClass}>
                <ReadOnlyField label="Valor previsto" value={formData.valorOrcado ? formatMoney(Number(formData.valorOrcado)) : undefined} highlight />
                <ReadOnlyField label="Valor realizado" value={formData.valorRealizado ? formatMoney(Number(formData.valorRealizado)) : undefined} highlight />
                <ReadOnlyField label="Frete" value={formData.frete ? formatMoney(Number(formData.frete)) : undefined} />
                <ReadOnlyField label="Data de entrega" value={formData.dataEntrega ? formatDateOnlyLongPtBr(formData.dataEntrega) : undefined} />
              </div>
            ) : (
              <div className={sectionGridClass}>
                <div className="space-y-2">
                  <Label htmlFor="valorOrcado" className={labelClass}>
                    Valor previsto
                  </Label>
                  <Input
                    id="valorOrcado"
                    type="number"
                    step="0.01"
                    value={formData.valorOrcado}
                    onChange={(event) => setFormData((previous) => ({ ...previous, valorOrcado: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorRealizado" className={labelClass}>
                    Valor realizado
                  </Label>
                  <Input
                    id="valorRealizado"
                    type="number"
                    step="0.01"
                    value={formData.valorRealizado}
                    onChange={(event) => setFormData((previous) => ({ ...previous, valorRealizado: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frete" className={labelClass}>
                    Frete
                  </Label>
                  <Input
                    id="frete"
                    type="number"
                    step="0.01"
                    value={formData.frete}
                    onChange={(event) => setFormData((previous) => ({ ...previous, frete: event.target.value }))}
                    placeholder="0,00"
                    className={compactControlClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataEntrega" className={labelClass}>
                    Data de entrega
                  </Label>
                  <Input
                    id="dataEntrega"
                    type="date"
                    value={formData.dataEntrega}
                    onChange={(event) => setFormData((previous) => ({ ...previous, dataEntrega: event.target.value }))}
                    className={compactControlClass}
                  />
                </div>
              </div>
            )}
          </PedidoCompraSectionCard>
          <PedidoCompraSectionCard
            title="Itens do pedido"
            description="Mantém a lógica atual de itens e subtotal, com uma composição mais clara para leitura e edição."
            icon={<Building2 className="size-4" />}
            className={isView ? "order-1" : "order-2"}
            actions={
              !isView ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn(listPrimaryButtonClass, "h-9 rounded-lg")}
                  onClick={addItem}
                  disabled={itemSelectionDisabled}
                >
                  <Plus className="size-4" />
                  Adicionar item
                </Button>
              ) : null
            }
          >
            {isView ? (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ddd7cc] bg-[#faf8f3] p-6 text-center text-sm text-muted-foreground">
                    Nenhum item listado para este pedido.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#e8e1d6]">
                    <table className="w-full text-sm">
                      <thead className="bg-[#faf8f3] text-[11px] uppercase tracking-[0.08em] text-[#6f6556]">
                        <tr>
                          <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                          {isMadeira ? <th className="w-36 px-3 py-2 text-left font-medium">Componente</th> : null}
                          <th className="px-3 py-2 text-left font-medium">Descrição</th>
                          <th className="w-20 px-3 py-2 text-center font-medium">Qtd</th>
                          {isMadeira ? <th className="w-24 px-3 py-2 text-center font-medium">Tamanho</th> : null}
                          <th className="w-32 px-3 py-2 text-right font-medium">Vlr. unit.</th>
                          <th className="w-32 px-3 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efe7db]">
                        {items.map((item, index) => (
                          <tr key={item.clientId} className={index % 2 === 0 ? "bg-white" : "bg-[#faf8f3]/50"}>
                            <td className="px-3 py-2.5 text-sm text-muted-foreground">{index + 1}</td>
                            {isMadeira ? (
                              <td className="px-3 py-2.5 text-sm text-muted-foreground">{item.componente || "—"}</td>
                            ) : null}
                            <td className="px-3 py-2.5 text-sm text-[#2c201b]">{item.descricao || "—"}</td>
                            <td className="px-3 py-2.5 text-center text-sm text-[#2c201b]">{item.quantidade}</td>
                            {isMadeira ? (
                              <td className="px-3 py-2.5 text-center text-sm text-[#2c201b]">
                                {item.tamanho != null && item.tamanho !== 0 ? item.tamanho : "—"}
                              </td>
                            ) : null}
                            <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">{formatMoney(item.precoUnitario)}</td>
                            <td className="px-3 py-2.5 text-right text-sm font-medium text-[#2c201b]">{formatMoney(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end">
                  <div className={cn(listSubtlePanelClass, "px-4 py-3")}>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Subtotal (itens + frete)
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[#2c201b]">{formatMoney(subtotal)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ddd7cc] bg-[#faf8f3] p-6 text-center">
                    {itemSelectionDisabled && needsSupplierForItems ? (
                      <p className="text-sm text-amber-700">Selecione um fornecedor de madeira para liberar os itens.</p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(listMutedButtonClass, "mt-3 rounded-lg bg-white")}
                          onClick={addItem}
                          disabled={itemSelectionDisabled}
                        >
                          Adicionar primeiro item
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "hidden md:grid items-center gap-2 rounded-xl border border-[#e8e1d6] bg-[#faf8f3] px-3 py-2",
                        isMadeira
                          ? "grid-cols-[1.2fr_2fr_80px_80px_100px_120px_40px]"
                          : "grid-cols-[3fr_80px_100px_120px_40px]"
                      )}
                    >
                      {isMadeira ? <Label className={labelClass}>Componente</Label> : null}
                      <Label className={labelClass}>Descrição</Label>
                      <Label className={cn(labelClass, "text-center")}>Qtd</Label>
                      {isMadeira ? <Label className={cn(labelClass, "text-center")}>Tamanho</Label> : null}
                      <Label className={cn(labelClass, "text-right")}>Vlr. unit.</Label>
                      <Label className={cn(labelClass, "text-right")}>Total</Label>
                      <span />
                    </div>

                    {items.map((item, index) => (
                      <div
                        key={item.clientId}
                        className={cn(
                          "grid gap-2 rounded-xl border border-[#ece6db] bg-white px-3 py-3 md:items-center md:border-0 md:border-b md:border-[#efe7db] md:rounded-none md:px-2 md:py-2",
                          isMadeira
                            ? "grid-cols-1 md:grid-cols-[1.2fr_2fr_80px_80px_100px_120px_40px]"
                            : "grid-cols-1 md:grid-cols-[3fr_80px_100px_120px_40px]"
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between md:hidden">
                          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Item {index + 1}</span>
                          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => removeItem(item.clientId)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>

                        {isMadeira ? (
                          <div className="space-y-1">
                            <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              Componente
                            </Label>
                            <Select value={item.componente || ""} onValueChange={(value) => updateItem(item.clientId, "componente", value)}>
                              <SelectTrigger className={compactControlClass}>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(initialComponentes || []).map((componente) => (
                                  <SelectItem key={componente.id} value={componente.nome}>
                                    {componente.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        <div className="space-y-1">
                          <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Descrição
                          </Label>
                          <ComboboxAdd
                            key={`desc-${item.clientId}-${comboItemsMateriais.length}-${formData.categoria}-${formData.fornecedorId}`}
                            buttonText={getComboLabelForDescricao(item.descricao)}
                            placeholder="Buscar..."
                            widthClass="w-full"
                            disabled={itemSelectionDisabled}
                            items={comboItemsMateriais}
                            onSelect={(value) => onSelectMaterialForItem(item.clientId, value)}
                            showEmptyOption={false}
                            colorVariant="white-brown"
                            buttonClassName="h-9 justify-between rounded-xl border border-[#d9d3c8] bg-white text-sm text-[#2c201b]"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Qtd
                          </Label>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(event) => updateItem(item.clientId, "quantidade", Number(event.target.value) || 0)}
                            placeholder="0"
                            className={cn(compactControlClass, "px-2 md:text-center")}
                          />
                        </div>

                        {isMadeira ? (
                          <div className="space-y-1">
                            <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              Tamanho
                            </Label>
                            <Input
                              type="number"
                              value={item.tamanho ?? ""}
                              onChange={(event) =>
                                updateItem(item.clientId, "tamanho", event.target.value === "" ? null : Number(event.target.value))
                              }
                              placeholder="0"
                              className={cn(compactControlClass, "px-2 md:text-center")}
                            />
                          </div>
                        ) : null}

                        <div className="space-y-1">
                          <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Vlr. unit.
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.precoUnitario}
                            onChange={(event) => updateItem(item.clientId, "precoUnitario", Number(event.target.value) || 0)}
                            placeholder="0,00"
                            className={cn(compactControlClass, "px-2 md:text-right")}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Total
                          </Label>
                          <div className="flex h-9 items-center rounded-xl bg-[#faf8f3] px-3 font-mono text-sm font-medium text-[#2c201b] md:justify-end">
                            {formatMoneyCompact(item.total)}
                          </div>
                        </div>

                        <div className="hidden justify-end md:flex">
                          <button
                            type="button"
                            onClick={() => removeItem(item.clientId)}
                            className="group flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-destructive/10"
                            title="Remover item"
                          >
                            <Trash2 className="size-4 text-muted-foreground group-hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <div className={cn(listSubtlePanelClass, "px-4 py-3")}>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Subtotal (itens + frete)
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[#2c201b]">{formatMoney(subtotal)}</div>
                  </div>
                </div>
              </div>
            )}
          </PedidoCompraSectionCard>

          <PedidoCompraSectionCard
            title="Endereço de entrega"
            description="Dados logísticos do pedido, com acesso rápido para copiar o endereço completo."
            icon={<Truck className="size-4" />}
            className="order-4"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(listMutedButtonClass, "rounded-lg bg-white")}
                onClick={copyDeliveryData}
                title="Copiar dados do cliente"
              >
                <Copy className="size-4" />
                Copiar
              </Button>
            }
          >
            {isView ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyField label="Nome do cliente" value={deliveryAddress.nomeReceptor} />
                  <ReadOnlyField label="Telefone" value={deliveryAddress.telefoneReceptor} />
                </div>
                <ReadOnlyField label="Endereço completo" value={deliveryAddress.enderecoEntrega} />
                <ReadOnlyField
                  label="Google Maps"
                  value={
                    deliveryAddress.linkMaps ? (
                      <a
                        href={deliveryAddress.linkMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#6f6556] transition-colors hover:text-[#2c201b]"
                      >
                        <MapPin className="size-4" />
                        Abrir no Google Maps
                      </a>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nomeReceptor" className={labelClass}>
                      Nome do cliente
                    </Label>
                    <Input
                      id="nomeReceptor"
                      value={deliveryAddress.nomeReceptor}
                      onChange={(event) => setDeliveryAddress((previous) => ({ ...previous, nomeReceptor: event.target.value }))}
                      placeholder="Nome completo"
                      className={compactControlClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefoneReceptor" className={labelClass}>
                      Telefone
                    </Label>
                    <Input
                      id="telefoneReceptor"
                      value={deliveryAddress.telefoneReceptor}
                      onChange={(event) => setDeliveryAddress((previous) => ({ ...previous, telefoneReceptor: event.target.value }))}
                      placeholder="(00) 00000-0000"
                      className={compactControlClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enderecoEntrega" className={labelClass}>
                    Endereço completo
                  </Label>
                  <Textarea
                    id="enderecoEntrega"
                    value={deliveryAddress.enderecoEntrega}
                    onChange={(event) => setDeliveryAddress((previous) => ({ ...previous, enderecoEntrega: event.target.value }))}
                    placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                    className={compactTextareaClass}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkMaps" className={labelClass}>
                    Link do Google Maps
                  </Label>
                  <Input
                    id="linkMaps"
                    value={deliveryAddress.linkMaps}
                    onChange={(event) => setDeliveryAddress((previous) => ({ ...previous, linkMaps: event.target.value }))}
                    placeholder="https://maps.google.com/?q=..."
                    className={compactControlClass}
                  />
                  {deliveryAddress.linkMaps ? (
                    <a
                      href={deliveryAddress.linkMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#6f6556] transition-colors hover:text-[#2c201b]"
                    >
                      <MapPin className="size-3.5" />
                      Abrir no Google Maps
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </PedidoCompraSectionCard>
        </form>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação excluirá permanentemente o pedido de compra <b>#{formatPedidoId(resolvedPedidoId, formData.obraId)}</b> e todos os seus itens.
              <br />
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluirPedido} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Se você sair agora, perderá todas as alterações feitas neste formulário. Deseja realmente sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e salvar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
