"use client"

import * as React from "react"
import { Loader2, Plus, Trash2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { PedidoCompraVM } from "./types"

type ItemDraft = {
  clientId: string
  descricao: string
  quantidade: number
  precoUnitario: number
  tamanho?: number | null
}

type FornecedorItem = {
  id: number
  nome: string
  tipo: string | null
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

function normTipo(v: string | null | undefined) {
  return (v ?? "").trim().toUpperCase()
}

function categoriaToTipos(categoria: string) {
  const c = normTipo(categoria)
  if (!c || c === "OUTROS") return null
  if (c === "ANDAIMES") return ["ANDAIME", "ANDAIMES"]
  return [c]
}

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
    const idNum = Number(fornecedorId)
    if (!Number.isFinite(idNum)) {
      setFornecedorNome("")
      return
    }
    const f = fornecedores.find((x) => x.id === idNum)
    setFornecedorNome(f?.nome ?? "")
  }, [fornecedorId, fornecedores])

  React.useEffect(() => {
    setFornecedorId("")
    setFornecedorNome("")
  }, [categoria])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { clientId: `${Date.now()}-${Math.random()}`, descricao: "", quantidade: 0, precoUnitario: 0, tamanho: null },
    ])
  }

  const removeItem = (clientId: string) => {
    setItems((prev) => prev.filter((x) => x.clientId !== clientId))
  }

  const updateItem = (clientId: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((x) => (x.clientId === clientId ? { ...x, ...patch } : x)))
  }

  const itemTotal = (x: ItemDraft) => (Number(x.quantidade) || 0) * (Number(x.precoUnitario) || 0)

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
  }

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) reset()
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
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            value={item.descricao}
                            onChange={(e) => updateItem(item.clientId, { descricao: e.target.value })}
                            placeholder="Ex: Telha romana marfim resinada"
                            className="mt-1"
                          />
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
                          <Label className="text-xs">Preço Total</Label>
                          <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background px-3 font-mono text-sm">
                            R$ {moneyBRL(itemTotal(item))}
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
                  <div className="font-mono text-2xl font-semibold">R$ {moneyBRL(subtotal)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="size-5" />
              Endereço de Entrega
            </h3>

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
