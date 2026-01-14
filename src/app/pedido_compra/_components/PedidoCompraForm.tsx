"use client"

import type React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronsUpDown, MapPin, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/ui/pageLayout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

type Mode = "create" | "edit"

type PedidoCategoria = "MADEIRA" | "TELHA" | "ANDAIME" | "ANDAIMES" | "MATERIAIS"
type PedidoStatus =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "EM_COMPRA"
  | "AGUARDANDO_PAGAMENTO"
  | "AGUARDANDO_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO"

type FornecedorOption = { id: number; nome: string }

type OrderItem = {
  id?: number
  clientId: string
  descricao: string
  quantidade: number
  precoUnitario: number
  total: number
  tamanho?: number | null
}

type DeliveryAddress = {
  nomeReceptor: string
  telefoneReceptor: string
  enderecoEntrega: string
  linkMaps: string
}

type FormData = {
  obraId: string
  categoria: PedidoCategoria | ""
  fornecedorId: string
  descricao: string
  valorOrcado: string
  valorRealizado: string
  dataEntrega: string
  status: PedidoStatus
  frete: string
  observacoes: string
}

type PedidoCompraDetalhadoSnake = {
  id: number
  obra_id: number
  categoria: PedidoCategoria
  status: PedidoStatus
  valor_orcado: string | null
  valor_realizado: string | null
  frete: string | null
  descricao: string | null
  observacoes: string | null
  fornecedor_id: number | null
  data_entrega: string | null
  endereco_entrega: string | null
  nome_receptor: string | null
  telefone_receptor: string | null
  link_maps: string | null
  fornecedor: { id: number; nome: string; tipo: string | null } | null
  itens: Array<{
    id: number
    pedido_compra_id: number
    descricao: string
    quantidade: string
    tamanho: string | null
    preco_unitario: string
    total: string
  }>
}

type ObraSearchItem = {
  id: number
  titulo: string | null
  nomeReceptor: string | null
  telefoneReceptor: string | null
  enderecoEntrega: string | null
  linkMaps: string | null
}

function asNumber(v: string) {
  const n = Number(String(v ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function asNumberOrNull(v: string) {
  const raw = String(v ?? "").trim()
  if (!raw) return null
  const n = Number(raw.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function money(n: number) {
  if (!Number.isFinite(n)) return "0.00"
  return n.toFixed(2)
}

const statusLabels: Record<PedidoStatus, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  EM_COMPRA: "Em Compra",
  AGUARDANDO_PAGAMENTO: "Aguardando Pagamento",
  AGUARDANDO_ENTREGA: "Aguardando Entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
}

const statusBadgeClass = (s: PedidoStatus) => {
  if (s === "ENTREGUE") return "border-green-500/20 bg-green-500/10 text-green-700"
  if (s === "APROVADO") return "border-blue-500/20 bg-blue-500/10 text-blue-700"
  if (s === "CANCELADO") return "border-red-500/20 bg-red-500/10 text-red-700"
  return "border-yellow-500/20 bg-yellow-500/10 text-yellow-700"
}

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

type Props = {
  mode: Mode
  pedidoCompraId?: number
  initialData?: PedidoCompraDetalhadoSnake | null
  initialFornecedores?: FornecedorOption[]
}

export default function PedidoCompraForm({ mode, pedidoCompraId, initialData, initialFornecedores }: Props) {
  const router = useRouter()

  const [saving, setSaving] = useState(false)

  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>(() => initialFornecedores ?? [])

  const [formData, setFormData] = useState<FormData>({
    obraId: "",
    categoria: "",
    fornecedorId: "",
    descricao: "",
    valorOrcado: "",
    valorRealizado: "",
    dataEntrega: "",
    status: "RASCUNHO",
    frete: "0",
    observacoes: "",
  })

  const [items, setItems] = useState<OrderItem[]>([])

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    nomeReceptor: "",
    telefoneReceptor: "",
    enderecoEntrega: "",
    linkMaps: "",
  })

  const [obraOpen, setObraOpen] = useState(false)
  const [obraQuery, setObraQuery] = useState("")
  const [obraLoading, setObraLoading] = useState(false)
  const [obraOptions, setObraOptions] = useState<ObraSearchItem[]>([])
  const [obraSelected, setObraSelected] = useState<ObraSearchItem | null>(null)

  useEffect(() => {
    setFornecedores(initialFornecedores ?? [])
  }, [initialFornecedores])

  useEffect(() => {
    if (mode !== "edit") return
    if (!initialData) return

    setFormData({
      obraId: String(initialData.obra_id ?? ""),
      categoria: (initialData.categoria ?? "") as any,
      fornecedorId: initialData.fornecedor_id ? String(initialData.fornecedor_id) : "",
      descricao: initialData.descricao ?? "",
      valorOrcado: initialData.valor_orcado == null ? "" : String(initialData.valor_orcado),
      valorRealizado: initialData.valor_realizado == null ? "" : String(initialData.valor_realizado),
      dataEntrega: initialData.data_entrega ? String(initialData.data_entrega).slice(0, 10) : "",
      status: (initialData.status ?? "RASCUNHO") as any,
      frete: initialData.frete == null ? "0" : String(initialData.frete),
      observacoes: initialData.observacoes ?? "",
    })

    setDeliveryAddress({
      nomeReceptor: initialData.nome_receptor ?? "",
      telefoneReceptor: initialData.telefone_receptor ?? "",
      enderecoEntrega: initialData.endereco_entrega ?? "",
      linkMaps: initialData.link_maps ?? "",
    })

    setItems(
      (initialData.itens ?? []).map((i) => ({
        id: i.id,
        clientId: `db-${i.id}`,
        descricao: i.descricao ?? "",
        quantidade: Number(i.quantidade ?? 0),
        precoUnitario: Number(i.preco_unitario ?? 0),
        total: Number(i.total ?? 0),
        tamanho: i.tamanho == null ? null : Number(i.tamanho),
      }))
    )

    setObraSelected({
      id: Number(initialData.obra_id),
      titulo: null,
      nomeReceptor: initialData.nome_receptor ?? null,
      telefoneReceptor: initialData.telefone_receptor ?? null,
      enderecoEntrega: initialData.endereco_entrega ?? null,
      linkMaps: initialData.link_maps ?? null,
    })
  }, [mode, initialData])

  const isMadeira = formData.categoria === "MADEIRA"

  const subtotal = useMemo(() => {
    const itensTotal = items.reduce((sum, it) => sum + (Number.isFinite(it.total) ? it.total : 0), 0)
    const frete = asNumber(formData.frete)
    return itensTotal + frete
  }, [items, formData.frete])

  const headerTitle = useMemo(() => {
    if (mode === "create") return "Criar Pedido de Compra"
    return pedidoCompraId ? `#PC-${pedidoCompraId}` : "Editar Pedido de Compra"
  }, [mode, pedidoCompraId])

  useEffect(() => {
    if (mode === "edit") return
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
  }, [obraOpen, obraQuery, mode])

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
        if (field === "quantidade" || field === "precoUnitario") {
          const q = Number(next.quantidade ?? 0)
          const p = Number(next.precoUnitario ?? 0)
          next.total = q * p
        }
        return next
      })
    )
  }

  function removeItem(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

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

      const isEdit = mode === "edit"
      const url = isEdit ? `/api/pedido_compra/edit/${pedidoCompraId}` : "/api/pedido_compra/cadastrar"
      const method = isEdit ? "PUT" : "POST"

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

      toast.success(isEdit ? "Pedido atualizado" : "Pedido cadastrado")

      if (!isEdit && savedId) {
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

  const pageTitle = mode === "create" ? "Criar Pedido de Compra" : "Editar Pedido de Compra"

  return (
    <PageLayout
      title={pageTitle}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/pedido_compra">Voltar</Link>
          </Button>
          <Button type="submit" form="pedido-compra-form" disabled={saving} className="gap-2">
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      }
      isTitulo
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/pedido_compra">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-mono text-2xl font-semibold">{headerTitle}</h1>
              <p className="text-sm text-muted-foreground">{pageTitle}</p>
            </div>
          </div>

          <Badge variant="outline" className={statusBadgeClass(formData.status)}>
            {statusLabels[formData.status]}
          </Badge>
        </div>

        <form id="pedido-compra-form" onSubmit={onSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Obra</Label>

                  <Popover open={obraOpen} onOpenChange={setObraOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="secondary" className="w-full justify-between" disabled={mode === "edit"}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData((p) => ({ ...p, categoria: v as PedidoCategoria }))}>
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição do Pedido</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Telhas cerâmicas - 100 unidades"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Select
                    value={formData.fornecedorId || "none"}
                    onValueChange={(v) => setFormData((p) => ({ ...p, fornecedorId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger id="fornecedor">
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status do Pedido</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v as PedidoStatus }))}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="APROVADO">Aprovado</SelectItem>
                      <SelectItem value="EM_COMPRA">Em Compra</SelectItem>
                      <SelectItem value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</SelectItem>
                      <SelectItem value="AGUARDANDO_ENTREGA">Aguardando Entrega</SelectItem>
                      <SelectItem value="ENTREGUE">Entregue</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="valorOrcado">Valor Previsto (R$)</Label>
                  <Input
                    id="valorOrcado"
                    type="number"
                    step="0.01"
                    value={formData.valorOrcado}
                    onChange={(e) => setFormData((p) => ({ ...p, valorOrcado: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorRealizado">Valor Realizado (R$)</Label>
                  <Input
                    id="valorRealizado"
                    type="number"
                    step="0.01"
                    value={formData.valorRealizado}
                    onChange={(e) => setFormData((p) => ({ ...p, valorRealizado: e.target.value }))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">Deixe vazio se ainda não foi realizado</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataEntrega">Data de Entrega</Label>
                  <Input id="dataEntrega" type="date" value={formData.dataEntrega} onChange={(e) => setFormData((p) => ({ ...p, dataEntrega: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frete">Frete (R$)</Label>
                  <Input
                    id="frete"
                    type="number"
                    step="0.01"
                    value={formData.frete}
                    onChange={(e) => setFormData((p) => ({ ...p, frete: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Adicione observações sobre o pedido..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Itens do Pedido</h2>
              <Button type="button" onClick={addItem} size="sm" className="gap-2">
                <Plus className="size-4" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda</p>
                  <Button type="button" onClick={addItem} size="sm" variant="outline" className="mt-2 bg-transparent">
                    Adicionar primeiro item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.clientId} className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.clientId)} className="size-8">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-12">
                        <div className={isMadeira ? "md:col-span-4" : "md:col-span-5"}>
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            value={item.descricao}
                            onChange={(e) => updateItem(item.clientId, "descricao", e.target.value)}
                            placeholder="Ex: Telha romana marfim resinada"
                            className="mt-1"
                          />
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
                              onChange={(e) => updateItem(item.clientId, "tamanho", e.target.value === "" ? null : Number(e.target.value))}
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
                            R$ {money(item.total)}
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
                  <div className="font-mono text-2xl font-semibold">R$ {money(subtotal)}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="size-5" />
              Endereço de Entrega
            </h2>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nomeReceptor">Nome do Cliente</Label>
                  <Input
                    id="nomeReceptor"
                    value={deliveryAddress.nomeReceptor}
                    onChange={(e) => setDeliveryAddress((p) => ({ ...p, nomeReceptor: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefoneReceptor">Telefone</Label>
                  <Input
                    id="telefoneReceptor"
                    value={deliveryAddress.telefoneReceptor}
                    onChange={(e) => setDeliveryAddress((p) => ({ ...p, telefoneReceptor: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enderecoEntrega">Endereço Completo</Label>
                <Textarea
                  id="enderecoEntrega"
                  value={deliveryAddress.enderecoEntrega}
                  onChange={(e) => setDeliveryAddress((p) => ({ ...p, enderecoEntrega: e.target.value }))}
                  placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkMaps">Link do Google Maps</Label>
                <Input
                  id="linkMaps"
                  value={deliveryAddress.linkMaps}
                  onChange={(e) => setDeliveryAddress((p) => ({ ...p, linkMaps: e.target.value }))}
                  placeholder="https://maps.google.com/?q=..."
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
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/pedido_compra">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}