"use client"

import { PurchaseOrderList, type PurchaseOrder } from "@/components/purchase-order-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Package, DollarSign, TrendingUp, TrendingDown, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

const mockOrders: PurchaseOrder[] = [
  {
    id: "1",
    description: "Telhas cerâmicas - 100 unidades",
    category: "Telha",
    status: "pending",
    estimatedValue: 2500.0,
    actualValue: null,
    deliveryDate: "2025-02-15",
    isIntegrated: false,
    supplier: "Cerâmica Itaitinga Ltda",
    viewed: false,
  },
  {
    id: "2",
    description: "Madeira para estrutura - Vigas e caibros",
    category: "Madeira",
    status: "approved",
    estimatedValue: 8500.0,
    actualValue: 8200.0,
    deliveryDate: "2025-02-10",
    isIntegrated: true,
    supplier: "Madeireira Silva",
    viewed: true,
  },
  {
    id: "3",
    description: "Cimento Portland - 50 sacos",
    category: "Materiais",
    status: "delivered",
    estimatedValue: 1500.0,
    actualValue: 1550.0,
    deliveryDate: "2025-01-28",
    isIntegrated: true,
    supplier: "Depósito Construção",
    viewed: true,
  },
  {
    id: "4",
    description: "Areia média - 10m³",
    category: "Materiais",
    status: "pending",
    estimatedValue: 800.0,
    actualValue: null,
    deliveryDate: "2025-02-18",
    isIntegrated: false,
    supplier: "Areião do Norte",
    viewed: false,
  },
]

interface ProductItem {
  name: string
  quantity: number
  unitPrice: number
}

export function PurchaseOrdersSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const router = useRouter()

  const [productItems, setProductItems] = useState<ProductItem[]>([{ name: "", quantity: 0, unitPrice: 0 }])

  const calculateVariance = (order: PurchaseOrder) => {
    if (!order.actualValue) return null
    return ((order.actualValue - order.estimatedValue) / order.estimatedValue) * 100
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const statusLabels = {
    pending: "Pendente",
    approved: "Aprovado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  }

  const addProductItem = () => {
    setProductItems([...productItems, { name: "", quantity: 0, unitPrice: 0 }])
  }

  const removeProductItem = (index: number) => {
    if (productItems.length > 1) {
      setProductItems(productItems.filter((_, i) => i !== index))
    }
  }

  const updateProductItem = (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...productItems]
    updated[index] = { ...updated[index], [field]: value }
    setProductItems(updated)
  }

  const isProductValid = (item: ProductItem) => {
    return item.name.trim() !== "" && item.quantity > 0 && item.unitPrice > 0
  }

  const hasValidProducts = productItems.some(isProductValid)

  const handleCreateOrder = () => {
    if (!hasValidProducts) {
      alert("Você precisa adicionar pelo menos um produto válido!")
      return
    }
    // Here we would create the order and redirect
    const newId = Date.now().toString()
    router.push(`/compra/${newId}`)
    setIsDialogOpen(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6">
        <div>
          <h2 className="text-lg font-semibold">Pedidos de Compra</h2>
          <p className="mt-1 text-xs text-muted-foreground">Gerenciamento de pedidos e integrações financeiras</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="size-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="p-6">
        <PurchaseOrderList orders={mockOrders} onOrderClick={setSelectedOrder} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
            <DialogDescription>Preencha as informações do pedido de compra</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" placeholder="Ex: Materiais para cobertura residencial" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Madeira">Madeira</SelectItem>
                    <SelectItem value="Telha">Telha</SelectItem>
                    <SelectItem value="Andaime">Andaime</SelectItem>
                    <SelectItem value="Materiais">Materiais</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input id="supplier" placeholder="Nome do fornecedor" />
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Produtos *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProductItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>

              <div className="space-y-3">
                {productItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end border rounded-lg p-3">
                    <div className="col-span-5">
                      <Label htmlFor={`product-name-${index}`} className="text-xs">
                        Nome do Produto
                      </Label>
                      <Input
                        id={`product-name-${index}`}
                        value={item.name}
                        onChange={(e) => updateProductItem(index, "name", e.target.value)}
                        placeholder="Ex: Telha romana marfim"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`product-quantity-${index}`} className="text-xs">
                        Qtd
                      </Label>
                      <Input
                        id={`product-quantity-${index}`}
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateProductItem(index, "quantity", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`product-price-${index}`} className="text-xs">
                        Valor Unit.
                      </Label>
                      <Input
                        id={`product-price-${index}`}
                        type="number"
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateProductItem(index, "unitPrice", Number(e.target.value))}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <p className="text-sm font-medium mt-2">{formatCurrency(item.quantity * item.unitPrice)}</p>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductItem(index)}
                        disabled={productItems.length === 1}
                        className="h-9 w-9"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {!hasValidProducts && (
                <p className="text-xs text-muted-foreground">* Você precisa adicionar pelo menos um produto completo</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delivery-date">Data de Entrega</Label>
              <Input id="delivery-date" type="date" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateOrder} disabled={!hasValidProducts}>
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="font-mono text-xl">{selectedOrder.id}</DialogTitle>
                    <DialogDescription className="mt-2">{selectedOrder.description}</DialogDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      selectedOrder.status === "delivered"
                        ? "border-success/20 bg-success/10 text-success-foreground"
                        : selectedOrder.status === "approved"
                          ? "border-info/20 bg-info/10 text-info-foreground"
                          : selectedOrder.status === "cancelled"
                            ? "border-destructive/20 bg-destructive/10 text-destructive-foreground"
                            : "border-warning/20 bg-warning/10 text-warning-foreground"
                    }
                  >
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Supplier and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="size-4" />
                      <span>Fornecedor</span>
                    </div>
                    <p className="text-base font-medium">{selectedOrder.supplier}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="size-4" />
                      <span>Categoria</span>
                    </div>
                    <p className="text-base font-medium">{selectedOrder.category}</p>
                  </div>
                </div>

                {/* Values */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="size-4" />
                        <span>Valor Previsto</span>
                      </div>
                      <p className="font-mono text-2xl font-semibold">{formatCurrency(selectedOrder.estimatedValue)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="size-4" />
                        <span>Valor Realizado</span>
                      </div>
                      {selectedOrder.actualValue ? (
                        <div className="flex items-baseline gap-2">
                          <p className="font-mono text-2xl font-semibold">
                            {formatCurrency(selectedOrder.actualValue)}
                          </p>
                          {(() => {
                            const variance = calculateVariance(selectedOrder)
                            if (variance === null) return null
                            const isPositive = variance > 0
                            return (
                              <div
                                className={`flex items-center gap-1 text-sm ${isPositive ? "text-destructive" : "text-success"}`}
                              >
                                {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                                <span>{Math.abs(variance).toFixed(1)}%</span>
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        <p className="font-mono text-2xl font-semibold text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4" />
                    <span>Data de Entrega</span>
                  </div>
                  <p className="text-base font-medium">{formatDate(selectedOrder.deliveryDate)}</p>
                </div>

                {/* Integration Status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Status de Integração</span>
                  </div>
                  {selectedOrder.isIntegrated ? (
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-success-foreground">
                      Integrado ao Módulo Financeiro
                    </Badge>
                  ) : (
                    <Badge variant="outline">Não integrado</Badge>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
                  Fechar
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(`/compra/${selectedOrder.id}`)}>
                  Editar Pedido
                </Button>
                {!selectedOrder.isIntegrated && <Button type="button">Integrar ao Financeiro</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
