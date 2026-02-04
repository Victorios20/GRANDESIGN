"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreatePurchaseOrderModalProps {
  open: boolean
  onClose: () => void
}

interface PurchaseItem {
  id: string
  name: string
  quantity: string
  unitPrice: string
}

export function CreatePurchaseOrderModal({ open, onClose }: CreatePurchaseOrderModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    supplier: "",
    project: "",
    expectedValue: "",
    deliveryDate: "",
    status: "rascunho",
  })

  const [items, setItems] = useState<PurchaseItem[]>([{ id: "1", name: "", quantity: "", unitPrice: "" }])
  const [showError, setShowError] = useState(false)

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", quantity: "", unitPrice: "" }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof PurchaseItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const hasValidItem = items.some(
    (item) => item.name.trim() !== "" && item.quantity.trim() !== "" && item.unitPrice.trim() !== "",
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasValidItem) {
      setShowError(true)
      return
    }

    setShowError(false)
    console.log("[v0] Creating purchase order:", formData, items)
    const newId = Math.random().toString(36).substr(2, 9)
    router.push(`/compra/${newId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição do Pedido</Label>
            <Textarea
              id="description"
              placeholder="Ex: Telhas cerâmicas romanas marfim - 300 unidades"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
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

            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cerâmica Itaitinga Ltda">Cerâmica Itaitinga Ltda</SelectItem>
                  <SelectItem value="Distribuidora Central Ltda">Distribuidora Central Ltda</SelectItem>
                  <SelectItem value="Areião do João">Areião do João</SelectItem>
                  <SelectItem value="Cerâmica São José">Cerâmica São José</SelectItem>
                  <SelectItem value="Ferro & Aço Distribuidora">Ferro & Aço Distribuidora</SelectItem>
                  <SelectItem value="Madeireira Boa Vista">Madeireira Boa Vista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="project">Obra</Label>
            <Select value={formData.project} onValueChange={(value) => setFormData({ ...formData, project: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Obra Residencial - Cliente Silva">Obra Residencial - Cliente Silva</SelectItem>
                <SelectItem value="Obra Comercial - Shopping Norte">Obra Comercial - Shopping Norte</SelectItem>
                <SelectItem value="Obra Residencial - Cliente Santos">Obra Residencial - Cliente Santos</SelectItem>
                <SelectItem value="Obra Residencial - Cliente Oliveira">Obra Residencial - Cliente Oliveira</SelectItem>
                <SelectItem value="Obra Comercial - Galpão Industrial">Obra Comercial - Galpão Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Produtos do Pedido *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {showError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Adicione pelo menos um produto com nome, quantidade e valor unitário.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Produto</th>
                    <th className="text-left p-3 text-sm font-medium w-24">Qtd</th>
                    <th className="text-left p-3 text-sm font-medium w-32">Valor Unit.</th>
                    <th className="text-left p-3 text-sm font-medium w-32">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const total = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">
                          <Input
                            placeholder="Ex: Telha romana marfim resinada"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-sm font-medium">{total > 0 ? `R$ ${total.toFixed(2)}` : "-"}</td>
                        <td className="p-2">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expectedValue">Valor Previsto</Label>
              <Input
                id="expectedValue"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.expectedValue}
                onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="deliveryDate">Data de Entrega</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status Inicial</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Criar e Editar Detalhes
            </Button>
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
