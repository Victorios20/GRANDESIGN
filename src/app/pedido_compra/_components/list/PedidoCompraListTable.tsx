"use client"

import Link from "next/link"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Calendar, CheckCircle2, MoreVertical, TrendingDown, TrendingUp } from "lucide-react"

import { StatusBadge } from "@/components/pedido-compra/StatusBadge"
import { SortableHeader } from "@/components/financeiro/SortableHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { canIntegratePedido, canReversePedidoIntegration, getPedidoFinanceBadgeClass, getPedidoFinanceLabel } from "@/lib/pedido-compra-finance"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { StatusSlug } from "@/lib/pedido-compra-theme"
import { calcVariancePercent, formatMoney, fromSlugStatus } from "@/lib/pedido-compra-utils"
import { cn } from "@/lib/utils"
import type { PurchaseOrder } from "@/types/pedido-compra"

import { listCategoryBadgeClass, listIntegrationBadgeClass, listShellClass } from "./styles"

type Props = {
  orders: PurchaseOrder[]
  selectedIds: string[]
  visibleSelectionState: CheckedState
  onToggleVisibleSelection: (checked: boolean) => void
  onToggleOrderSelection: (orderId: string, checked: boolean) => void
  onOrderClick: (order: PurchaseOrder) => void
  onViewOrder: (order: PurchaseOrder) => void
  onOpenFinanceAction: (kind: "integrate" | "reverse", ids: Array<string | number>) => void
  onDeleteOrder: (order: PurchaseOrder) => void
  sortBy: PedidoCompraSortBy
  sortOrder: "asc" | "desc"
  onSortChange: (column: PedidoCompraSortBy) => void
}

type PedidoCompraSortBy = "date" | "number" | "description" | "category" | "value" | "actualValue" | "delivery" | "status" | "integration"

function formatSafeDate(dateValue: string | null | undefined) {
  if (!dateValue) return "Sem data"
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("pt-BR")
}

export function PedidoCompraListTable({
  orders,
  selectedIds,
  visibleSelectionState,
  onToggleVisibleSelection,
  onToggleOrderSelection,
  onOrderClick,
  onViewOrder,
  onOpenFinanceAction,
  onDeleteOrder,
  sortBy,
  sortOrder,
  onSortChange,
}: Props) {
  return (
    <section className={cn(listShellClass, "overflow-hidden")}>
      <Table>
        <TableHeader className="bg-[#faf8f3]">
          <TableRow className="border-b border-[#e7e0d4] hover:bg-transparent">
            <TableHead className="w-12 px-3">
              <Checkbox
                checked={visibleSelectionState}
                onCheckedChange={(checked) => onToggleVisibleSelection(Boolean(checked))}
                aria-label="Selecionar pedidos visíveis"
              />
            </TableHead>
            <SortableHeader column="number" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="px-3 py-3">
              Número
            </SortableHeader>
            <SortableHeader column="description" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="px-3 py-3">
              Descrição
            </SortableHeader>
            <SortableHeader column="category" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="hidden sm:table-cell px-3 py-3">
              Categoria
            </SortableHeader>
            <SortableHeader column="status" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="px-3 py-3">
              Status
            </SortableHeader>
            <SortableHeader column="value" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} align="right" className="px-3 py-3">
              Valor do pedido
            </SortableHeader>
            <SortableHeader column="actualValue" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} align="right" className="hidden sm:table-cell px-3 py-3">
              Valor realizado
            </SortableHeader>
            <SortableHeader column="delivery" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="hidden sm:table-cell px-3 py-3">
              Entrega
            </SortableHeader>
            <SortableHeader column="integration" activeColumn={sortBy} direction={sortOrder} onSort={onSortChange} className="hidden sm:table-cell px-3 py-3">
              Integração
            </SortableHeader>
            <TableHead className="w-14 px-3 py-3" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {orders.map((order) => {
            const isSelected = selectedIds.includes(order.id)
            const variance = calcVariancePercent(order.expectedValue, order.actualValue)
            const isIntegrated = order.financeiroIntegracaoStatus === "INTEGRADO"

            return (
              <TableRow
                key={order.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "cursor-pointer border-b border-[#efe8dc] bg-white transition-colors hover:bg-[#faf8f4]",
                  isSelected && "bg-[#f6f2e7] hover:bg-[#f3ecdc]"
                )}
                onClick={() => onOrderClick(order)}
              >
                <TableCell className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleOrderSelection(order.id, Boolean(checked))}
                    aria-label={`Selecionar pedido ${order.number}`}
                  />
                </TableCell>

                <TableCell className="px-3 py-3.5 align-top">
                  <div className="space-y-1">
                    <div className="font-mono text-sm font-semibold text-[#2c201b]">{order.number}</div>
                    <div className="text-xs text-[#7b705f]">{order.supplier}</div>
                  </div>
                </TableCell>

                <TableCell className="max-w-[340px] px-3 py-3.5 align-top whitespace-normal">
                  <div className="space-y-1">
                    <div className="line-clamp-2 text-sm font-medium leading-5 text-[#2c201b]">{order.description}</div>
                    <div className="text-xs text-[#7b705f]">{order.project}</div>
                  </div>
                </TableCell>

                <TableCell className="hidden sm:table-cell px-3 py-3.5 align-top">
                  <Badge variant="outline" className={listCategoryBadgeClass}>
                    {order.category}
                  </Badge>
                </TableCell>

                <TableCell className="px-3 py-3.5 align-top">
                  <StatusBadge status={fromSlugStatus(order.status as StatusSlug)} />
                </TableCell>

                <TableCell className="px-3 py-3.5 text-right align-top">
                  <div className="text-sm font-semibold text-[#2c201b]">{formatMoney(order.expectedValue)}</div>
                </TableCell>

                <TableCell className="hidden sm:table-cell px-3 py-3.5 text-right align-top">
                  {order.actualValue != null ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-[#2c201b]">{formatMoney(order.actualValue)}</div>
                      {variance !== null ? (
                        <div
                          className={cn(
                            "inline-flex items-center justify-end gap-1 text-xs font-medium",
                            variance > 0 ? "text-[#9b4b1d]" : "text-[#2f7a52]"
                          )}
                        >
                          {variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(variance).toFixed(1)}%
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-[#9a8f7c]">-</span>
                  )}
                </TableCell>

                <TableCell className="hidden sm:table-cell px-3 py-3.5 align-top">
                  {order.deliveryDate ? (
                    <div className="inline-flex items-center gap-2 text-sm text-[#5b5347]">
                      <Calendar className="h-4 w-4 text-[#9a8f7c]" />
                      {formatSafeDate(order.deliveryDate)}
                    </div>
                  ) : (
                    <span className="text-sm text-[#9a8f7c]">Sem data</span>
                  )}
                </TableCell>

                <TableCell className="hidden sm:table-cell px-3 py-3.5 align-top">
                  <span
                    className={cn(
                      listIntegrationBadgeClass,
                      getPedidoFinanceBadgeClass(order.financeiroIntegracaoStatus),
                      isIntegrated && "border-emerald-500 bg-emerald-100 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]"
                    )}
                    aria-label={`Integração financeira: ${getPedidoFinanceLabel(order.financeiroIntegracaoStatus)}`}
                  >
                    {isIntegrated ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {getPedidoFinanceLabel(order.financeiroIntegracaoStatus)}
                  </span>
                  {isIntegrated && order.integratedCode ? (
                    <div className="mt-1 text-xs font-medium text-emerald-700">{order.integratedCode}</div>
                  ) : null}
                </TableCell>

                <TableCell className="px-3 py-3.5 align-top">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-lg border border-transparent p-0 text-[#7b705f] hover:border-[#ddd7cc] hover:bg-[#f4efe4] hover:text-[#2c201b]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#ddd7cc]">
                      <DropdownMenuItem onClick={() => onViewOrder(order)}>Visualizar pedido</DropdownMenuItem>
                      {!order.integrated ? (
                        <DropdownMenuItem asChild>
                          <Link href={`/pedido_compra/edit/${order.id}`}>Editar pedido</Link>
                        </DropdownMenuItem>
                      ) : null}
                      {canIntegratePedido(order.financeiroIntegracaoStatus) ? (
                        <DropdownMenuItem onClick={() => onOpenFinanceAction("integrate", [order.id])}>Integrar financeiro</DropdownMenuItem>
                      ) : null}
                      {canReversePedidoIntegration(order.financeiroIntegracaoStatus) ? (
                        <DropdownMenuItem onClick={() => onOpenFinanceAction("reverse", [order.id])}>Estornar integração financeira</DropdownMenuItem>
                      ) : null}
                      {!order.integrated ? (
                        <DropdownMenuItem className="text-[#8f3f37]" onClick={() => onDeleteOrder(order)}>
                          Excluir pedido
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
