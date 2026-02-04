"use client"

import type React from "react"

import {
  Calendar,
  TrendingDown,
  TrendingUp,
  Package,
  Building2,
  MoreVertical,
  Eye,
  Edit,
  FileText,
  Copy,
  XCircle,
  Plug,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface PurchaseOrderCardProps {
  order: PurchaseOrder
  onClick: () => void
}

const statusConfig = {
  rascunho: { label: "Rascunho", color: "bg-gray-500" },
  pendente: { label: "Pendente", color: "bg-orange-500" },
  aprovado: { label: "Aprovado", color: "bg-blue-500" },
  "em-compra": { label: "Em Compra", color: "bg-purple-500" },
  "aguardando-pagamento": { label: "Aguardando Pagamento", color: "bg-red-400" },
  "aguardando-entrega": { label: "Aguardando Entrega", color: "bg-blue-700" },
  entregue: { label: "Entregue", color: "bg-green-500" },
  cancelado: { label: "Cancelado", color: "bg-gray-700" },
}

export function PurchaseOrderCard({ order, onClick }: PurchaseOrderCardProps) {
  const router = useRouter()
  const status = statusConfig[order.status as keyof typeof statusConfig]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR")
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/compra/${order.id}`)
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      onClick={onClick}
      className="bg-card border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">{order.number}</h3>
          <Badge className={`${status.color} text-white hover:${status.color}`}>{status.label}</Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {!order.integrated && order.status !== "rascunho" && order.status !== "cancelado" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Plug className="w-4 h-4 mr-2" />
                  Integrar ao Financeiro
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar Pedido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar Pedido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <Package className="w-3 h-3" />
          {order.category}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {order.supplier}
        </Badge>
      </div>

      {/* Values */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Previsto:</span>
          <span className="font-semibold">{formatCurrency(order.expectedValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Realizado:</span>
          <span className="font-semibold">{order.actualValue ? formatCurrency(order.actualValue) : "—"}</span>
        </div>
        {difference && (
          <div
            className={`flex items-center justify-end gap-1 text-sm ${difference.isNegative ? "text-green-600" : "text-red-600"}`}
          >
            <difference.icon className="w-4 h-4" />
            <span className="font-medium">
              {difference.isNegative ? "-" : "+"}
              {formatCurrency(difference.value)} ({difference.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Delivery Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Entrega: {formatDate(order.deliveryDate)}</span>
      </div>

      {/* Project */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100">
          <Building2 className="w-3 h-3" />
          {order.project}
        </Badge>
      </div>

      {/* Integration Status */}
      <div>
        {order.integrated ? (
          <Badge className="bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
            Integrado - {order.integratedCode}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Não integrado
          </Badge>
        )}
      </div>
    </div>
  )
}
