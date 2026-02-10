"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Plus, Trash2, MapPin } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useParams } from "next/navigation"

interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

interface DeliveryAddress {
  customerName: string
  phone: string
  address: string
  googleMapsLink: string
}

// Mock data - em produção viria do banco de dados
const mockOrderData = {
  "1": {
    id: "1",
    number: "PC-2025-001",
    description: "Telhas cerâmicas romanas marfim resinadas - 300 unidades para cobertura residencial",
    category: "Telha",
    status: "entregue",
    estimatedValue: 2500.0,
    actualValue: 2300.0,
    deliveryDate: "2025-02-14",
    isIntegrated: true,
    supplier: "Cerâmica Itaitinga Ltda",
    projectId: "obra1",
    items: [
      {
        id: "1",
        name: "Telha: romana marfim resinada",
        quantity: 300,
        unitPrice: 3.0,
        total: 900.0,
      },
    ],
    freight: 50.0,
    observations: "Entregar até às 14h",
    deliveryAddress: {
      customerName: "João Silva",
      phone: "(85) 99999-9999",
      address: "Rua das Flores, 123, Apt 201, Centro, Fortaleza - CE, 60000-000",
      googleMapsLink: "https://maps.google.com/?q=-3.7319,-38.5267",
    },
  },
  "2": {
    id: "2",
    number: "PC-2025-002",
    description: "Cimento Portland CP-II 50kg - 200 sacas para fundação",
    category: "Materiais",
    status: "aguardando-entrega",
    estimatedValue: 3200.0,
    actualValue: 3200.0,
    deliveryDate: "2025-02-20",
    isIntegrated: true,
    supplier: "Distribuidora Central Ltda",
    projectId: "none",
    items: [],
    freight: 0,
    observations: "",
    deliveryAddress: {
      customerName: "",
      phone: "",
      address: "",
      googleMapsLink: "",
    },
  },
  "3": {
    id: "3",
    number: "PC-2025-003",
    description: "Areia média lavada - 15m³ para reboco e contrapiso",
    category: "Materiais",
    status: "aprovado",
    estimatedValue: 1800.0,
    actualValue: 2100.0,
    deliveryDate: "2025-02-18",
    isIntegrated: false,
    supplier: "Areião do João",
    projectId: "none",
    items: [],
    freight: 0,
    observations: "",
    deliveryAddress: {
      customerName: "",
      phone: "",
      address: "",
      googleMapsLink: "",
    },
  },
  "4": {
    id: "4",
    number: "PC-2025-004",
    description: "Andaime metálico tubular 30m² - Locação por 60 dias",
    category: "Andaime",
    status: "pendente",
    estimatedValue: 4500.0,
    actualValue: null,
    deliveryDate: "2025-02-25",
    isIntegrated: false,
    supplier: "Locações União",
    projectId: "none",
    items: [],
    freight: 0,
    observations: "",
    deliveryAddress: {
      customerName: "",
      phone: "",
      address: "",
      googleMapsLink: "",
    },
  },
  "5": {
    id: "5",
    number: "PC-2025-005",
    description: "Madeira pinus tratada 6x12x3m - 50 peças para telhado",
    category: "Madeira",
    status: "rascunho",
    estimatedValue: 2700.0,
    actualValue: null,
    deliveryDate: "2025-03-01",
    isIntegrated: false,
    supplier: "Madeireira Boa Vista",
    projectId: "none",
    items: [],
    freight: 0,
    observations: "",
    deliveryAddress: {
      customerName: "",
      phone: "",
      address: "",
      googleMapsLink: "",
    },
  },
}

// Mock data - em produção viria do banco de dados
const mockProjects = {
  none: {
    id: "none",
    name: "Nenhuma obra selecionada",
    deliveryAddress: {
      customerName: "",
      phone: "",
      address: "",
      googleMapsLink: "",
    },
  },
  obra1: {
    id: "obra1",
    name: "Residencial Jardins - Fase 2",
    deliveryAddress: {
      customerName: "João Silva",
      phone: "(85) 99999-9999",
      address: "Rua das Flores, 123, Apt 201, Centro, Fortaleza - CE, 60000-000",
      googleMapsLink: "https://maps.google.com/?q=-3.7319,-38.5267",
    },
  },
  obra2: {
    id: "obra2",
    name: "Edifício Horizonte",
    deliveryAddress: {
      customerName: "Maria Santos",
      phone: "(85) 98888-8888",
      address: "Av. Beira Mar, 456, Meireles, Fortaleza - CE, 60165-121",
      googleMapsLink: "https://maps.google.com/?q=-3.7301,-38.4938",
    },
  },
  obra3: {
    id: "obra3",
    name: "Casa Térrea - Eusébio",
    deliveryAddress: {
      customerName: "Pedro Oliveira",
      phone: "(85) 97777-7777",
      address: "Rua do Sol, 789, Centro, Eusébio - CE, 61760-000",
      googleMapsLink: "https://maps.google.com/?q=-3.8890,-38.4512",
    },
  },
}

export default function EditPurchaseOrderPage() {
  const params = useParams()
  const id = params.id as string

  const [formData, setFormData] = useState(() => {
    const orderData = mockOrderData[id as keyof typeof mockOrderData]
    if (!orderData) {
      return {
        description: "",
        category: "",
        supplier: "",
        estimatedValue: "",
        actualValue: "",
        deliveryDate: "",
        status: "rascunho",
        isIntegrated: false,
        number: "",
        projectId: "none",
      }
    }
    return {
      description: orderData.description,
      category: orderData.category,
      supplier: orderData.supplier,
      estimatedValue: orderData.estimatedValue?.toString(),
      actualValue: orderData.actualValue?.toString() || "",
      deliveryDate: orderData.deliveryDate,
      status: orderData.status,
      isIntegrated: orderData.isIntegrated,
      number: orderData.number,
      projectId: orderData.projectId || "none",
    }
  })

  const [items, setItems] = useState<OrderItem[]>(() => {
    const orderData = mockOrderData[id as keyof typeof mockOrderData]
    return orderData?.items || []
  })

  const [freight, setFreight] = useState(() => {
    const orderData = mockOrderData[id as keyof typeof mockOrderData]
    return orderData?.freight?.toString() || "0"
  })

  const [observations, setObservations] = useState(() => {
    const orderData = mockOrderData[id as keyof typeof mockOrderData]
    return orderData?.observations || ""
  })

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(() => {
    const orderData = mockOrderData[id as keyof typeof mockOrderData]
    return (
      orderData?.deliveryAddress || {
        customerName: "",
        phone: "",
        address: "",
        googleMapsLink: "",
      }
    )
  })

  const addItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 0,
      unitPrice: 0,
      total: 0,
    }
    setItems([...items, newItem])
  }

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate total if quantity or unitPrice changed
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Saving purchase order:", {
      ...formData,
      items,
      freight,
      observations,
      deliveryAddress,
      subtotal: calculateSubtotal(),
    })
    alert("Pedido salvo com sucesso! (implementar lógica real de salvamento)")
  }

  const calculateSubtotal = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0)
    const freightValue = Number.parseFloat(freight) || 0
    return itemsTotal + freightValue
  }

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, projectId })
    const project = mockProjects[projectId as keyof typeof mockProjects]
    if (project && projectId !== "none") {
      setDeliveryAddress(project.deliveryAddress)
    }
  }

  const orderData = mockOrderData[id as keyof typeof mockOrderData]

  if (!orderData) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Pedido não encontrado: {id}</p>
          <Button asChild className="mt-4">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const statusLabels = {
    rascunho: "Rascunho",
    pendente: "Pendente",
    aprovado: "Aprovado",
    "em-compra": "Em Compra",
    "aguardando-pagamento": "Aguardando Pagamento",
    "aguardando-entrega": "Aguardando Entrega",
    entregue: "Entregue",
    cancelado: "Cancelado",
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-mono text-2xl font-semibold">#{orderData.number}</h1>
            <p className="text-sm text-muted-foreground">Editar Pedido de Compra</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            formData.status === "entregue"
              ? "border-green-500/20 bg-green-500/10 text-green-700"
              : formData.status === "aprovado"
                ? "border-blue-500/20 bg-blue-500/10 text-blue-700"
                : formData.status === "cancelado"
                  ? "border-red-500/20 bg-red-500/10 text-red-700"
                  : "border-yellow-500/20 bg-yellow-500/10 text-yellow-700"
          }
        >
          {statusLabels[formData.status as keyof typeof statusLabels]}
        </Badge>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <div className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Pedido</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Telhas cerâmicas - 100 unidades"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Obra</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Selecione uma obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma obra</SelectItem>
                  <SelectItem value="obra1">Residencial Jardins - Fase 2</SelectItem>
                  <SelectItem value="obra2">Edifício Horizonte</SelectItem>
                  <SelectItem value="obra3">Casa Térrea - Eusébio</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ao selecionar uma obra, o endereço de entrega será preenchido automaticamente
              </p>
            </div>

            {/* Category and Supplier */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione uma categoria" />
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

              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
            </div>

            {/* Values */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Valor Previsto (R$)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualValue">Valor Realizado (R$)</Label>
                <Input
                  id="actualValue"
                  type="number"
                  step="0.01"
                  value={formData.actualValue}
                  onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">Deixe vazio se ainda não foi realizado</p>
              </div>
            </div>

            {/* Delivery Date and Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Data de Entrega</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status do Pedido</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="em-compra">Em Compra</SelectItem>
                    <SelectItem value="aguardando-pagamento">Aguardando Pagamento</SelectItem>
                    <SelectItem value="aguardando-entrega">Aguardando Entrega</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Integration Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isIntegrated" className="text-base">
                  Integração Financeira
                </Label>
                <p className="text-sm text-muted-foreground">Indica se o pedido foi integrado ao módulo financeiro</p>
              </div>
              <Switch
                id="isIntegrated"
                checked={formData.isIntegrated}
                onCheckedChange={(checked) => setFormData({ ...formData, isIntegrated: checked })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Itens do Pedido</h2>
            <Button type="button" onClick={addItem} size="sm" className="gap-2">
              <Plus className="size-4" />
              Adicionar Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda</p>
                <Button type="button" onClick={addItem} size="sm" variant="outline" className="mt-2 bg-transparent">
                  Adicionar primeiro item
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="size-8"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-12">
                      <div className="md:col-span-5">
                        <Label className="text-xs">Nome do Item</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          placeholder="Ex: Telha romana marfim resinada"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Valor Unitário (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Preço Total</Label>
                        <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-background px-3 font-mono text-sm">
                          R$ {item.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freight">Frete (R$)</Label>
                <Input
                  id="freight"
                  type="number"
                  step="0.01"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-lg border border-border bg-muted/50 p-3">
                  <div className="text-sm text-muted-foreground">Subtotal</div>
                  <div className="font-mono text-2xl font-semibold">R$ {calculateSubtotal().toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Adicione observações sobre o pedido..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-5" />
            Endereço de Entrega
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome do Cliente</Label>
                <Input
                  id="customerName"
                  value={deliveryAddress.customerName}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, customerName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={deliveryAddress.phone}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Textarea
                id="address"
                value={deliveryAddress.address}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, address: e.target.value })}
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleMapsLink">Link do Google Maps</Label>
              <Input
                id="googleMapsLink"
                value={deliveryAddress.googleMapsLink}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, googleMapsLink: e.target.value })}
                placeholder="https://maps.google.com/?q=..."
              />
              {deliveryAddress.googleMapsLink && (
                <a
                  href={deliveryAddress.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <MapPin className="size-3" />
                  Abrir no Google Maps
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/">Cancelar</Link>
          </Button>
          <Button type="submit" className="gap-2">
            <Save className="size-4" />
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  )
}
