"use client"

import * as React from "react"
import { Calendar, TrendingDown, TrendingUp, ExternalLink } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

  const descricao = String((pedido as any)?.descricao ?? (pedido as any)?.observacoes ?? "").trim() || "—"
  const categoria = String((pedido as any)?.categoria ?? "—")
  const fornecedor = String((pedido as any)?.fornecedorNome ?? (pedido as any)?.fornecedor?.nome ?? "—").trim() || "—"
  const previsto = (pedido as any)?.valorOrcado ?? (pedido as any)?.valor_orcado
  const realizado = (pedido as any)?.valorRealizado ?? (pedido as any)?.valor_realizado
  const entrega = (pedido as any)?.dataEntrega ?? (pedido as any)?.data_entrega
  const status = (pedido as any)?.status ?? "PENDENTE"

  const integrado =
    Boolean((pedido as any)?.integrado) ||
    Boolean((pedido as any)?.integrated) ||
    Boolean((pedido as any)?.isIntegrated) ||
    false

  const diff = calcDiff(previsto, realizado)
  const isPositive = diff ? diff.diff > 0 : false

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono">{numero}</span>
              <Badge className={`${statusChip(status)} text-white`}>{statusLabel(status)}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Descrição</label>
            <p className="mt-1 text-sm">{descricao}</p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Categoria</label>
              <p className="mt-1 text-sm">{categoria}</p>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Fornecedor</label>
              <p className="mt-1 text-sm">{fornecedor}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Obra</label>
            <div className="mt-1">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Obra #{obraId ?? (pedido as any)?.obraId ?? (pedido as any)?.obra_id ?? "-"}
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor Previsto</span>
              <span className="text-lg font-semibold">{moneyBRL(previsto)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor Realizado</span>
              <span className="text-lg font-semibold">{realizado != null && String(realizado) !== "" ? moneyBRL(realizado) : "—"}</span>
            </div>

            {diff && (
              <div className={`flex items-center justify-between pt-2 border-t ${isPositive ? "text-red-600" : "text-green-600"}`}>
                <span className="text-sm font-medium">Variação</span>
                <div className="flex items-center gap-2">
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-semibold">
                    {isPositive ? "+" : "-"}
                    {moneyBRL(Math.abs(diff.diff))} ({Math.abs(diff.percent).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Data de Entrega</label>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{entrega ? onlyDateBR(entrega) : "—"}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Status de Integração</label>
            <div className="mt-1">
              {integrado ? (
                <Badge className="bg-purple-500 text-white gap-2">
                  Integrado ao Financeiro
                  <ExternalLink className="w-3 h-3" />
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Não integrado
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button className="flex-1" onClick={() => id > 0 && onEdit(id)} disabled={id <= 0}>
              Editar Pedido
            </Button>

            {!integrado && id > 0 && (
              <Button className="flex-1" onClick={() => onIntegrar?.(id)}>
                Integrar ao Financeiro
              </Button>
            )}

            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
