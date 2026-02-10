"use client"

import { Calendar, Package, Building2, TrendingDown, TrendingUp, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface PurchaseOrder {
  id: string
  number: string
  description: string
  category: string
  supplier: string
  project: string
  expectedValue: number
  actualValue?: number
  deliveryDate: string
  status: string
  integrated: boolean
  integratedCode?: string
}

interface PurchaseOrderModalProps {
  order: PurchaseOrder
  onClose: () => void
}

const statusConfig = {
  rascunho: { label: "Rascunho", color: "bg-gray-500" },
  pendente: { label: "Pendente", color: "bg-orange-500" },
  aprovado: { label: "Aprovado", color: "bg-blue-500" },
  "em-compra": { label: "Em Compra", color: "bg-amber-500" },
  "aguardando-pagamento": { label: "Aguardando Pagamento", color: "bg-red-400" },
  "aguardando-entrega": { label: "Aguardando Entrega", color: "bg-blue-700" },
  entregue: { label: "Entregue", color: "bg-green-500" },
  cancelado: { label: "Cancelado", color: "bg-gray-700" },
}

export function PurchaseOrderModal({ order, onClose }: PurchaseOrderModalProps) {
  const router = useRouter()
  const status = statusConfig[order.status as keyof typeof statusConfig]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const getDifference = () => {
    if (!order.actualValue) return null
    const diff = order.actualValue - order.expectedValue
    const percentage = ((diff / order.expectedValue) * 100).toFixed(1)
    const isNegative = diff < 0

    return {
      value: Math.abs(diff),
      percentage: Math.abs(Number(percentage)),
      isNegative,
      icon: isNegative ? TrendingDown : TrendingUp,
    }
  }

  const difference = getDifference()

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{order.number}</span>
              <Badge className={`${status.color} text-white`}>{status.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Descrição</label>
            <p className="mt-1 text-sm">{order.description}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Categoria</label>
              <div className="mt-1">
                <Badge variant="secondary" className="gap-1">
                  <Package className="w-3 h-3" />
                  {order.category}
                </Badge>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Fornecedor</label>
              <p className="mt-1 text-sm">{order.supplier}</p>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Obra</label>
            <div className="mt-1">
              <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700">
                <Building2 className="w-3 h-3" />
                {order.project}
              </Badge>
            </div>
          </div>

          {/* Values */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor Previsto</span>
              <span className="text-lg font-semibold">{formatCurrency(order.expectedValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor Realizado</span>
              <span className="text-lg font-semibold">
                {order.actualValue ? formatCurrency(order.actualValue) : "—"}
              </span>
            </div>
            {difference && (
              <div
                className={`flex items-center justify-between pt-2 border-t ${difference.isNegative ? "text-green-600" : "text-red-600"}`}
              >
                <span className="text-sm font-medium">Variação</span>
                <div className="flex items-center gap-2">
                  <difference.icon className="w-4 h-4" />
                  <span className="font-semibold">
                    {difference.isNegative ? "-" : "+"}
                    {formatCurrency(difference.value)} ({difference.percentage}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Data de Entrega</label>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(order.deliveryDate)}</span>
            </div>
          </div>

          {/* Integration Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status de Integração</label>
            <div className="mt-1">
              {order.integrated ? (
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer gap-2">
                  Integrado ao Financeiro - {order.integratedCode}
                  <ExternalLink className="w-3 h-3" />
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Não integrado
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              className="flex-1"
              onClick={() => {
                router.push(`/compra/${order.id}`)
                onClose()
              }}
            >
              Editar Pedido
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
