"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, ChevronsUpDown, Edit, ExternalLink, MapPin, MoreVertical, Plus, Save, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

import { ComboboxAdd, type ComboItem } from "@/components/ui/comboboxAdd"


// Shared utilities
import {
  formatMoney,
  formatMoneyCompact,
  asNumber,
  asNumberOrNull,
  normalizeStatus as normalizeStatusUtil,
  normalizeCategoria as normalizeCategoriaUtil,
  formatPedidoId
} from "@/lib/pedido-compra-utils"
import { StatusBadge } from "@/components/pedido-compra/StatusBadge"
import { statusConfig, statusList } from "@/lib/pedido-compra-theme"
import type {
  PedidoCategoria,
  PedidoStatus,
  FornecedorOption,
  FornecedorItem,
  MaterialDTO,
  MateriaisByTipo,
  OrderItem,
  DeliveryAddress,
  PedidoFormData,
  PedidoCompraDetalhadoSnake,
  ObraSearchItem
} from "@/types/pedido-compra"

type Mode = "create" | "edit" | "view"
type FormData = PedidoFormData

function ObraOptionLabelTop(o: ObraSearchItem) {
  const t = (o.titulo ?? "").trim()
  return t ? `#${o.id} — ${t}` : `#${o.id}`
}

function ObraOptionLabelBottom(o: ObraSearchItem) {
  const nome = (o.nomeReceptor ?? "").trim()
  const tel = (o.telefoneReceptor ?? "").trim()
  const parts = [nome, tel].filter(Boolean)
  return parts.length ? parts.join(" • ") : "Sem dados do cliente"
}

// Local aliases for imported utilities
const normalizeCategoria = normalizeCategoriaUtil
const normalizeStatus = normalizeStatusUtil

function normTipo(v: string | null | undefined) {
  return (v ?? "").trim().toUpperCase()
}

function categoriaToTipos(categoria: string) {
  const c = normTipo(categoria)
  if (!c) return null
  if (c === "ANDAIMES" || c === "ANDAIME") return ["ANDAIME", "ANDAIMES"]
  return [c]
}

function categoriaToKey(categoria: PedidoCategoria | ""): keyof MateriaisByTipo | null {
  const c = String(categoria ?? "").trim().toUpperCase()
  if (c === "MADEIRA") return "madeira"
  if (c === "TELHA") return "telha"
  if (c === "MATERIAIS") return "geral"
  if (c === "ANDAIMES" || c === "ANDAIME") return "andaime"
  return null
}

function materialLabel(m: MaterialDTO) {
  const desc = (m.descricao ?? "").trim()
  const un = (m.unidade_de_medida ?? "un").trim() || "un"
  const p = Number.isFinite(m.preco_unitario) ? formatMoneyCompact(m.preco_unitario) : "0.00"
  return `${desc} • ${un} • R$ ${p}`
}

function buildComboItems(list: MaterialDTO[]): ComboItem[] {
  return (list ?? [])
    .filter((m) => Number.isFinite(m.id) && m.id > 0 && String(m.descricao ?? "").trim() !== "")
    .map((m) => ({ value: String(m.id), label: materialLabel(m) }))
}

type Props = {
  mode: Mode
  pedidoCompraId?: number
  initialData?: PedidoCompraDetalhadoSnake | null
  initialFornecedores?: FornecedorOption[]
  initialMateriaisByTipo?: MateriaisByTipo
}

const emptyMateriaisByTipo: MateriaisByTipo = { madeira: [], telha: [], geral: [], andaime: [] }

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
  <div className={`space-y-1 ${className}`}>
    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    <div className={`min-h-[24px] py-1.5 ${highlight
      ? "text-base font-semibold text-foreground"
      : "text-sm text-foreground"
      }`}>
      {value || <span className="text-muted-foreground">—</span>}
    </div>
  </div>
)

export default function PedidoCompraForm({
  mode,
  pedidoCompraId,
  initialData,
  initialFornecedores,
  initialMateriaisByTipo,
}: Props) {
  const router = useRouter()

  const isView = mode === "view"
  const isEdit = mode === "edit"
  const isCreate = mode === "create"

  const [saving, setSaving] = useState(false)

  const [fornecedoresRaw, setFornecedoresRaw] = useState<FornecedorItem[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>(() => initialFornecedores ?? [])

  const [materiaisByTipo, setMateriaisByTipo] = useState<MateriaisByTipo>(
    () => initialMateriaisByTipo ?? emptyMateriaisByTipo
  )

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
          observacoes: ""
        } satisfies FormData,
        deliveryAddress: {
          nomeReceptor: "",
          telefoneReceptor: "",
          enderecoEntrega: "",
          linkMaps: ""
        } satisfies DeliveryAddress,
        items: [] as OrderItem[],
        obraSelected: null as ObraSearchItem | null
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
        dataEntrega: initialData.data_entrega ? String(initialData.data_entrega).slice(0, 10) : "",
        status: statusNorm,
        frete: initialData.frete == null ? "0" : String(initialData.frete),
        observacoes: initialData.observacoes ?? "",
      } satisfies FormData,
      deliveryAddress: {
        nomeReceptor: initialData.nome_receptor ?? "",
        telefoneReceptor: initialData.telefone_receptor ?? "",
        enderecoEntrega: initialData.endereco_entrega ?? "",
        linkMaps: initialData.link_maps ?? "",
      } satisfies DeliveryAddress,
      items: (initialData.itens ?? []).map((i) => ({
        id: i.id,
        clientId: `db-${i.id}`,
        descricao: i.descricao ?? "",
        quantidade: Number(i.quantidade ?? 0),
        precoUnitario: Number(i.preco_unitario ?? 0),
        total: Number(i.total ?? 0),
        tamanho: i.tamanho == null ? null : Number(i.tamanho),
      })) as OrderItem[],
      obraSelected: {
        id: Number(initialData.obra_id),
        titulo: initialData.obra?.titulo ?? null,
        nomeReceptor: initialData.nome_receptor ?? null,
        telefoneReceptor: initialData.telefone_receptor ?? null,
        enderecoEntrega: initialData.endereco_entrega ?? null,
        linkMaps: initialData.link_maps ?? null,
      } as ObraSearchItem | null
    }
  }, [mode, initialData])

  const [formData, setFormData] = useState<FormData>(initialState.formData)
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialState.deliveryAddress)
  const [items, setItems] = useState<OrderItem[]>(initialState.items)
  const [obraSelected, setObraSelected] = useState<ObraSearchItem | null>(initialState.obraSelected)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [obraOpen, setObraOpen] = useState(false)
  const [obraQuery, setObraQuery] = useState("")
  const [obraLoading, setObraLoading] = useState(false)
  const [obraOptions, setObraOptions] = useState<ObraSearchItem[]>([])

  // Dirty check
  const isDirty = useMemo(() => {
    if (mode === "view") return false

    // Compare current with initial state
    const current = JSON.stringify({
      formData,
      deliveryAddress,
      items: items.map(i => ({ ...i, total: i.total })),
      obraSelected
    })

    const initial = JSON.stringify({
      formData: initialState.formData,
      deliveryAddress: initialState.deliveryAddress,
      items: initialState.items,
      obraSelected: initialState.obraSelected
    })

    return current !== initial
  }, [formData, deliveryAddress, items, obraSelected, initialState, mode])

  // Prevent accidental close/refresh
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const [showExitAlert, setShowExitAlert] = useState(false)

  const goBack = useCallback(() => {
    router.push("/pedido_compra")
  }, [router])

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowExitAlert(true)
    } else {
      goBack()
    }
  }, [isDirty, goBack])

  const confirmExit = () => {
    setShowExitAlert(false)
    goBack()
  }

  useEffect(() => {
    setFornecedores(initialFornecedores ?? [])
  }, [initialFornecedores])

  useEffect(() => {
    setMateriaisByTipo(initialMateriaisByTipo ?? emptyMateriaisByTipo)
  }, [initialMateriaisByTipo])

  useEffect(() => {
    let canceled = false
    const load = async () => {
      try {
        const res = await fetch("/api/fornecedores", { cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = body?.error || body?.message || "Falha ao listar fornecedores"
          throw new Error(msg)
        }

        const arr: any[] = Array.isArray(body) ? body : []

        const rawMapped: FornecedorItem[] = arr
          .map((x) => ({
            id: Number(x?.id),
            nome: String(x?.nome ?? ""),
            tipo: x?.tipo == null ? null : String(x.tipo),
          }))
          .filter((x) => Number.isFinite(x.id) && x.id > 0 && x.nome.trim() !== "")

        if (canceled) return
        setFornecedoresRaw(rawMapped)

        const mapped: FornecedorOption[] = rawMapped.map((x) => ({ id: x.id, nome: x.nome }))
        setFornecedores(mapped)
      } catch {
        if (!canceled) {
          setFornecedoresRaw([])
          setFornecedores([])
        }
      }
    }
    load()
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    if (!formData.categoria) return
    setFormData((p) => ({ ...p, fornecedorId: "" }))
    // Clear items when category changes (pricing will be different)
    if (isCreate) setItems([])
  }, [formData.categoria])

  // Clear items when supplier changes for MADEIRA (different price list)
  const prevFornecedorRef = useRef(formData.fornecedorId)
  useEffect(() => {
    if (formData.categoria !== "MADEIRA") return
    if (prevFornecedorRef.current === formData.fornecedorId) return
    prevFornecedorRef.current = formData.fornecedorId
    if (isCreate) setItems([])
  }, [formData.fornecedorId, formData.categoria, isCreate])

  const fornecedoresFiltrados = useMemo(() => {
    const allowed = categoriaToTipos(String(formData.categoria))
    if (!allowed) return fornecedoresRaw
    const setAllowed = new Set(allowed.map((x) => normTipo(x)))
    return fornecedoresRaw.filter((f) => setAllowed.has(normTipo(f.tipo)))
  }, [fornecedoresRaw, formData.categoria])

  const isMadeira = formData.categoria === "MADEIRA"

  const subtotal = useMemo(() => {
    const itensTotal = items.reduce((sum, it) => sum + (Number.isFinite(it.total) ? it.total : 0), 0)
    const frete = asNumber(formData.frete)
    return itensTotal + frete
  }, [items, formData.frete])

  const headerTitle = useMemo(() => {
    if (isCreate) return "Criar Pedido de Compra"
    const obraLabel = obraSelected ? ObraOptionLabelTop(obraSelected) : formData.obraId ? `#${formData.obraId}` : ""
    if (pedidoCompraId) return obraLabel ? `#${formatPedidoId(pedidoCompraId, formData.obraId)} — ${obraLabel}` : `#${formatPedidoId(pedidoCompraId, formData.obraId)}`
    return isView ? "Visualizar Pedido de Compra" : "Editar Pedido de Compra"
  }, [isCreate, isView, pedidoCompraId, obraSelected, formData.obraId])

  useEffect(() => {
    if (!isCreate) return
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
        if (!res.ok) {
          const msg = body?.error || body?.message || "Falha ao pesquisar obras"
          throw new Error(msg)
        }

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
    }, 500)

    return () => {
      canceled = true
      clearTimeout(t)
    }
  }, [obraOpen, obraQuery, isCreate])

  function selectObra(o: ObraSearchItem) {
    setObraSelected(o)
    setFormData((p) => ({ ...p, obraId: String(o.id) }))

    setDeliveryAddress({
      nomeReceptor: (o.nomeReceptor ?? "").trim(),
      telefoneReceptor: (o.telefoneReceptor ?? "").trim(),
      enderecoEntrega: (o.enderecoEntrega ?? "").trim(),
      linkMaps: (o.linkMaps ?? "").trim(),
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
    }
    setItems((prev) => [...prev, newItem])
  }

  function updateItem(clientId: string, field: keyof OrderItem, value: string | number | null) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.clientId !== clientId) return it
        const next = { ...it, [field]: value } as OrderItem

        const q = Number(next.quantidade ?? 0)
        const p = Number(next.precoUnitario ?? 0)
        const tVal = Number(next.tamanho)

        // Wood calculation: Quantity * Price * Size
        if (
          formData.categoria === "MADEIRA" &&
          Number.isFinite(tVal) &&
          tVal > 0
        ) {
          next.total = q * p * tVal
        } else {
          next.total = q * p
        }

        return next
      })
    )
  }

  function removeItem(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId))
  }

  const hasFornecedorSelected = Boolean(
    formData.fornecedorId && Number.isFinite(Number(formData.fornecedorId)) && Number(formData.fornecedorId) > 0
  )

  // For MADEIRA: require supplier to show materials. Other categories: show all.
  const needsSupplierForItems = formData.categoria === "MADEIRA"
  const itemSelectionDisabled = !formData.categoria || (needsSupplierForItems && !hasFornecedorSelected)

  const materiaisFiltradosParaCategoria = useMemo(() => {
    const key = categoriaToKey(formData.categoria)
    if (!key) return [] as MaterialDTO[]

    // MADEIRA requires supplier selection
    if (formData.categoria === "MADEIRA" && !hasFornecedorSelected) return [] as MaterialDTO[]

    const base = materiaisByTipo[key] ?? []
    const fornIdNum = Number(formData.fornecedorId)

    if (!hasFornecedorSelected) return base
    return base.filter((m) => m.fornecedorId == null || m.fornecedorId === fornIdNum)
  }, [materiaisByTipo, formData.categoria, formData.fornecedorId, hasFornecedorSelected])

  const comboItemsMateriais = useMemo(() => buildComboItems(materiaisFiltradosParaCategoria), [materiaisFiltradosParaCategoria])

  function getComboLabelForDescricao(descricao: string) {
    const d = (descricao ?? "").trim()
    if (!d) return "Selecione"
    return d
  }

  function onSelectMaterialForItem(clientId: string, materialIdValue: string) {
    if (materialIdValue === "vazio") return

    const materialId = Number(materialIdValue)
    if (!Number.isFinite(materialId) || materialId <= 0) return

    const m = materiaisFiltradosParaCategoria.find((x) => x.id === materialId)
    if (!m) return

    setItems((prev) =>
      prev.map((it) => {
        if (it.clientId !== clientId) return it

        const next: OrderItem = { ...it }

        next.descricao = String(m.descricao ?? "").trim()
        next.precoUnitario = Number(m.preco_unitario ?? 0)

        const q = Number(next.quantidade ?? 0)
        if (!Number.isFinite(q) || q <= 0) next.quantidade = 1

        const p = Number(next.precoUnitario ?? 0)
        const tVal = Number(next.tamanho)

        if (
          formData.categoria === "MADEIRA" &&
          Number.isFinite(tVal) &&
          tVal > 0
        ) {
          next.total = Number(next.quantidade ?? 0) * p * tVal
        } else {
          next.total = Number(next.quantidade ?? 0) * p
        }

        return next
      })
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
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

        data_entrega: formData.dataEntrega ? formData.dataEntrega : null,
        nome_receptor: deliveryAddress.nomeReceptor?.trim() || null,
        telefone_receptor: deliveryAddress.telefoneReceptor?.trim() || null,
        endereco_entrega: deliveryAddress.enderecoEntrega?.trim() || null,
        link_maps: deliveryAddress.linkMaps?.trim() || null,

        itens: items.map((it) => ({
          id: it.id ?? null,
          descricao: it.descricao ?? "",
          quantidade: Number(it.quantidade ?? 0),
          preco_unitario: Number(it.precoUnitario ?? 0),
          total: Number(it.total ?? 0),
          tamanho: formData.categoria === "MADEIRA" ? (it.tamanho == null ? null : Number(it.tamanho)) : null,
        })),
      }

      const isEditMode = isEdit
      const url = isEditMode ? `/api/pedido_compra/editar/${pedidoCompraId}` : "/api/pedido_compra/cadastrar"
      const method = isEditMode ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = body?.error || body?.message || "Falha ao salvar"
        throw new Error(msg)
      }

      const savedId = body?.data?.id ?? body?.data?.pedidoCompraId ?? body?.id ?? pedidoCompraId

      toast.success(isEditMode ? "Pedido atualizado" : "Pedido cadastrado")

      if (!isEditMode && savedId) {
        router.replace(`/pedido_compra/edit/${savedId}`)
        router.refresh()
        return
      }

      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar pedido")
    } finally {
      setSaving(false)
    }
  }

  const pageTitle = isCreate ? "Criar Pedido de Compra" : isView ? "Visualizar Pedido de Compra" : "Editar Pedido de Compra"
  const cardPadding = isView ? "p-4" : "p-6"
  const formSpacing = isView ? "space-y-4" : "space-y-6"

  const resolvedPedidoId = Number(pedidoCompraId ?? initialData?.id ?? 0)

  async function patchPedidoStatus(pedidoId: number, status: PedidoStatus) {
    const res = await fetch(`/api/pedido_compra/status/${pedidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao atualizar status")
    return body?.data
  }

  async function deletePedido(pedidoId: number) {
    const res = await fetch(`/api/pedido_compra/excluir/${pedidoId}`, { method: "DELETE" })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.error || body?.message || "Falha ao excluir pedido")
    return body?.data
  }



  const handleExcluirPedido = async () => {
    if (!resolvedPedidoId || !Number.isFinite(resolvedPedidoId)) return

    try {
      await deletePedido(resolvedPedidoId)
      toast.success("Pedido excluido")
      router.push("/pedido_compra")
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao excluir pedido")
    }
  }

  return (
    <PageLayout
      title={
        isCreate
          ? "Criar Pedido de Compra"
          : `${isView ? "Visualizar" : "Editar"} #${formatPedidoId(resolvedPedidoId, formData.obraId)}`
      }
      links={[
        { label: "Home", href: "/" },
        { label: "Pedidos de Compra", href: "/pedido_compra" },
      ]}
      headerActions={
        isView ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => resolvedPedidoId > 0 && router.push(`/pedido_compra/edit/${resolvedPedidoId}`)}
              disabled={resolvedPedidoId <= 0}
              className="gap-2"
            >
              <Edit className="size-4" />
              Editar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => setDeleteDialogOpen(true)}
                  disabled={resolvedPedidoId <= 0}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                  <AlertDialogAction
                    onClick={handleExcluirPedido}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={handleBack} className="gap-2">
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              form="pedido-compra-form"
              disabled={saving}
              className="gap-2 bg-[#2c201b] hover:bg-[#2c201b]/90 text-white"
            >
              <Save className="size-4" />
              {saving ? "Salvando..." : isCreate ? "Cadastrar" : "Salvar"}
            </Button>
          </div>
        )
      }
      isTitulo
    >
      <div className="mx-auto w-full max-w-6xl">

        <form id="pedido-compra-form" onSubmit={onSubmit} className={formSpacing}>
          <Card className={cardPadding}>
            <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField
                      label="Obra"
                      value={
                        (obraSelected || formData.obraId) ? (
                          <Link
                            href={`/obras/${obraSelected?.id || formData.obraId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                          >
                            {obraSelected ? ObraOptionLabelTop(obraSelected) : String(formData.obraId)}
                            <ExternalLink className="size-3.5" />
                          </Link>
                        ) : (
                          "-"
                        )
                      }
                    />
                  ) : (
                    <>
                      <Label>Obra</Label>
                      <Popover open={obraOpen} onOpenChange={setObraOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full justify-between"
                            disabled={false}
                          >
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
                                    {obraOptions.map((o) => {
                                      const selected = String(o.id) === String(formData.obraId)
                                      return (
                                        <CommandItem
                                          key={o.id}
                                          value={String(o.id)}
                                          onSelect={() => selectObra(o)}
                                          className="flex items-start gap-2"
                                        >
                                          <div className="mt-0.5 flex size-5 items-center justify-center">
                                            {selected ? <Check className="size-4" /> : null}
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">{ObraOptionLabelTop(o)}</div>
                                            <div className="truncate text-xs text-muted-foreground">{ObraOptionLabelBottom(o)}</div>
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
                        Ao selecionar a obra, o sistema sugere os dados de entrega. Você pode editar tudo depois.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField
                      label="Categoria"
                      value={
                        formData.categoria
                          ? formData.categoria.charAt(0).toUpperCase() + formData.categoria.slice(1).toLowerCase()
                          : "-"
                      }
                    />
                  ) : (
                    <>
                      <Label htmlFor="categoria">Categoria</Label>
                      <Select
                        key={`cat-${String(formData.categoria)}`}
                        value={formData.categoria}
                        onValueChange={(v) => setFormData((p) => ({ ...p, categoria: v as PedidoCategoria }))}
                        disabled={isView}
                      >
                        <SelectTrigger id="categoria">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MADEIRA">Madeira</SelectItem>
                          <SelectItem value="TELHA">Telha</SelectItem>
                          <SelectItem value="ANDAIMES">Andaimes</SelectItem>
                          <SelectItem value="MATERIAIS">Materiais</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {isView ? (
                  <ReadOnlyField label="Descrição do Pedido" value={formData.descricao} className="col-span-full" />
                ) : (
                  <>
                    <Label htmlFor="descricao">Descrição do Pedido</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Ex: Telhas cerâmicas - 100 unidades"
                      rows={3}
                      disabled={isView}
                    />
                  </>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField
                      label="Fornecedor"
                      value={initialData?.fornecedor?.nome ?? fornecedores.find((f) => String(f.id) === String(formData.fornecedorId))?.nome}
                    />
                  ) : (
                    <>
                      <Label htmlFor="fornecedor">Fornecedor</Label>
                      <Select
                        key={`forn-${String(formData.fornecedorId)}-${fornecedoresFiltrados.length}`}
                        value={formData.fornecedorId || "none"}
                        onValueChange={(v) => setFormData((p) => ({ ...p, fornecedorId: v === "none" ? "" : v }))}
                        disabled={isView}
                      >
                        <SelectTrigger id="fornecedor">
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {fornecedoresFiltrados.map((f) => (
                            <SelectItem key={f.id} value={String(f.id)}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField label="Status do Pedido" value={<StatusBadge status={formData.status} />} />
                  ) : (
                    <>
                      <Label htmlFor="status">Status do Pedido</Label>
                      <Select
                        key={`st-${String(formData.status)}`}
                        value={formData.status}
                        onValueChange={(v) => setFormData((p) => ({ ...p, status: v as PedidoStatus }))}
                        disabled={isView}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                          <SelectItem value="APROVADO">Aprovado</SelectItem>
                          <SelectItem value="EM_COMPRA">Em Compra</SelectItem>
                          <SelectItem value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</SelectItem>
                          <SelectItem value="AGUARDANDO_ENTREGA">Aguardando Entrega</SelectItem>
                          <SelectItem value="ENTREGUE">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField
                      label="Valor Previsto (R$)"
                      value={formData.valorOrcado ? formatMoney(Number(formData.valorOrcado)) : undefined}
                      highlight
                    />
                  ) : (
                    <>
                      <Label htmlFor="valorOrcado">Valor Previsto (R$)</Label>
                      <Input
                        id="valorOrcado"
                        type="number"
                        step="0.01"
                        value={formData.valorOrcado}
                        onChange={(e) => setFormData((p) => ({ ...p, valorOrcado: e.target.value }))}
                        placeholder="0,00"
                        disabled={isView}
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField
                      label="Valor Realizado (R$)"
                      value={formData.valorRealizado ? formatMoney(Number(formData.valorRealizado)) : undefined}
                      highlight
                    />
                  ) : (
                    <>
                      <Label htmlFor="valorRealizado">Valor Realizado (R$)</Label>
                      <Input
                        id="valorRealizado"
                        type="number"
                        step="0.01"
                        value={formData.valorRealizado}
                        onChange={(e) => setFormData((p) => ({ ...p, valorRealizado: e.target.value }))}
                        placeholder="0,00"
                        disabled={isView}
                      />
                      <p className="text-xs text-muted-foreground">Deixe vazio se ainda não foi realizado</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField label="Data de Entrega" value={
                      formData.dataEntrega
                        ? new Date(formData.dataEntrega + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                        : undefined
                    } />
                  ) : (
                    <>
                      <Label htmlFor="dataEntrega">Data de Entrega</Label>
                      <Input
                        id="dataEntrega"
                        type="date"
                        value={formData.dataEntrega}
                        onChange={(e) => setFormData((p) => ({ ...p, dataEntrega: e.target.value }))}
                        disabled={isView}
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField label="Frete (R$)" value={formData.frete ? formatMoney(Number(formData.frete)) : undefined} highlight />
                  ) : (
                    <>
                      <Label htmlFor="frete">Frete (R$)</Label>
                      <Input
                        id="frete"
                        type="number"
                        step="0.01"
                        value={formData.frete}
                        onChange={(e) => setFormData((p) => ({ ...p, frete: e.target.value }))}
                        placeholder="0,00"
                        disabled={isView}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {isView ? (
                  <ReadOnlyField label="Observações" value={formData.observacoes} />
                ) : (
                  <>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
                      placeholder="Adicione observações sobre o pedido..."
                      rows={3}
                      disabled={isView}
                    />
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className={cardPadding}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Itens do Pedido</h2>
              {!isView && (
                <Button type="button" onClick={addItem} size="sm" className="gap-2" disabled={itemSelectionDisabled}>
                  <Plus className="size-4" />
                  Adicionar Item
                </Button>
              )}
            </div>

            {isView ? (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#FAF3E0] border-b border-[#f5d193]/40">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide w-12">#</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide">Descrição</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide w-20">Qtd</th>
                          {isMadeira && <th className="text-center px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide w-24">Tamanho</th>}
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide w-32">Vlr. Unit.</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#2c201b] tracking-wide w-32">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={item.clientId} className={`border-b border-border/30 last:border-b-0 ${index % 2 === 1 ? "bg-[#FAF3E0]/30" : "bg-background"}`}>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-2.5">
                              <div className="text-sm leading-tight">{item.descricao || "—"}</div>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm">{item.quantidade}</td>
                            {isMadeira && (
                              <td className="px-4 py-2.5 text-center text-sm">
                                {item.tamanho != null && item.tamanho !== 0 ? item.tamanho : "—"}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-right text-sm">{formatMoney(item.precoUnitario)}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-medium">{formatMoney(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end">
                  <div className="rounded-lg border border-[#f5d193]/50 bg-[#FAF3E0]/60 px-5 py-2.5">
                    <div className="text-xs text-muted-foreground">Subtotal (itens + frete)</div>
                    <div className="text-xl font-semibold text-[#2c201b] mt-0.5">{formatMoney(subtotal)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                      {itemSelectionDisabled && needsSupplierForItems ? (
                        <p className="text-sm text-amber-600">Selecione um fornecedor de madeira para adicionar itens.</p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda</p>
                          <Button type="button" onClick={addItem} size="sm" variant="outline" className="mt-2 bg-transparent" disabled={itemSelectionDisabled}>
                            Adicionar primeiro item
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={item.clientId} className="rounded-lg border border-border bg-muted/30 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.clientId)}
                              className="size-8"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-12">
                            <div className={isMadeira ? "md:col-span-4" : "md:col-span-5"}>
                              <Label className="text-xs">Descrição</Label>

                              <div className="mt-1">
                                <ComboboxAdd
                                  key={`desc-${item.clientId}-${comboItemsMateriais.length}-${formData.categoria}-${formData.fornecedorId}`}
                                  buttonText={getComboLabelForDescricao(item.descricao)}
                                  placeholder="Buscar material..."
                                  widthClass="w-full"
                                  disabled={itemSelectionDisabled}
                                  items={comboItemsMateriais}
                                  onSelect={(v) => onSelectMaterialForItem(item.clientId, v)}
                                  showEmptyOption={false}
                                  colorVariant="white-brown"
                                  buttonClassName="h-10 text-sm rounded-md border border-border justify-between"
                                />
                              </div>

                              {!formData.categoria && (
                                <p className="mt-1 text-xs text-muted-foreground">Selecione a categoria para habilitar.</p>
                              )}
                              {formData.categoria === "MADEIRA" && !hasFornecedorSelected && (
                                <p className="mt-1 text-xs text-amber-600">Selecione um fornecedor para ver a lista de preços.</p>
                              )}
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Quantidade</Label>
                              <Input
                                type="number"
                                value={item.quantidade}
                                onChange={(e) => updateItem(item.clientId, "quantidade", Number(e.target.value) || 0)}
                                placeholder="0"
                                className="mt-1"
                              />
                            </div>

                            {isMadeira && (
                              <div className="md:col-span-2">
                                <Label className="text-xs">Tamanho</Label>
                                <Input
                                  type="number"
                                  value={item.tamanho ?? ""}
                                  onChange={(e) =>
                                    updateItem(
                                      item.clientId,
                                      "tamanho",
                                      e.target.value === "" ? null : Number(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="mt-1"
                                />
                              </div>
                            )}

                            <div className="md:col-span-2">
                              <Label className="text-xs">Valor Unitário (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.precoUnitario}
                                onChange={(e) => updateItem(item.clientId, "precoUnitario", Number(e.target.value) || 0)}
                                placeholder="0,00"
                                className="mt-1"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Preço Total</Label>
                              <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background px-3 font-mono text-sm">
                                R$ {formatMoneyCompact(item.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-border bg-muted/50 p-3">
                      <div className="text-sm text-muted-foreground">Subtotal (itens + frete)</div>
                      <div className="font-mono text-2xl font-semibold">R$ {formatMoneyCompact(subtotal)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className={cardPadding}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="size-5" />
              Endereço de Entrega
            </h2>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField label="Nome do Cliente" value={deliveryAddress.nomeReceptor} />
                  ) : (
                    <>
                      <Label htmlFor="nomeReceptor">Nome do Cliente</Label>
                      <Input
                        id="nomeReceptor"
                        value={deliveryAddress.nomeReceptor}
                        onChange={(e) => setDeliveryAddress((p) => ({ ...p, nomeReceptor: e.target.value }))}
                        placeholder="Nome completo"
                        disabled={isView}
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {isView ? (
                    <ReadOnlyField label="Telefone" value={deliveryAddress.telefoneReceptor} />
                  ) : (
                    <>
                      <Label htmlFor="telefoneReceptor">Telefone</Label>
                      <Input
                        id="telefoneReceptor"
                        value={deliveryAddress.telefoneReceptor}
                        onChange={(e) => setDeliveryAddress((p) => ({ ...p, telefoneReceptor: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        disabled={isView}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {isView ? (
                  <ReadOnlyField label="Endereço Completo" value={deliveryAddress.enderecoEntrega} />
                ) : (
                  <>
                    <Label htmlFor="enderecoEntrega">Endereço Completo</Label>
                    <Textarea
                      id="enderecoEntrega"
                      value={deliveryAddress.enderecoEntrega}
                      onChange={(e) => setDeliveryAddress((p) => ({ ...p, enderecoEntrega: e.target.value }))}
                      placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                      rows={2}
                      disabled={isView}
                    />
                  </>
                )}
              </div>

              <div className="space-y-2">
                {isView ? (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Link do Google Maps
                    </span>
                    <div className="min-h-[24px] py-1.5 text-sm text-foreground">
                      {deliveryAddress.linkMaps ? (
                        <a
                          href={deliveryAddress.linkMaps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                        >
                          <MapPin className="size-4" />
                          Abrir no Google Maps
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Label htmlFor="linkMaps">Link do Google Maps</Label>
                    <Input
                      id="linkMaps"
                      value={deliveryAddress.linkMaps}
                      onChange={(e) => setDeliveryAddress((p) => ({ ...p, linkMaps: e.target.value }))}
                      placeholder="https://maps.google.com/?q=..."
                      disabled={isView}
                    />
                    {deliveryAddress.linkMaps && (
                      <a
                        href={deliveryAddress.linkMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <MapPin className="size-3" />
                        Abrir no Google Maps
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>


        </form>
      </div>
      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Se você sair agora, perderá todas as alterações feitas neste formulário. Deseja realmente sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e Salvar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive hover:bg-destructive/90">
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
