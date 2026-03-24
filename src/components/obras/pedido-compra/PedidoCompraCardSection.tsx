"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Plus,
  MoreVertical,
  Calendar,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

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

import { deletePedidoCompra } from "@/actions/pedido_compra/delete-pedido-compra"
import { cancelPedidoCompra } from "@/actions/pedido_compra/cancel-pedido-compra"

import { StatusBadge } from "@/components/pedido-compra/StatusBadge"
import { formatMoney, formatDateBR, calcVariancePercent, formatPedidoId } from "@/lib/pedido-compra-utils"

type Props = {
  pedidos: PedidoCompraVM[]
  obraId?: number | null
  mode?: "create" | "view" | "edit"
  onCreate?: (draft: Partial<PedidoCompraVM>) => void
  onCancelar?: (pedidoId: number) => void // Legacy prop, kept for compatibility
  onExcluir?: (pedidoId: number) => void
  onIntegrar?: (pedidoId: number) => void
}

// Helper functions removed - using shared utilities

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
  // onCancelar, // We will implement internal cancel handler
  onExcluir,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<PedidoCompraVM | null>(null)
  const [menuOpenKey, setMenuOpenKey] = React.useState<string | null>(null)
  const [processingId, setProcessingId] = React.useState<number | null>(null)

  React.useEffect(() => {
    setMenuOpenKey(null)
    setSelected(null)
    setCreateOpen(false)
  }, [pathname])

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

  const handleView = (id: number) => {
    router.push(`/pedido_compra/ver/${id}`)
  }

  const handleCancelPedido = async (id: number) => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return

    setProcessingId(id)
    try {
      const res = await cancelPedidoCompra(id)
      if (res.success) {
        toast.success("Pedido cancelado com sucesso")
        router.refresh()
      } else {
        toast.error(res.error || "Erro ao cancelar pedido")
      }
    } catch (err) {
      toast.error("Erro inesperado ao cancelar pedido")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeletePedido = async (id: number) => {
    if (!confirm("Tem certeza que deseja EXCLUIR este pedido permanentemente?")) return

    setProcessingId(id)
    try {
      const res = await deletePedidoCompra(id)
      if (res.success) {
        toast.success("Pedido excluído com sucesso")
        router.refresh()
      } else {
        toast.error(res.error || "Erro ao excluir pedido")
      }
    } catch (err) {
      toast.error("Erro inesperado ao excluir pedido")
    } finally {
      setProcessingId(null)
    }
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
      <Card className="p-6 rounded-2xl shadow-sm bg-white border-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-green">
              <ShoppingCart className="h-5 w-5" />
              Pedidos de Compra
              <Button
                type="button"
                variant="ghost-green"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                  const rowKey = String((p as any)?.id ?? `tmp-${idx}`)
                  const numero = formatPedidoId(id > 0 ? id : `TMP-${idx + 1}`, obraId ?? (p as any)?.obraId)

                  const descricao = String((p as any)?.descricao ?? (p as any)?.observacoes ?? "").trim() || "—"
                  const categoria = String((p as any)?.categoria ?? "—")
                  const status = (p as any)?.status ?? "PENDENTE"
                  const statusStr = String(status).toUpperCase()

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

                  const isProcessing = processingId === id
                  const canDelete = ["RASCUNHO", "PENDENTE", "CANCELADO"].includes(statusStr)
                  const isCancelled = statusStr === "CANCELADO"
                  const isFinal = ["ENTREGUE", "CANCELADO"].includes(statusStr)

                  return (
                    <tr
                      key={rowKey}
                      className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
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
                        <StatusBadge status={String(status)} />
                      </td>

                      <td className="p-4">
                        <div className="text-sm font-medium">{formatMoney(previsto)}</div>
                      </td>

                      <td className="p-4">
                        {realizado != null && String(realizado) !== "" ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{formatMoney(realizado)}</div>

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
                            {formatDateBR(entrega)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {integrado ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Integrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                            Não integrado
                          </Badge>
                        )}
                      </td>

                      <td className="p-4">
                        <DropdownMenu
                          open={menuOpenKey === rowKey}
                          onOpenChange={(open) => setMenuOpenKey(open ? rowKey : null)}
                        >
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.stopPropagation()
                                setMenuOpenKey(null)
                                setSelected(p)
                              }}
                            >
                              Ver detalhes
                            </DropdownMenuItem>

                            {id > 0 && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenKey(null)
                                  handleView(id)
                                }}
                              >
                                Visualizar pedido
                              </DropdownMenuItem>
                            )}

                            {id > 0 && !isFinal && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenKey(null)
                                  handleEdit(id)
                                }}
                              >
                                Editar pedido
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />



                            {id > 0 && canDelete && (
                              <DropdownMenuItem
                                className="text-red-600 gap-2"
                                onSelect={(e) => {
                                  e.stopPropagation()
                                  setMenuOpenKey(null)
                                  handleDeletePedido(id)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir pedido
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
        <PedidoCompraCreateModal open={createOpen} onOpenChange={setCreateOpen} obraId={obraId ?? null} onCreate={handleCreate} />
      )}

      {selected && (
        <PedidoCompraDetailsModal
          pedido={selected}
          obraId={obraId ?? null}
          onClose={() => setSelected(null)}
          onEdit={(id) => handleEdit(id)}
          onMutationComplete={() => router.refresh()}
        />
      )}
    </>
  )
}
