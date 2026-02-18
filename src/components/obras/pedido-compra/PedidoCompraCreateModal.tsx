"use client"

import * as React from "react"
import { Loader2, Plus, Trash2, MapPin, Copy } from "lucide-react"
import { toast } from "sonner"
import { formatClientName, formatLocation } from "@/utils/name-formatter"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { type PedidoCompraVM, categoriaLabel } from "./types"

type ItemDraft = {
  clientId: string
  materialId?: string
  descricao: string
  quantidade: number
  precoUnitario: number
  tamanho?: number | null
  componente?: string
}

type FornecedorItem = {
  id: number
  nome: string
  tipo: string | null
}

type MaterialDTO = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number
  unidade_de_medida: string
  fornecedorId: number | null
}

type MateriaisByTipo = {
  madeira: MaterialDTO[]
  telha: MaterialDTO[]
  geral: MaterialDTO[]
  andaime: MaterialDTO[]
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  obraId: number | null
  onCreate: (draft: Partial<PedidoCompraVM>) => void
}

function moneyBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function money(n: number) {
  if (!Number.isFinite(n)) return "0.00"
  return n.toFixed(2)
}

function normTipo(v: string | null | undefined) {
  return (v ?? "").trim().toUpperCase()
}

function categoriaToTipos(categoria: string) {
  const c = normTipo(categoria)
  if (!c || c === "OUTROS") return null
  if (c === "ANDAIMES") return ["ANDAIME", "ANDAIMES"]
  return [c]
}

function categoriaToKey(categoria: string): keyof MateriaisByTipo | null {
  const c = normTipo(categoria)
  if (c === "MADEIRA") return "madeira"
  if (c === "TELHA") return "telha"
  if (c === "MATERIAIS") return "geral"
  if (c === "ANDAIMES" || c === "ANDAIME") return "andaime"
  return null
}

function materialLabel(m: MaterialDTO) {
  const desc = (m.descricao ?? "").trim()
  const un = (m.unidade_de_medida ?? "un").trim() || "un"
  const p = Number.isFinite(m.preco_unitario) ? money(m.preco_unitario) : "0.00"
  return `${desc} • ${un} • R$ ${p}`
}

const emptyMateriaisByTipo: MateriaisByTipo = { madeira: [], telha: [], geral: [], andaime: [] }

export function PedidoCompraCreateModal({ open, onOpenChange, obraId, onCreate }: Props) {
  const [descricao, setDescricao] = React.useState("")
  const [categoria, setCategoria] = React.useState<string>("")
  const [fornecedorId, setFornecedorId] = React.useState<string>("")
  const [fornecedorNome, setFornecedorNome] = React.useState("")
  const [dataEntrega, setDataEntrega] = React.useState<string>("")
  const [frete, setFrete] = React.useState<number>(0)

  const [nomeReceptor, setNomeReceptor] = React.useState("")
  const [telefoneReceptor, setTelefoneReceptor] = React.useState("")
  const [enderecoEntrega, setEnderecoEntrega] = React.useState("")
  const [linkMaps, setLinkMaps] = React.useState("")

  const [items, setItems] = React.useState<ItemDraft[]>([])

  const [fornecedores, setFornecedores] = React.useState<FornecedorItem[]>([])
  const [fornecedoresLoading, setFornecedoresLoading] = React.useState(false)

  const [materiaisByTipo, setMateriaisByTipo] = React.useState<MateriaisByTipo>(emptyMateriaisByTipo)
  const [materiaisLoading, setMateriaisLoading] = React.useState(false)

  const isMadeira = categoria === "MADEIRA"

  const fornecedoresFiltrados = React.useMemo(() => {
    const allowed = categoriaToTipos(categoria)
    if (!allowed) return fornecedores
    const allowedSet = new Set(allowed.map((x) => normTipo(x)))
    return fornecedores.filter((f) => allowedSet.has(normTipo(f.tipo)))
  }, [categoria, fornecedores])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false

    const load = async () => {
      setFornecedoresLoading(true)
      try {
        const res = await fetch("/api/fornecedores", { cache: "no-store" })
        if (!res.ok) throw new Error("Falha ao carregar fornecedores")
        const data = (await res.json()) as FornecedorItem[]
        if (cancelled) return
        setFornecedores(Array.isArray(data) ? data : [])
      } catch {
        if (cancelled) return
        setFornecedores([])
      } finally {
        if (cancelled) return
        setFornecedoresLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadTipo = async (cat: string) => {
      const url = `/api/pedido_compra/materiais?categoria=${encodeURIComponent(cat)}&take=50`
      const res = await fetch(url, { cache: "no-store" })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = body?.error || body?.message || "Falha ao carregar materiais"
        throw new Error(msg)
      }

      const arr: any[] = Array.isArray(body?.data) ? body.data : []
      const mapped: MaterialDTO[] = arr
        .map((m) => ({
          id: Number(m?.id),
          descricao: String(m?.descricao ?? ""),
          tipo: String(m?.tipo ?? ""),
          preco_unitario: Number(m?.preco_unitario ?? 0),
          unidade_de_medida: String(m?.unidade_de_medida ?? "un"),
          fornecedorId: m?.fornecedorId == null ? null : Number(m.fornecedorId),
        }))
        .filter((m) => Number.isFinite(m.id) && m.id > 0 && m.descricao.trim() !== "")

      return mapped
    }

    const loadAll = async () => {
      setMateriaisLoading(true)
      try {
        const [madeira, telha, geral, andaime, comps] = await Promise.all([
          loadTipo("MADEIRA"),
          loadTipo("TELHA"),
          loadTipo("MATERIAIS"),
          loadTipo("ANDAIMES"),
          fetch("/api/componentes").then(r => r.json().catch(() => [])).then(data => Array.isArray(data) ? data : [])
        ])
        if (cancelled) return
        setMateriaisByTipo({ madeira, telha, geral, andaime })
        setComponentesList(comps)
      } catch {
        if (cancelled) return
        setMateriaisByTipo(emptyMateriaisByTipo)
        setComponentesList([])
      } finally {
        if (cancelled) return
        setMateriaisLoading(false)
      }
    }

    loadAll()

    return () => {
      cancelled = true
    }
  }, [open])

  const [componentesList, setComponentesList] = React.useState<Array<{ id: number, nome: string }>>([])

  React.useEffect(() => {
    const idNum = Number(fornecedorId)
    if (!Number.isFinite(idNum)) {
      setFornecedorNome("")
      return
    }
    const f = fornecedores.find((x) => x.id === idNum)
    setFornecedorNome(f?.nome ?? "")
  }, [fornecedorId, fornecedores])

  const [budgetFornecedorId, setBudgetFornecedorId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!open || !obraId) return
    let cancelled = false
    const loadObra = async () => {
      try {
        const res = await fetch(`/api/obras/${obraId}/detalhado`, { cache: "no-store" })
        if (!res.ok) return
        const body = await res.json()
        if (cancelled) return

        const fId = body?.data?.orcamento?.fornecedorId
        if (Number.isFinite(Number(fId))) {
          setBudgetFornecedorId(Number(fId))
        }

        // Auto-fill Client/Address info
        const clientName = body?.data?.cliente?.nome ?? ""
        const clientPhone = body?.data?.cliente?.telefone ?? ""
        const obraAddress = body?.data?.obra?.endereco ?? ""
        const obraMaps = body?.data?.obra?.mapsUrl ?? ""

        if (clientName) setNomeReceptor(clientName)
        if (clientPhone) setTelefoneReceptor(clientPhone)
        if (obraAddress) setEnderecoEntrega(obraAddress)
        if (obraMaps) setLinkMaps(obraMaps)

        // Auto-fill Description
        const clientBairro = body?.data?.cliente?.bairro ?? ""
        const clientCity = body?.data?.cliente?.cidade?.nome ?? ""

        const cName = formatClientName(clientName)
        const cLoc = formatLocation(clientBairro, clientCity)
        const suffix = `${cName} [${cLoc}]`

        // Store suffix in data attribute or state to use when category changes? 
        // Or just update now if category is empty?
        // Actually, we can just update the description right now if it's empty, 
        // but we don't have category yet probably. 
        // Let's store these derived strings in a ref or state if needed, 
        // but simplest is to just set it here if description is empty, 
        // maybe without category prefix yet.

        // Better: Update state so we can use it when category changes
        setClientInfoForTitle({ name: cName, location: cLoc })

      } catch (e) {
        console.error("Erro ao carregar obra", e)
      }
    }
    loadObra()
    return () => { cancelled = true }
  }, [open, obraId])

  // State to hold client info for title generation
  const [clientInfoForTitle, setClientInfoForTitle] = React.useState<{ name: string, location: string } | null>(null)

  // Effect to update description when Category or ClientInfo changes
  React.useEffect(() => {
    if (!clientInfoForTitle) return

    // Only auto-update if description is empty or looks like an auto-generated one (to avoid overwriting user edits)
    // Heuristic: check if it ends with the location suffix
    const suffix = `${clientInfoForTitle.name} [${clientInfoForTitle.location}]`
    const catLabel = categoria ? categoriaLabel(categoria as any) : "Pedido"

    const newDesc = `${catLabel} - ${suffix}`

    // Logic: If description is empty -> set it.
    // If description matches "OldCategory - Suffix" -> update to "NewCategory - Suffix"

    setDescricao(prev => {
      if (!prev) return newDesc
      if (prev.includes(suffix)) return newDesc // simple replace if suffix exists
      return prev
    })
  }, [categoria, clientInfoForTitle])

  React.useEffect(() => {
    // If category is MADEIRA and we have a budget supplier, use it
    if (categoria === "MADEIRA" && budgetFornecedorId) {
      setFornecedorId(String(budgetFornecedorId))
    } else {
      setFornecedorId("")
      setFornecedorNome("")
    }
  }, [categoria, budgetFornecedorId])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        clientId: `${Date.now()}-${Math.random()}`,
        materialId: "",
        descricao: "",
        quantidade: 0,
        precoUnitario: 0,
        tamanho: null,
        componente: "",
      },
    ])
  }

  const removeItem = (clientId: string) => {
    setItems((prev) => prev.filter((x) => x.clientId !== clientId))
  }

  const updateItem = (clientId: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((x) => (x.clientId === clientId ? { ...x, ...patch } : x)))
  }

  const itemTotal = (x: ItemDraft) => {
    const qtd = Number(x.quantidade) || 0
    const preco = Number(x.precoUnitario) || 0
    const size = Number(x.tamanho)

    // Wood calculation: Quantity * Price * Size
    if (isMadeira && Number.isFinite(size) && size > 0) {
      return qtd * preco * size
    }
    return qtd * preco
  }

  const subtotal = React.useMemo(() => {
    const itemsSum = items.reduce((acc, x) => acc + itemTotal(x), 0)
    return itemsSum + (Number(frete) || 0)
  }, [items, frete])

  const hasValidItem = items.some((x) => x.descricao.trim() !== "" && x.quantidade > 0 && x.precoUnitario > 0)

  const reset = () => {
    setDescricao("")
    setCategoria("")
    setFornecedorId("")
    setFornecedorNome("")
    setDataEntrega("")
    setFrete(0)

    setNomeReceptor("")
    setTelefoneReceptor("")
    setEnderecoEntrega("")
    setLinkMaps("")

    setItems([])
    setMateriaisByTipo(emptyMateriaisByTipo)
  }

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) reset()
  }

  const materiaisFiltradosParaCategoria = React.useMemo(() => {
    const key = categoriaToKey(categoria)
    if (!key) return [] as MaterialDTO[]

    const base = materiaisByTipo[key] ?? []
    const fornIdNum = Number(fornecedorId)
    const hasFornecedor = fornecedorId && Number.isFinite(fornIdNum) && fornIdNum > 0

    if (!hasFornecedor) return base
    return base.filter((m) => m.fornecedorId == null || m.fornecedorId === fornIdNum)
  }, [materiaisByTipo, categoria, fornecedorId])

  function onSelectMaterialForItem(clientId: string, materialIdValue: string) {
    const materialId = Number(materialIdValue)
    if (!Number.isFinite(materialId) || materialId <= 0) return

    const m = materiaisFiltradosParaCategoria.find((x) => x.id === materialId)
    if (!m) return

    setItems((prev) =>
      prev.map((it) => {
        if (it.clientId !== clientId) return it

        const next: ItemDraft = { ...it }
        next.materialId = String(m.id)
        next.descricao = String(m.descricao ?? "").trim()
        next.precoUnitario = Number(m.preco_unitario ?? 0)

        const q = Number(next.quantidade ?? 0)
        if (!Number.isFinite(q) || q <= 0) next.quantidade = 1

        return next
      })
    )
  }

  const handleCopyClientInfo = async () => {
    const text = [
      nomeReceptor,
      telefoneReceptor,
      enderecoEntrega,
      linkMaps
    ].filter(Boolean).join("\n")

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

  const handleCreate = () => {
    if (!hasValidItem) return

    const valorOrcado = items.reduce((acc, x) => acc + itemTotal(x), 0) + (Number(frete) || 0)

    onCreate({
      obraId: obraId ?? undefined,
      descricao: descricao.trim() || null,
      categoria: (categoria as any) || null,

      fornecedorId: fornecedorId ? Number(fornecedorId) : null,
      fornecedorNome: fornecedorNome.trim() || null,

      dataEntrega: dataEntrega ? dataEntrega : null,
      frete: Number(frete) || 0,
      valorOrcado,

      nomeReceptor: nomeReceptor.trim() || null,
      telefoneReceptor: telefoneReceptor.trim() || null,
      enderecoEntrega: enderecoEntrega.trim() || null,
      linkMaps: linkMaps.trim() || null,

      itens: items.map((x) => ({
        id: null,
        descricao: x.descricao,
        quantidade: Number(x.quantidade) || 0,
        precoUnitario: Number(x.precoUnitario) || 0,
        total: itemTotal(x),
        tamanho: isMadeira ? (x.tamanho ?? null) : null,
        componente: x.componente?.trim() || null,
      })) as any,

      status: "PENDENTE" as any,
    } as any)

    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
          <DialogDescription>Preencha as informações do pedido de compra</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Materiais para cobertura residencial"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MADEIRA">Madeira</SelectItem>
                  <SelectItem value="TELHA">Telha</SelectItem>
                  <SelectItem value="ANDAIMES">Andaime</SelectItem>
                  <SelectItem value="MATERIAIS">Materiais</SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label className="text-xs">Fornecedor</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger className="justify-between">
                  <div className="flex items-center gap-2">
                    {fornecedoresLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    <SelectValue placeholder={fornecedoresLoading ? "Carregando..." : "Selecione"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {fornecedoresFiltrados.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nome}
                      {f.tipo ? ` • ${f.tipo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Data de Entrega</Label>
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={String(frete)}
                onChange={(e) => setFrete(Number(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">Obra</Label>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm">
                {obraId ? `Obra #${obraId}` : "-"}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Itens do Pedido</h3>
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
                          <Label className="text-xs">Material</Label>

                          <div className="mt-1">
                            <Select
                              value={item.materialId || ""}
                              onValueChange={(v) => onSelectMaterialForItem(item.clientId, v)}
                              disabled={!categoria || materiaisLoading}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-md border border-border justify-between">
                                <SelectValue placeholder={materiaisLoading ? "Carregando..." : "Selecione um material"} />
                              </SelectTrigger>

                              <SelectContent>
                                {materiaisFiltradosParaCategoria.map((m) => (
                                  <SelectItem key={m.id} value={String(m.id)}>
                                    {materialLabel(m)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {!categoria && <p className="mt-1 text-xs text-muted-foreground">Selecione a categoria para habilitar.</p>}
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs">Quantidade</Label>
                          <Input
                            type="number"
                            value={item.quantidade || ""}
                            onChange={(e) => updateItem(item.clientId, { quantidade: Number(e.target.value) || 0 })}
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
                                updateItem(item.clientId, { tamanho: e.target.value === "" ? null : Number(e.target.value) })
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
                            value={item.precoUnitario || ""}
                            onChange={(e) => updateItem(item.clientId, { precoUnitario: Number(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="mt-1"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <Label className="text-xs">Componente</Label>
                          <div className="mt-1">
                            <Select
                              value={item.componente || ""}
                              onValueChange={(v) => updateItem(item.clientId, { componente: v })}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-md border border-border justify-between">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {componentesList.map((c) => (
                                  <SelectItem key={c.id} value={c.nome}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="md:col-span-3">
                          <Label className="text-xs">Preço Total</Label>
                          <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background px-3 font-mono text-sm">
                            R$ {moneyBRL(itemTotal(item))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs">Descrição (preenchida automaticamente)</Label>
                        <Input value={item.descricao} readOnly className="mt-1" />
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
                  <div className="font-mono text-2xl font-semibold">R$ {moneyBRL(subtotal)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="size-5" />
                Endereço de Entrega
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleCopyClientInfo}
                title="Copiar dados do cliente"
              >
                <Copy className="size-4" />
                Copiar
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Nome do Cliente</Label>
                  <Input value={nomeReceptor} onChange={(e) => setNomeReceptor(e.target.value)} placeholder="Nome completo" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={telefoneReceptor}
                    onChange={(e) => setTelefoneReceptor(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Endereço Completo</Label>
                <Textarea
                  value={enderecoEntrega}
                  onChange={(e) => setEnderecoEntrega(e.target.value)}
                  placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Link do Google Maps</Label>
                <Input value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} placeholder="https://maps.google.com/?q=..." />
                {linkMaps ? (
                  <a
                    href={linkMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <MapPin className="size-3" />
                    Abrir no Google Maps
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!hasValidItem}>
            Criar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
