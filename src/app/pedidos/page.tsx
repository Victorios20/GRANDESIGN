"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"

import { useState } from "react"
import { Search, Plus, Home, ChevronRight, X, LayoutList, LayoutGrid, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseOrderModal } from "@/components/purchase-order-modal"
import { CreatePurchaseOrderModal } from "@/components/create-purchase-order-modal"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Calendar, TrendingDown, TrendingUp } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

type PurchaseOrderStatus =
  | "rascunho"
  | "pendente"
  | "aprovado"
  | "em-compra"
  | "aguardando-pagamento"
  | "aguardando-entrega"
  | "entregue"
  | "cancelado"

type PurchaseOrderCategory = "Madeira" | "Telha" | "Andaime" | "Materiais" | "Outros"

interface PurchaseOrder {
  id: string
  number: string
  description: string
  category: PurchaseOrderCategory
  supplier: string
  project: string
  expectedValue: number
  actualValue?: number
  deliveryDate: string
  status: PurchaseOrderStatus
  integrated: boolean
  integratedCode?: string
  viewed?: boolean
  createdAt: string
}

const mockOrders: PurchaseOrder[] = [
  {
    id: "1",
    number: "PC-2025-001",
    description: "Telhas cerâmicas romanas marfim resinadas - 300 unidades para cobertura residencial",
    category: "Telha",
    supplier: "Cerâmica Itaitinga Ltda",
    project: "Obra Residencial - Cliente Silva",
    expectedValue: 2500.0,
    actualValue: 2300.0,
    deliveryDate: "2025-02-14",
    status: "entregue",
    integrated: true,
    integratedCode: "CP-2025-015",
    viewed: true,
    createdAt: "2025-01-05T10:30:00",
  },
  {
    id: "2",
    number: "PC-2025-002",
    description: "Cimento Portland CP-II 50kg - 200 sacas para fundação",
    category: "Materiais",
    supplier: "Distribuidora Central Ltda",
    project: "Obra Comercial - Shopping Norte",
    expectedValue: 3200.0,
    deliveryDate: "2025-02-20",
    status: "aguardando-entrega",
    integrated: true,
    integratedCode: "CP-2025-018",
    viewed: false,
    createdAt: "2025-01-07T14:20:00",
  },
  {
    id: "3",
    number: "PC-2025-003",
    description: "Areia média lavada - 15m³ para reboco e contrapiso",
    category: "Materiais",
    supplier: "Areião do João",
    project: "Obra Residencial - Cliente Santos",
    expectedValue: 1800.0,
    actualValue: 2100.0,
    deliveryDate: "2025-02-15",
    status: "aprovado",
    integrated: false,
    viewed: true,
    createdAt: "2025-01-03T09:15:00",
  },
  {
    id: "4",
    number: "PC-2025-004",
    description: "Andaime metálico tubular 30m² - Locação por 60 dias",
    category: "Andaime",
    supplier: "Locações União",
    project: "Obra Residencial - Cliente Oliveira",
    expectedValue: 4500.0,
    deliveryDate: "2025-02-25",
    status: "pendente",
    integrated: false,
    viewed: false,
    createdAt: "2025-01-06T16:45:00",
  },
  {
    id: "5",
    number: "PC-2025-005",
    description: "Madeira pinus tratada 6x12x3m - 50 peças para telhado",
    category: "Madeira",
    supplier: "Madeireira Boa Vista",
    project: "Obra Comercial - Galpão Industrial",
    expectedValue: 2700.0,
    deliveryDate: "2025-03-01",
    status: "rascunho",
    integrated: false,
    viewed: false,
    createdAt: "2025-01-07T11:00:00",
  },
  {
    id: "6",
    number: "PC-2025-006",
    description: "Caibros de madeira 5x6cm - 100 peças",
    category: "Madeira",
    supplier: "Madeireira Boa Vista",
    project: "Obra Residencial - Cliente Pereira",
    expectedValue: 3800.0,
    deliveryDate: "2025-02-28",
    status: "em-compra",
    integrated: false,
    viewed: true,
    createdAt: "2025-01-04T13:30:00",
  },
  {
    id: "7",
    number: "PC-2025-007",
    description: "Telha colonial cerâmica natural - 500 unidades",
    category: "Telha",
    supplier: "Cerâmica Itaitinga Ltda",
    project: "Obra Residencial - Cliente Santos",
    expectedValue: 1950.0,
    deliveryDate: "2025-03-05",
    status: "pendente",
    integrated: false,
    viewed: false,
    createdAt: "2025-01-07T08:00:00",
  },
]

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"category" | "status">("category")
  const [showEmptyColumns, setShowEmptyColumns] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>(mockOrders)
  const [draggedItem, setDraggedItem] = useState<PurchaseOrder | null>(null)
  const [sortBy, setSortBy] = useState<"date" | "value" | "delivery" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const statusCounts = {
    todos: orders.length,
    rascunho: orders.filter((o) => o.status === "rascunho").length,
    pendente: orders.filter((o) => o.status === "pendente").length,
    aprovado: orders.filter((o) => o.status === "aprovado").length,
    "em-compra": orders.filter((o) => o.status === "em-compra").length,
    "aguardando-pagamento": orders.filter((o) => o.status === "aguardando-pagamento").length,
    "aguardando-entrega": orders.filter((o) => o.status === "aguardando-entrega").length,
    entregue: orders.filter((o) => o.status === "entregue").length,
    cancelado: orders.filter((o) => o.status === "cancelado").length,
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesProject = selectedProject === "all" || order.project === selectedProject
    const matchesSupplier = selectedSupplier === "all" || order.supplier === selectedSupplier
    const matchesStatus = selectedStatus === "todos" || order.status === selectedStatus

    return matchesSearch && matchesProject && matchesSupplier && matchesStatus
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "date":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "value":
        comparison = a.expectedValue - b.expectedValue
        break
      case "delivery":
        comparison =
          new Date(a.deliveryDate || "9999-12-31").getTime() - new Date(b.deliveryDate || "9999-12-31").getTime()
        break
      case "status":
        const statusOrder = [
          "rascunho",
          "pendente",
          "aprovado",
          "em-compra",
          "aguardando-pagamento",
          "aguardando-entrega",
          "entregue",
          "cancelado",
        ]
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage)

  const hasActiveFilters = selectedProject !== "all" || selectedSupplier !== "all" || searchTerm !== ""

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedProject("all")
    setSelectedSupplier("all")
  }

  const statusConfig = {
    rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-800 border-gray-300" },
    pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    aprovado: { label: "Aprovado", color: "bg-blue-100 text-blue-800 border-blue-300" },
    "em-compra": { label: "Em Compra", color: "bg-purple-100 text-purple-800 border-purple-300" },
    "aguardando-pagamento": {
      label: "Aguardando Pagamento",
      color: "bg-orange-100 text-orange-800 border-orange-300",
    },
    "aguardando-entrega": { label: "Aguardando Entrega", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
    entregue: { label: "Entregue", color: "bg-green-100 text-green-800 border-green-300" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300" },
  }

  const categories: PurchaseOrderCategory[] = ["Madeira", "Telha", "Andaime", "Materiais", "Outros"]

  const statuses: PurchaseOrderStatus[] = [
    "rascunho",
    "pendente",
    "aprovado",
    "em-compra",
    "aguardando-pagamento",
    "aguardando-entrega",
    "entregue",
    "cancelado",
  ]

  const ordersByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = sortedOrders.filter((order) => order.category === category)
      return acc
    },
    {} as Record<PurchaseOrderCategory, PurchaseOrder[]>,
  )

  const ordersByStatus = statuses.reduce(
    (acc, status) => {
      acc[status] = sortedOrders.filter((order) => order.status === status)
      return acc
    },
    {} as Record<PurchaseOrderStatus, PurchaseOrder[]>,
  )

  const getDisplayGroups = () => {
    if (kanbanGroupBy === "category") {
      if (showEmptyColumns) {
        return categories.map((cat) => ({ key: cat, label: cat, orders: ordersByCategory[cat] }))
      }
      return categories
        .filter((cat) => ordersByCategory[cat].length > 0)
        .map((cat) => ({ key: cat, label: cat, orders: ordersByCategory[cat] }))
    } else {
      if (showEmptyColumns) {
        return statuses.map((status) => ({
          key: status,
          label: statusConfig[status].label,
          orders: ordersByStatus[status],
        }))
      }
      return statuses
        .filter((status) => ordersByStatus[status].length > 0)
        .map((status) => ({
          key: status,
          label: statusConfig[status].label,
          orders: ordersByStatus[status],
        }))
    }
  }

  const handleDragStart = (e: React.DragEvent, order: PurchaseOrder) => {
    setDraggedItem(order)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault()
    if (!draggedItem) return

    const updatedOrders = orders.map((order) => {
      if (order.id === draggedItem.id) {
        if (kanbanGroupBy === "status") {
          return { ...order, status: targetGroup as PurchaseOrderStatus }
        } else {
          return { ...order, category: targetGroup as PurchaseOrderCategory }
        }
      }
      return order
    })

    setOrders(updatedOrders)
    setDraggedItem(null)
  }

  const handleOrderClick = (order: PurchaseOrder) => {
    const updatedOrders = orders.map((o) => (o.id === order.id ? { ...o, viewed: true } : o))
    setOrders(updatedOrders)
    setSelectedOrder(order)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-64">
        <DashboardTopbar
          title="Pedidos de Compra"
          showNewButton={true}
          newButtonLabel="Novo Pedido"
          onNewClick={() => setIsCreateModalOpen(true)}
        />
        <main className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 border rounded-xl p-1 bg-card">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3 rounded-lg"
              >
                <LayoutList className="w-4 h-4 mr-2" />
                Lista
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className="h-8 px-3 rounded-lg"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban
              </Button>
            </div>
          </div>

          {/* Kanban configuration controls */}
          {viewMode === "kanban" && (
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Agrupar por:</span>
                  <Select value={kanbanGroupBy} onValueChange={(v) => setKanbanGroupBy(v as "category" | "status")}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Categoria</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Mostrar colunas vazias:</span>
                  <Button
                    variant={showEmptyColumns ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowEmptyColumns(!showEmptyColumns)}
                    className="h-8"
                  >
                    {showEmptyColumns ? "Sim" : "Não"}
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Ordenar por:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data de Criação</SelectItem>
                      <SelectItem value="value">Valor</SelectItem>
                      <SelectItem value="delivery">Data de Entrega</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-card border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, fornecedor ou descrição"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as obras</SelectItem>
                  <SelectItem value="Obra Residencial - Cliente Silva">Obra Residencial - Cliente Silva</SelectItem>
                  <SelectItem value="Obra Comercial - Shopping Norte">Obra Comercial - Shopping Norte</SelectItem>
                  <SelectItem value="Obra Residencial - Cliente Santos">Obra Residencial - Cliente Santos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  <SelectItem value="Cerâmica Itaitinga Ltda">Cerâmica Itaitinga Ltda</SelectItem>
                  <SelectItem value="Distribuidora Central Ltda">Distribuidora Central Ltda</SelectItem>
                  <SelectItem value="Areião do João">Areião do João</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Status Tabs */}
          {viewMode === "list" && (
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
                <TabsTrigger value="todos" className="gap-2">
                  Todos <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.todos}</span>
                </TabsTrigger>
                <TabsTrigger value="rascunho" className="gap-2">
                  Rascunho <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.rascunho}</span>
                </TabsTrigger>
                <TabsTrigger value="pendente" className="gap-2">
                  Pendente <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.pendente}</span>
                </TabsTrigger>
                <TabsTrigger value="aprovado" className="gap-2">
                  Aprovado <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.aprovado}</span>
                </TabsTrigger>
                <TabsTrigger value="em-compra" className="gap-2">
                  Em Compra <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["em-compra"]}</span>
                </TabsTrigger>
                <TabsTrigger value="aguardando-pagamento" className="gap-2 whitespace-nowrap">
                  Aguardando Pagamento{" "}
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["aguardando-pagamento"]}</span>
                </TabsTrigger>
                <TabsTrigger value="aguardando-entrega" className="gap-2 whitespace-nowrap">
                  Aguardando Entrega{" "}
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts["aguardando-entrega"]}</span>
                </TabsTrigger>
                <TabsTrigger value="entregue" className="gap-2">
                  Entregue <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.entregue}</span>
                </TabsTrigger>
                <TabsTrigger value="cancelado" className="gap-2">
                  Cancelado <span className="bg-muted px-2 py-0.5 rounded text-xs">{statusCounts.cancelado}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {viewMode === "list" && (
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm font-medium">Ordenar por:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Data de Criação</SelectItem>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="delivery">Data de Entrega</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 w-9 p-0"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          {paginatedOrders.length > 0 ? (
            <>
              {viewMode === "list" ? (
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
                      {paginatedOrders.map((order) => {
                        const variance =
                          order.actualValue && order.expectedValue
                            ? ((order.actualValue - order.expectedValue) / order.expectedValue) * 100
                            : null

                        return (
                          <tr
                            key={order.id}
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleOrderClick(order)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {!order.viewed && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Novo pedido" />
                                )}
                                <div>
                                  <div className="font-mono text-sm font-medium">{order.number}</div>
                                  <div className="text-xs text-muted-foreground">{order.supplier}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm line-clamp-2 max-w-md">{order.description}</div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-medium">
                                {order.category}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={statusConfig[order.status].color}>
                                {statusConfig[order.status].label}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-medium">
                                {order.expectedValue.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </div>
                            </td>
                            <td className="p-4">
                              {order.actualValue ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {order.actualValue.toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}
                                  </div>
                                  {variance !== null && (
                                    <div
                                      className={`flex items-center gap-1 text-xs ${variance > 0 ? "text-red-600" : "text-green-600"}`}
                                    >
                                      {variance > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                      ) : (
                                        <TrendingDown className="w-3 h-3" />
                                      )}
                                      {Math.abs(variance).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              {order.deliveryDate ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {new Date(order.deliveryDate).toLocaleDateString("pt-BR")}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              {order.integrated ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                  {order.integratedCode}
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
                                  <DropdownMenuItem onClick={() => handleOrderClick(order)}>
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/compra/${order.id}`}>Editar pedido</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">Cancelar pedido</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-6 overflow-x-auto pb-4">
                    {getDisplayGroups().map((group) => (
                      <div
                        key={group.key}
                        className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, group.key)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-sm">{group.label}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {group.orders.length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {group.orders.map((order) => {
                            const variance =
                              order.actualValue && order.expectedValue
                                ? ((order.actualValue - order.expectedValue) / order.expectedValue) * 100
                                : null

                            return (
                              <div
                                key={order.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, order)}
                                className="bg-card border rounded-lg p-4 space-y-3 cursor-move hover:shadow-md transition-shadow"
                                onClick={() => handleOrderClick(order)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {!order.viewed && (
                                      <div
                                        className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse"
                                        title="Novo pedido"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-mono text-xs font-medium">#{order.number}</div>
                                      <div className="text-xs text-muted-foreground truncate">{order.supplier}</div>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOrderClick(order)}>
                                        Ver detalhes
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/compra/${order.id}`}>Editar pedido</Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-red-600">Cancelar pedido</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <p className="text-sm line-clamp-2">{order.description}</p>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {kanbanGroupBy === "status" && (
                                    <Badge variant="outline" className="text-xs">
                                      {order.category}
                                    </Badge>
                                  )}
                                  {kanbanGroupBy === "category" && (
                                    <Badge variant="outline" className={`text-xs ${statusConfig[order.status].color}`}>
                                      {statusConfig[order.status].label}
                                    </Badge>
                                  )}
                                </div>

                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Previsto:</span>
                                    <span className="font-medium">
                                      {order.expectedValue.toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      })}
                                    </span>
                                  </div>
                                  {order.actualValue && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Realizado:</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {order.actualValue.toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                          })}
                                        </span>
                                        {variance !== null && (
                                          <span
                                            className={`flex items-center gap-0.5 ${variance > 0 ? "text-red-600" : "text-green-600"}`}
                                          >
                                            {variance > 0 ? (
                                              <TrendingUp className="w-3 h-3" />
                                            ) : (
                                              <TrendingDown className="w-3 h-3" />
                                            )}
                                            {Math.abs(variance).toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {order.deliveryDate && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(order.deliveryDate).toLocaleDateString("pt-BR")}
                                  </div>
                                )}

                                {order.integrated && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-300 text-xs w-full justify-center"
                                  >
                                    {order.integratedCode}
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                          {group.orders.length === 0 && (
                            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum pedido</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum pedido encontrado</p>
            </div>
          )}

          {/* Pagination */}
          {viewMode === "list" && totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedOrders.length)} de{" "}
                {sortedOrders.length} pedidos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedOrder && <PurchaseOrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {isCreateModalOpen && (
        <CreatePurchaseOrderModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  )
}
