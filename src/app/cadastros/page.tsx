"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Toaster, toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  TreePine,
  Home,
  Truck,
  Users,
  Search,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getFornecedores, createFornecedor, updateFornecedor, deleteFornecedor,
  getMateriais, createMaterial, updateMaterial, deleteMaterial,
  getComponentes, createComponente, updateComponente, deleteComponente,
  FornecedorDTO, MaterialDTO, ComponenteDTO
} from "@/services/api/cadastros"

// Types mapping for UI consistency


export default function CadastrosPage() {
  // Navigation state
  type Category = "fornecedores" | "materiais" | "componentes" | "equipes"
  const [activeCategory, setActiveCategory] = useState<Category>("fornecedores")
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorDTO | null>(null)

  // Data state
  const [materiais, setMateriais] = useState<MaterialDTO[]>([])
  const [componentes, setComponentes] = useState<ComponenteDTO[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorDTO[]>([])
  const [equipes, setEquipes] = useState<{ id: number, nome: string }[]>([]) // Placeholder for equipes

  // Loading states
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"material" | "componente" | "fornecedor" | "madeira" | "telha" | "equipe">("material")
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: string; item: any } | null>(null)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})

  // Navigation categories config
  const categories = [
    {
      id: "fornecedores" as Category,
      label: "Fornecedores",
      icon: Truck,
      description: "Gerencie fornecedores de madeira, telha e material",
      count: fornecedores.length
    },
    {
      id: "materiais" as Category,
      label: "Materiais",
      icon: Package,
      description: "Cadastre materiais de construção",
      count: materiais.filter(m => m.tipo === 'geral' || !m.tipo).length
    },
    {
      id: "componentes" as Category,
      label: "Componentes",
      icon: Package,
      description: "Gerencie componentes de estrutura",
      count: componentes.length
    },
    {
      id: "equipes" as Category,
      label: "Equipes",
      icon: Users,
      description: "Cadastre equipes de trabalho",
      count: equipes.length
    },
  ]

  // Fetch functions
  const loadFornecedores = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getFornecedores()
      setFornecedores(data)
    } catch (error) {
      toast.error("Erro ao carregar fornecedores")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMateriais = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMateriais()
      setMateriais(data)
    } catch (error) {
      toast.error("Erro ao carregar materiais")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadComponentes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getComponentes()
      setComponentes(data)
    } catch (error) {
      toast.error("Erro ao carregar componentes")
    } finally {
      setLoading(false)
    }
  }, [])

  // Equipes not implemented in API yet, keeping empty or mock implementation logic if needed
  // For now we skip or mock locally if needed, but the plan didn't focus on Equipes. 
  // I will leave equipes empty for now as it wasn't in the API service.

  useEffect(() => {
    loadFornecedores()
    loadMateriais()
    loadComponentes()
  }, [loadFornecedores, loadMateriais, loadComponentes])

  // Helpers
  function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  function getTipoFornecedorLabel(tipo: string): string {
    const labels: Record<string, string> = {
      madeira: "Madeira",
      telha: "Telha",
      material: "Material",
      geral: "Material"
    }
    return labels[tipo] || tipo
  }

  function getTipoFornecedorColor(tipo: string): string {
    const colors: Record<string, string> = {
      madeira: "bg-amber-100 text-amber-800 border-amber-200",
      telha: "bg-orange-100 text-orange-800 border-orange-200",
      material: "bg-blue-100 text-blue-800 border-blue-200",
      geral: "bg-gray-100 text-gray-800 border-gray-200"
    }
    return colors[tipo] || "bg-gray-100"
  }

  function getTipoFornecedorIcon(tipo: string) {
    const icons: Record<string, any> = {
      madeira: TreePine,
      telha: Home,
      material: Package,
      geral: Package
    }
    return icons[tipo] || Package
  }

  // Filter data based on search and context
  const getFilteredData = () => {
    const term = searchTerm.toLowerCase()

    if (selectedFornecedor) {
      // Show materials/woods/tiles for this provider
      return materiais
        .filter(m => m.fornecedorId === selectedFornecedor.id)
        .filter(m => m.descricao.toLowerCase().includes(term))
    }

    switch (activeCategory) {
      case "fornecedores":
        return fornecedores.filter(f =>
          f.nome.toLowerCase().includes(term) ||
          f.tipo.toLowerCase().includes(term)
        )
      case "materiais":
        // Show only 'geral' or 'material' type, or those without provider
        return materiais
          .filter(m => (!m.fornecedorId && (m.tipo === 'geral' || m.tipo === 'material')))
          .filter(m => m.descricao.toLowerCase().includes(term))
      case "componentes":
        return componentes.filter(c => c.nome.toLowerCase().includes(term))
      case "equipes":
        return equipes.filter(e => e.nome.toLowerCase().includes(term))
      default:
        return []
    }
  }

  // Open modal for adding
  const openAddModal = (type: typeof modalType) => {
    setModalType(type)
    setEditingItem(null)
    setFormData(
      type === "madeira" && selectedFornecedor
        ? { fornecedorId: String(selectedFornecedor.id), tipo: 'madeira' }
        : type === "telha" && selectedFornecedor
          ? { fornecedorId: String(selectedFornecedor.id), tipo: 'telha' }
          : type === "fornecedor"
            ? { tipo: "material" }
            : { tipo: 'geral' }
    )
    setModalOpen(true)
  }

  // Open modal for editing
  const openEditModal = (type: typeof modalType, item: any) => {
    setModalType(type)
    setEditingItem(item)
    const newFormData: Record<string, string> = {}

    // Map API fields to form data
    if (item.descricao) newFormData.nome = item.descricao
    if (item.nome) newFormData.nome = item.nome
    if (item.preco_unitario !== undefined) newFormData.preco = String(item.preco_unitario)
    if (item.tipo) newFormData.tipo = item.tipo

    setFormData(newFormData)
    setModalOpen(true)
  }

  // Handle delete
  const openDeleteDialog = (type: string, item: any) => {
    setItemToDelete({ type, item })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    setProcessing(true)

    const { type, item } = itemToDelete

    try {
      switch (type) {
        case "material":
        case "madeira":
        case "telha":
          await deleteMaterial(item.id)
          setMateriais(prev => prev.filter(m => m.id !== item.id))
          toast.success("Item excluído com sucesso")
          break
        case "componente":
          await deleteComponente(item.id)
          setComponentes(prev => prev.filter(c => c.id !== item.id))
          toast.success("Componente excluído com sucesso")
          break
        case "fornecedor":
          await deleteFornecedor(item.id)
          setFornecedores(prev => prev.filter(f => f.id !== item.id))
          toast.success("Fornecedor excluído com sucesso")
          break
        case "equipe":
          // Not implemented
          break
      }
    } catch (error) {
      toast.error("Erro ao excluir item")
    } finally {
      setProcessing(false)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  // Handle form submit
  const handleSubmit = async () => {
    setProcessing(true)
    const isEditing = editingItem !== null

    try {
      switch (modalType) {
        case "material":
        case "madeira":
        case "telha": {
          const tipo = modalType === "material" ? "geral" : modalType
          const payload = {
            descricao: formData.nome || "",
            tipo: (modalType === 'madeira' || modalType === 'telha') ? modalType : 'geral',
            preco_unitario: parseFloat(formData.preco?.replace(',', '.') || "0"),
            fornecedorId: (modalType === 'madeira' || modalType === 'telha') && selectedFornecedor ? selectedFornecedor.id : undefined,
          }

          if (isEditing) {
            await updateMaterial(editingItem.id, payload)
            toast.success("Atualizado com sucesso")
          } else {
            await createMaterial(payload)
            toast.success("Criado com sucesso")
          }
          await loadMateriais()
          break
        }
        case "componente": {
          const payload = { nome: formData.nome || "" }
          if (isEditing) {
            await updateComponente(editingItem.id, payload)
            toast.success("Componente atualizado")
          } else {
            await createComponente(payload)
            toast.success("Componente criado")
          }
          await loadComponentes()
          break
        }
        case "fornecedor": {
          const payload = {
            nome: formData.nome || "",
            tipo: formData.tipo || "material"
          }
          if (isEditing) {
            await updateFornecedor(editingItem.id, payload)
            toast.success("Fornecedor atualizado")
          } else {
            await createFornecedor(payload)
            toast.success("Fornecedor criado")
          }
          await loadFornecedores()
          break
        }
      }
      setModalOpen(false)
      setFormData({})
      setEditingItem(null)
    } catch (error) {
      toast.error("Erro ao salvar")
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  // Get modal title
  const getModalTitle = () => {
    const action = editingItem ? "Editar" : "Novo"
    const types: Record<typeof modalType, string> = {
      material: "Material",
      componente: "Componente",
      fornecedor: "Fornecedor",
      madeira: "Madeira",
      telha: "Telha",
      equipe: "Equipe",
    }
    return `${action} ${types[modalType]}`
  }

  // Get current add button type
  const getAddButtonType = (): typeof modalType => {
    if (selectedFornecedor) {
      return selectedFornecedor.tipo === "madeira" ? "madeira" : "telha"
    }
    switch (activeCategory) {
      case "fornecedores": return "fornecedor"
      case "materiais": return "material"
      case "componentes": return "componente"
      case "equipes": return "equipe"
      default: return "material"
    }
  }

  // Get current page title
  const getPageTitle = () => {
    if (selectedFornecedor) {
      return selectedFornecedor.nome
    }
    return categories.find(c => c.id === activeCategory)?.label || "Cadastros"
  }

  // Get current page description
  const getPageDescription = () => {
    if (selectedFornecedor) {
      const productCount = materiais.filter(m => m.fornecedorId === selectedFornecedor.id).length
      return `${productCount} itens cadastrados`
    }
    return categories.find(c => c.id === activeCategory)?.description || ""
  }

  // Handle fornecedor click
  const handleFornecedorClick = (fornecedor: FornecedorDTO) => {
    if (fornecedor.tipo === "material") return
    setSelectedFornecedor(fornecedor)
    setSearchTerm("")
  }

  // Handle back button
  const handleBack = () => {
    setSelectedFornecedor(null)
    setSearchTerm("")
  }

  // Handle category change
  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category)
    setSelectedFornecedor(null)
    setSearchTerm("")
  }

  const filteredData = getFilteredData()

  return (
    <DashboardLayout title="Cadastros">
      <Toaster richColors />
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                      activeCategory === category.id && !selectedFornecedor
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="w-5 h-5" />
                      <span className="font-medium">{category.label}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        activeCategory === category.id && !selectedFornecedor
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : ""
                      )}
                    >
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Card className="bg-card border-border h-full">
            {/* Header */}
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedFornecedor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="p-1.5 h-auto"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{getPageTitle()}</CardTitle>
                      {selectedFornecedor && (
                        <Badge className={getTipoFornecedorColor(selectedFornecedor.tipo)}>
                          {getTipoFornecedorLabel(selectedFornecedor.tipo)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{getPageDescription()}</p>
                  </div>
                </div>
                <Button
                  onClick={() => openAddModal(getAddButtonType())}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {/* Headers based on current view */}
                      {selectedFornecedor || activeCategory === "materiais" ? (
                        <>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Preço</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </>
                      ) : activeCategory === "fornecedores" ? (
                        <>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Nenhum item encontrado</p>
                            <p className="text-sm mt-1">Adicione um novo item ou ajuste sua busca</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => {
                        // Render based on current view
                        if (selectedFornecedor || activeCategory === "materiais") {
                          const product = item as MaterialDTO
                          const type = selectedFornecedor
                            ? (selectedFornecedor.tipo === "madeira" ? "madeira" : "telha")
                            : "material"

                          return (
                            <tr key={product.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium">{product.descricao}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{formatCurrency(Number(product.preco_unitario))}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditModal(type, product)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteDialog(type, product)}
                                    className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        if (activeCategory === "fornecedores") {
                          const fornecedor = item as FornecedorDTO
                          const Icon = getTipoFornecedorIcon(fornecedor.tipo)
                          const isClickable = fornecedor.tipo !== "material"
                          const productCount = materiais.filter(m => m.fornecedorId === fornecedor.id).length

                          return (
                            <tr
                              key={fornecedor.id}
                              onClick={() => isClickable && handleFornecedorClick(fornecedor)}
                              className={cn(
                                "border-b border-border/50 last:border-0 transition-colors",
                                isClickable ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"
                              )}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium">{fornecedor.nome}</span>
                                  {isClickable && (
                                    <Badge variant="outline" className="text-xs">
                                      {productCount} itens
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={cn("text-xs gap-1", getTipoFornecedorColor(fornecedor.tipo))}>
                                  <Icon className="w-3 h-3" />
                                  {getTipoFornecedorLabel(fornecedor.tipo)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {isClickable && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleFornecedorClick(fornecedor)
                                      }}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      aria-label="Ver produtos"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditModal("fornecedor", fornecedor)
                                    }}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDeleteDialog("fornecedor", fornecedor)
                                    }}
                                    className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        if (activeCategory === "componentes") {
                          const componente = item as ComponenteDTO
                          return (
                            <tr key={componente.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium">{componente.nome}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditModal("componente", componente)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteDialog("componente", componente)}
                                    className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        if (activeCategory === "equipes") {
                          // Empty for now
                          return null
                        }

                        return null
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getModalTitle()}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize as informações abaixo" : "Preencha as informações abaixo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome field - always present */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Digite o nome"
              />
            </div>

            {/* Price field - for materials, woods, tiles */}
            {(modalType === "material" || modalType === "madeira" || modalType === "telha") && (
              <div className="space-y-2">
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={formData.preco || ""}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            )}

            {/* Supplier type - for suppliers */}
            {modalType === "fornecedor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo || "material"}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="madeira">
                        <div className="flex items-center gap-2">
                          <TreePine className="w-4 h-4" />
                          Madeira
                        </div>
                      </SelectItem>
                      <SelectItem value="telha">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          Telha
                        </div>
                      </SelectItem>
                      <SelectItem value="material">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Material
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
