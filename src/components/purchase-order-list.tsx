"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Clock, XCircle, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

export interface PurchaseOrder {
  id: string
  description: string
  category: string
  status: "pending" | "approved" | "delivered" | "cancelled"
  estimatedValue: number
  actualValue: number | null
  deliveryDate: string
  isIntegrated: boolean
  supplier: string
  viewed?: boolean
}

interface PurchaseOrderListProps {
  orders: PurchaseOrder[]
  onOrderClick: (order: PurchaseOrder) => void
}

const statusConfig = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "bg-warning/10 text-warning-foreground border-warning/20",
    dotColor: "bg-warning",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    color: "bg-info/10 text-info-foreground border-info/20",
    dotColor: "bg-info",
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle2,
    color: "bg-success/10 text-success-foreground border-success/20",
    dotColor: "bg-success",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-destructive/10 text-destructive-foreground border-destructive/20",
    dotColor: "bg-destructive",
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString))
}

export function PurchaseOrderList({ orders, onOrderClick }: PurchaseOrderListProps) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const status = statusConfig[order.status]
        const StatusIcon = status.icon
        const variance = order.actualValue
          ? ((order.actualValue - order.estimatedValue) / order.estimatedValue) * 100
          : null

        return (
          <div
            key={order.id}
            onClick={() => onOrderClick(order)}
            className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex flex-col items-center gap-2 relative">
              {!order.viewed && (
                <div className="absolute -top-1 -left-1 size-2 rounded-full bg-blue-500 animate-pulse" />
              )}
              <div className={`flex size-2 rounded-full ${status.dotColor}`} />
              <div className="h-full w-px bg-border" />
            </div>

            {/* Main content */}
            <div className="flex flex-1 items-start gap-4">
              {/* Left section - Description */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-sm font-medium text-foreground">#{order.id}</h3>
                  <Badge variant="outline" className={`gap-1 ${status.color} border`}>
                    <StatusIcon className="size-3" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{order.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium">{order.category}</span>
                  <span>•</span>
                  <span>{order.supplier}</span>
                </div>
              </div>

              {/* Middle section - Values */}
              <div className="flex gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Previsto</p>
                  <p className="font-mono text-sm font-medium">{formatCurrency(order.estimatedValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Realizado</p>
                  <p className="font-mono text-sm font-medium">
                    {order.actualValue ? (
                      <span
                        className={
                          variance !== null && variance > 0
                            ? "text-destructive"
                            : variance !== null && variance < 0
                              ? "text-success"
                              : ""
                        }
                      >
                        {formatCurrency(order.actualValue)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right section - Delivery & Integration */}
              <div className="flex items-center gap-4">
                <div className="space-y-1 text-right">
                  <p className="text-xs text-muted-foreground">Entrega</p>
                  <p className="font-mono text-sm font-medium">{formatDate(order.deliveryDate)}</p>
                </div>

                <div className="flex items-center gap-2">
                  {order.isIntegrated ? (
                    <Badge variant="outline" className="gap-1 border-success/20 bg-success/10 text-success-foreground">
                      <CheckCircle2 className="size-3" />
                      Integrado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Circle className="size-3" />
                      Não integrado
                    </Badge>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Menu de ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Ver detalhes</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/compra/${order.id}`)
                      }}
                    >
                      Editar pedido
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Integrar ao financeiro</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                      Cancelar pedido
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
