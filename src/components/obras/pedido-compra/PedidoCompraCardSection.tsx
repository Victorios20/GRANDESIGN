"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  MoreVertical,
  Calendar,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  ExternalLink,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { PedidoCompraVM } from "./types"
import { PedidoCompraCreateModal } from "./PedidoCompraCreateModal"
import { PedidoCompraDetailsModal } from "./PedidoCompraDetailsModal"

type Props = {
  pedidos: PedidoCompraVM[]
  obraId?: number | null
  mode?: "create" | "view" | "edit"
  onCreate?: (draft: Partial<PedidoCompraVM>) => void
  onCancelar?: (pedidoId: number) => void
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
  return d.toLocaleDateString("pt-BR")
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

function statusBadgeClass(raw: unknown) {
  const s = String(raw ?? "").toUpperCase()
  if (s === "RASCUNHO") return "bg-gray-100 text-gray-800 border-gray-300"
  if (s === "PENDENTE") return "bg-yellow-100 text-yellow-800 border-yellow-300"
  if (s === "APROVADO") return "bg-blue-100 text-blue-800 border-blue-300"
  if (s === "EM_COMPRA") return "bg-purple-100 text-purple-800 border-purple-300"
  if (s === "AGUARDANDO_PAGAMENTO") return "bg-orange-100 text-orange-800 border-orange-300"
  if (s === "AGUARDANDO_ENTREGA") return "bg-cyan-100 text-cyan-800 border-cyan-300"
  if (s === "ENTREGUE") return "bg-green-100 text-green-800 border-green-300"
  if (s === "CANCELADO") return "bg-red-100 text-red-800 border-red-300"
  return "bg-yellow-100 text-yellow-800 border-yellow-300"
}

function calcVariancePercent(previsto: unknown, realizado: unknown) {
  const p = Number(previsto)
  const r = Number(realizado)
  if (!Number.isFinite(p) || p <= 0) return null
  if (!Number.isFinite(r)) return null
  return ((r - p) / p) * 100
}

function isEmptyPedido(p: any) {
  const id = Number(p?.id ?? 0)
  if (id > 0) return false

  const descricao = String(p?.descricao ?? p?.observacoes ?? "").trim()
  const itens = Array.isArray(p?.itens) ? p.itens : []

  const previsto = p?.valorOrcado ?? p?.valor_orcado ?? p?.valores?.orcado ?? p?.valores?.previsto ?? null
  const realizado = p?.valorRealizado ?? p?.valor_realizado ?? p?.valores?.realizado ?? null

  const frete = p?.frete ?? p?.valores?.frete ?? null
  const entrega = p?.dataEntrega ?? p?.data_entrega ?? p?.entrega?.data ?? null

  const fornecedorNome = String(p?.fornecedorNome ?? p?.fornecedor?.nome ?? "").trim()

  const prevNum = Number(previsto ?? 0)
  const realNum = Number(realizado ?? 0)
  const freteNum = Number(frete ?? 0)

  const hasMoney =
    (Number.isFinite(prevNum) && prevNum > 0) ||
    (Number.isFinite(realNum) && realNum > 0) ||
    (Number.isFinite(freteNum) && freteNum > 0)

  const hasEntrega = !!String(entrega ?? "").trim()
  const hasFornecedor = !!fornecedorNome
  const hasDescricao = !!descricao
  const hasItens = itens.length > 0

  return !(hasMoney || hasEntrega || hasFornecedor || hasDescricao || hasItens)
}

export function PedidoCompraCardSection({
  pedidos,
  obraId,
  mode = "view",
  onCreate,
  onCancelar,
  onIntegrar,
}: Props) {
  const router = useRouter()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<PedidoCompraVM | null>(null)

  const handleCreate = (draft: Partial<PedidoCompraVM>) => {
    onCreate?.(draft)
    setCreateOpen(false)
  }

  const handleRowClick = (p: PedidoCompraVM) => {
    setSelected(p)
  }

  const handleEdit = (id: number) => {
    router.push(`/pedido_compra/edit/${id}`)
  }

  const visiblePedidos = React.useMemo(() => {
    const list = Array.isArray(pedidos) ? pedidos : []
    return list.filter((p) => !isEmptyPedido(p as any))
  }, [pedidos])

  const handleNovoPedido = () => {
    if (mode === "create") {
      setCreateOpen(true)
      return
    }
    if (obraId != null && Number(obraId) > 0) {
      router.push(`/pedido_compra/cadastrar?obraId=${Number(obraId)}`)
      return
    }
    router.push(`/pedido_compra/cadastrar`)
  }

  return (
    <>
      <Card className="p-6 rounded-2xl shadow-md bg-white border-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-green">
              <ShoppingCart className="h-5 w-5" />
              Pedidos de Compra
              <Button
                type="button"
                variant="ghost-green"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push("/pedido_compra")
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">Gerencie pedidos e integrações financeiras da obra</p>
          </div>

          <Button
            type="button"
            onClick={handleNovoPedido}
            size="sm"
            className="gap-2 bg-green text-white hover:bg-green/80"
          >
            <Plus className="size-4" />
            Novo Pedido
          </Button>
        </div>

        {visiblePedidos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum pedido de compra cadastrado ainda</p>

            <Button
              type="button"
              onClick={handleNovoPedido}
              size="sm"
              className="mt-2 bg-green text-white hover:bg-green/80"
            >
              Adicionar primeiro pedido
            </Button>
          </div>
        ) : (
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
                {visiblePedidos.map((p, idx) => {
                  const id = Number((p as any)?.id ?? 0)
                  const numero = id > 0 ? `PC-${id}` : `PC-TMP-${idx + 1}`

                  const descricao = String((p as any)?.descricao ?? (p as any)?.observacoes ?? "").trim() || "—"
                  const categoria = String((p as any)?.categoria ?? "—")
                  const status = (p as any)?.status ?? "PENDENTE"

                  const previsto = (p as any)?.valorOrcado ?? (p as any)?.valor_orcado ?? (p as any)?.valores?.orcado
                  const realizado =
                    (p as any)?.valorRealizado ?? (p as any)?.valor_realizado ?? (p as any)?.valores?.realizado

                  const entrega = (p as any)?.dataEntrega ?? (p as any)?.data_entrega ?? (p as any)?.entrega?.data

                  const fornecedor =
                    String((p as any)?.fornecedorNome ?? (p as any)?.fornecedor?.nome ?? "—").trim() || "—"

                  const variance = calcVariancePercent(previsto, realizado)

                  const integrado =
                    Boolean((p as any)?.integrado) ||
                    Boolean((p as any)?.integrated) ||
                    Boolean((p as any)?.isIntegrated) ||
                    false

                  const varianceIsPositive = typeof variance === "number" && variance > 0
                  const varianceIsNegative = typeof variance === "number" && variance < 0

                  return (
                    <tr
                      key={String((p as any)?.id ?? `tmp-${idx}`)}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(p)}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-mono text-sm font-medium">{numero}</div>
                          <div className="text-xs text-muted-foreground">{fornecedor}</div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-sm line-clamp-2 max-w-md">{descricao}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Obra #{obraId ?? (p as any)?.obraId ?? (p as any)?.obra_id ?? "-"}
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge variant="outline" className="font-medium">
                          {categoria}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <Badge variant="outline" className={statusBadgeClass(status)}>
                          {statusLabel(status)}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <div className="text-sm font-medium">{moneyBRL(previsto)}</div>
                      </td>

                      <td className="p-4">
                        {realizado != null && String(realizado) !== "" ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{moneyBRL(realizado)}</div>

                            {variance != null && (
                              <div
                                className={[
                                  "flex items-center gap-1 text-xs",
                                  varianceIsPositive ? "text-red-600" : "",
                                  varianceIsNegative ? "text-green-600" : "",
                                  !varianceIsPositive && !varianceIsNegative ? "text-muted-foreground" : "",
                                ].join(" ")}
                              >
                                {varianceIsPositive ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : varianceIsNegative ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : null}

                                {Math.abs(variance).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {entrega ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {onlyDateBR(entrega)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {integrado ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Integrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                            Não integrado
                          </Badge>
                        )}
                      </td>

                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelected(p)
                              }}
                            >
                              Ver detalhes
                            </DropdownMenuItem>

                            {id > 0 && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEdit(id)
                                }}
                              >
                                Editar pedido
                              </DropdownMenuItem>
                            )}

                            {!integrado && id > 0 && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onIntegrar?.(id)
                                }}
                              >
                                Integrar ao Financeiro
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {id > 0 && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onSelect={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onCancelar?.(id)
                                }}
                              >
                                Cancelar pedido
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {mode === "create" && (
        <PedidoCompraCreateModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          obraId={obraId ?? null}
          onCreate={handleCreate}
        />
      )}

      {selected && (
        <PedidoCompraDetailsModal
          pedido={selected}
          obraId={obraId ?? null}
          onClose={() => setSelected(null)}
          onEdit={(id) => handleEdit(id)}
          onIntegrar={(id) => onIntegrar?.(id)}
        />
      )}
    </>
  )
}
