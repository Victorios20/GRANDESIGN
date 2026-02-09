"use client"

import * as React from "react"
import { Calendar, TrendingDown, TrendingUp, ExternalLink, Loader2 } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPedidoDetailsAction } from "@/actions/pedido_compra/get-pedido-details"
import { toast } from "sonner"

import type { PedidoCompraVM } from "./types"

type Props = {
  pedido: PedidoCompraVM
  obraId: number | null
  onClose: () => void
  onEdit: (pedidoId: number) => void
  onIntegrar?: (pedidoId: number) => void
}

function moneyBRL(v: unknown) {
  const n = Number(String(v ?? "").replace(",", "."))
  if (!Number.isFinite(n)) return "-"
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function onlyDateBR(input: unknown) {
  if (!input) return "-"
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : (input as Date)
  if (Number.isNaN(d?.getTime?.())) return "-"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

function statusLabel(raw: unknown) {
  const s = String(raw ?? "").toUpperCase()
  if (s === "RASCUNHO") return "Rascunho"
  if (s === "PENDENTE") return "Pendente"
  if (s === "APROVADO") return "Aprovado"
  if (s === "EM_COMPRA") return "Em Compra"
  if (s === "AGUARDANDO_PAGAMENTO") return "Aguardando Pagamento"
  if (s === "AGUARDANDO_ENTREGA") return "Aguardando Entrega"
  if (s === "ENTREGUE") return "Entregue"
  if (s === "CANCELADO") return "Cancelado"
  return s ? s : "Pendente"
}

function statusChip(raw: unknown) {
  const s = String(raw ?? "").toUpperCase()
  if (s === "RASCUNHO") return "bg-gray-500"
  if (s === "PENDENTE") return "bg-orange-500"
  if (s === "APROVADO") return "bg-blue-500"
  if (s === "EM_COMPRA") return "bg-purple-500"
  if (s === "AGUARDANDO_PAGAMENTO") return "bg-red-400"
  if (s === "AGUARDANDO_ENTREGA") return "bg-blue-700"
  if (s === "ENTREGUE") return "bg-green-500"
  if (s === "CANCELADO") return "bg-gray-700"
  return "bg-orange-500"
}

function calcDiff(previsto: unknown, realizado: unknown) {
  const p = Number(previsto)
  const r = Number(realizado)
  if (!Number.isFinite(p) || p <= 0) return null
  if (!Number.isFinite(r)) return null
  const diff = r - p
  const percent = (diff / p) * 100
  return { diff, percent }
}

export function PedidoCompraDetailsModal({ pedido, obraId, onClose, onEdit, onIntegrar }: Props) {
  const id = Number((pedido as any)?.id ?? 0)
  const numero = id > 0 ? `PC-${id}` : "PC-TMP"

  const defaultDescricao = String((pedido as any)?.descricao ?? (pedido as any)?.observacoes ?? "").trim() || "—"
  const defaultCategoria = String((pedido as any)?.categoria ?? "—")
  const defaultFornecedor = String((pedido as any)?.fornecedorNome ?? (pedido as any)?.fornecedor?.nome ?? "—").trim() || "—"
  const defaultPrevisto = (pedido as any)?.valorOrcado ?? (pedido as any)?.valor_orcado
  const defaultRealizado = (pedido as any)?.valorRealizado ?? (pedido as any)?.valor_realizado
  const defaultEntrega = (pedido as any)?.dataEntrega ?? (pedido as any)?.data_entrega
  const defaultStatus = (pedido as any)?.status ?? "PENDENTE"

  const integrado =
    Boolean((pedido as any)?.integrado) ||
    Boolean((pedido as any)?.integrated) ||
    Boolean((pedido as any)?.isIntegrated) ||
    false

  const [loading, setLoading] = React.useState(false)
  const [details, setDetails] = React.useState<any>(null)

  React.useEffect(() => {
    if (id > 0) {
      setLoading(true)
      getPedidoDetailsAction(id)
        .then((res) => {
          if (res.success) setDetails(res.data)
          else toast.error(res.error || "Erro ao carregar detalhes")
        })
        .catch(() => toast.error("Erro inesperado ao carregar detalhes"))
        .finally(() => setLoading(false))
    }
  }, [id])

  // Use fetched details if available, otherwise fallback to prop (VM)
  const displayDescricao = details?.descricao || defaultDescricao
  const displayCategoria = details?.categoria || defaultCategoria
  const displayFornecedor = details?.fornecedor?.nome || defaultFornecedor
  const displayPrevisto = details?.valor_orcado ?? defaultPrevisto
  const displayRealizado = details?.valor_realizado ?? defaultRealizado
  const displayEntrega = details?.data_entrega ?? defaultEntrega
  const displayStatus = details?.status ?? defaultStatus

  const diff = calcDiff(displayPrevisto, displayRealizado)
  const isPositive = diff ? diff.diff > 0 : false

  const itens = Array.isArray(details?.itens) ? details.itens : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl">{numero}</span>
              <Badge className={`${statusChip(displayStatus)} text-white`}>{statusLabel(displayStatus)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href="/pedido_compra" aria-label="Ir para Pedidos de Compra">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>


        <div className="space-y-6">
          {/* Header Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <p className="text-sm font-medium">{displayDescricao}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Obra</label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  Obra #{obraId ?? (pedido as any)?.obraId ?? details?.obra_id ?? "-"}
                </Badge>
                <span className="text-sm text-muted-foreground line-clamp-1">
                  {details?.obra?.titulo || ""}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria / Fornecedor</label>
              <p className="text-sm">
                <span className="font-semibold">{displayCategoria}</span>
                <span className="mx-2 text-muted-foreground">•</span>
                {displayFornecedor}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Previsão Entrega</label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>{displayEntrega ? onlyDateBR(displayEntrega) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Financeiro Card */}
          <div className="bg-muted/30 border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <span className="text-xs text-muted-foreground block">Valor Previsto</span>
              <span className="text-lg font-semibold">{moneyBRL(displayPrevisto)}</span>
            </div>
            <div className="border-l pl-4">
              <span className="text-xs text-muted-foreground block">Valor Realizado</span>
              <span className="text-lg font-semibold">{displayRealizado != null ? moneyBRL(displayRealizado) : "—"}</span>
            </div>
            {diff && (
              <div className={`border-l pl-4 ${isPositive ? "text-red-600" : "text-green-600"}`}>
                <span className="text-xs font-medium block">Variação</span>
                <div className="flex items-center gap-1 font-semibold">
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {moneyBRL(Math.abs(diff.diff))} ({Math.abs(diff.percent).toFixed(1)}%)
                </div>
              </div>
            )}
          </div>

          {/* Items Table - Compact Layout */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider">Itens do Pedido</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-16">Qtd</th>
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium w-24">Unit.</th>
                    <th className="px-3 py-2 text-right font-medium w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && itens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando itens...</td>
                    </tr>
                  ) : itens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">Nenhum item listado.</td>
                    </tr>
                  ) : (
                    itens.map((item: any, idx: number) => (
                      <tr key={item.id ?? idx} className="hover:bg-muted/20">
                        <td className="px-3 py-1 text-xs font-medium">{Number(item.quantidade).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-1 text-xs">
                          {item.descricao}
                          {item.tamanho ? <span className="text-muted-foreground ml-1">({Number(item.tamanho).toLocaleString("pt-BR")}m)</span> : ""}
                        </td>
                        <td className="px-3 py-1 text-xs text-right text-muted-foreground">{moneyBRL(item.preco_unitario)}</td>
                        <td className="px-3 py-1 text-xs text-right font-medium">{moneyBRL(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itens.length > 0 && (
                  <tfoot className="bg-muted/30 font-medium">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase">Total Itens</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {moneyBRL(itens.reduce((acc: number, i: any) => acc + Number(i.total || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t print:hidden">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>

            {!integrado && id > 0 && (
              <>
                {onIntegrar && (
                  <Button variant="secondary" onClick={() => onIntegrar(id)}>
                    Integrar Financeiro
                  </Button>
                )}
                <Button onClick={() => onEdit(id)}>
                  Editar Pedido
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

