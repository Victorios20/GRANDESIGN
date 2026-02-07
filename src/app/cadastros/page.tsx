"use client"

import { useState, useEffect, useCallback } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Loader2,
  Construction,
  MapPin
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getFornecedores, createFornecedor, updateFornecedor, deleteFornecedor,
  getMateriais, createMaterial, updateMaterial, deleteMaterial,
  getComponentes, createComponente, updateComponente, deleteComponente,
  FornecedorDTO, MaterialDTO, ComponenteDTO
} from "@/services/api/cadastros"

export default function CadastrosPage() {
  // Navigation state
  type Category = "fornecedores" | "materiais" | "telhas" | "componentes" | "equipes" | "cidades"
  const [activeCategory, setActiveCategory] = useState<Category>("fornecedores")
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorDTO | null>(null)

  // Data state
  const [materiais, setMateriais] = useState<MaterialDTO[]>([])
  const [componentes, setComponentes] = useState<ComponenteDTO[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorDTO[]>([])
  const [equipes, setEquipes] = useState<{ id: number; nome: string; cor: string | null }[]>([])
  const [cidades, setCidades] = useState<{ id: number; nome: string; cor: string | null }[]>([])

  // Loading states
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"material" | "componente" | "fornecedor" | "madeira" | "telha" | "equipe" | "cidade">("material")
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: string; item: any } | null>(null)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})

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

  const loadEquipes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/equipes")
      if (!res.ok) throw new Error("Falha ao buscar equipes")
      const json = await res.json()
      setEquipes(json.data || [])
    } catch (error) {
      toast.error("Erro ao carregar equipes")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCidades = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/cidades")
      if (!res.ok) throw new Error("Falha ao buscar cidades")
      const json = await res.json()
      setCidades(json || [])
    } catch (error) {
      toast.error("Erro ao carregar cidades")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadData = useCallback(() => {
    loadFornecedores()
    loadMateriais()
    loadComponentes()
    loadEquipes()
    loadCidades()
  }, [loadFornecedores, loadMateriais, loadComponentes, loadEquipes, loadCidades])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getTipoFornecedorLabel = (tipo?: string | null) => {
    switch (tipo?.toLowerCase()) {
      case "madeira": return "Madeira"
      case "telha": return "Telha"
      case "material": return "Material"
      case "materiais": return "Materiais"
      case "andaime": return "Andaime"
      default: return "Material"
    }
  }

  const getTipoFornecedorIcon = (tipo?: string | null) => {
    switch (tipo?.toLowerCase()) {
      case "madeira": return TreePine
      case "telha": return Home
      case "andaime": return Construction
      default: return Package
    }
  }

  const getTipoFornecedorColor = (tipo?: string | null) => {
    switch (tipo?.toLowerCase()) {
      case "madeira": return "bg-green-100 text-green-800 border-green-300"
      case "telha": return "bg-orange-100 text-orange-800 border-orange-300"
      case "andaime": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      default: return "bg-blue-100 text-blue-800 border-blue-300"
    }
  }

  // Get filtered data based on current view
  const getFilteredData = () => {
    if (selectedFornecedor) {
      // Show fornecedor's products (madeira or telha)
      return materiais
        .filter(m => m.fornecedorId === selectedFornecedor.id)
        .filter(m => m.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    switch (activeCategory) {
      case "fornecedores":
        return fornecedores.filter(f => f.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      case "materiais":
        // Show only general materials (no fornecedor)
        return materiais
          .filter(m => !m.fornecedorId && (m.tipo === 'geral' || !m.tipo))
          .filter(m => m.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      case "telhas":
        // Show all telhas (tipo='telha')
        return materiais
          .filter(m => m.tipo?.toLowerCase() === 'telha')
          .filter(m => m.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      case "componentes":
        return componentes.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      case "equipes":
        return equipes.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      case "cidades":
        return cidades.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      default:
        return []
    }
  }

  // Modal handlers
  const openAddModal = (type: typeof modalType) => {
    setModalType(type)
    setEditingItem(null)
    setFormData({})
    setModalOpen(true)
  }

  const openEditModal = (type: typeof modalType, item: any) => {
    setModalType(type)
    setEditingItem(item)

    // Populate form
    if (type === "fornecedor") {
      // Normalize tipo to lowercase since DB stores in uppercase
      const tipoNormalized = item.tipo?.toLowerCase() || "material"
      setFormData({ nome: item.nome, tipo: tipoNormalized })
    } else if (type === "material" || type === "madeira" || type === "telha") {
      setFormData({ nome: item.descricao, preco: String(item.preco_unitario) })
    } else if (type === "componente") {
      setFormData({ nome: item.nome })
    } else if (type === "equipe") {
      setFormData({ nome: item.nome, cor: item.cor || "" })
    } else if (type === "cidade") {
      setFormData({ nome: item.nome, cor: item.cor || "" })
    }

    setModalOpen(true)
  }

  const getModalTitle = () => {
    const action = editingItem ? "Editar" : "Adicionar"
    switch (modalType) {
      case "fornecedor": return `${action} Fornecedor`
      case "material": return `${action} Material`
      case "madeira": return `${action} Madeira`
      case "telha": return `${action} Telha`
      case "componente": return `${action} Componente`
      case "equipe": return `${action} Equipe`
      case "cidade": return `${action} Cidade`
      default: return action
    }
  }

  // CRUD operations
  const handleSubmit = async () => {
    try {
      setProcessing(true)

      if (modalType === "fornecedor") {
        if (editingItem) {
          await updateFornecedor(editingItem.id, { nome: formData.nome, tipo: formData.tipo })
          toast.success("Fornecedor atualizado!")
        } else {
          await createFornecedor({ nome: formData.nome, tipo: formData.tipo || "material" })
          toast.success("Fornecedor criado!")
        }
        await loadFornecedores()
      } else if (modalType === "material" || modalType === "madeira" || modalType === "telha") {
        const payload: any = {
          descricao: formData.nome,
          preco_unitario: parseFloat(formData.preco) || 0
        }

        if (modalType === "madeira" || modalType === "telha") {
          payload.fornecedorId = selectedFornecedor?.id
          payload.tipo = modalType
        } else {
          payload.tipo = "geral"
        }

        if (editingItem) {
          await updateMaterial(editingItem.id, payload)
          toast.success("Material atualizado!")
        } else {
          await createMaterial(payload)
          toast.success("Material criado!")
        }
        await loadMateriais()
      } else if (modalType === "componente") {
        if (editingItem) {
          await updateComponente(editingItem.id, { nome: formData.nome })
          toast.success("Componente atualizado!")
        } else {
          await createComponente({ nome: formData.nome })
          toast.success("Componente criado!")
        }
        await loadComponentes()
      } else if (modalType === "equipe") {
        const payload = { nome: formData.nome, cor: formData.cor || null }
        if (editingItem) {
          const res = await fetch(`/api/equipes/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error("Falha ao atualizar equipe")
          toast.success("Equipe atualizada!")
        } else {
          const res = await fetch("/api/equipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error("Falha ao criar equipe")
          toast.success("Equipe criada!")
        }
        await loadEquipes()
      } else if (itemToDelete?.type === "cidade") {
        const res = await fetch(`/api/cidades/${itemToDelete.item.id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Falha ao excluir cidade")
        toast.success("Cidade excluída!")
        await loadCidades()
      } else if (modalType === "cidade") {
        const payload = { nome: formData.nome, cor: formData.cor || null }
        if (editingItem) {
          const res = await fetch(`/api/cidades/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error("Falha ao atualizar cidade")
          toast.success("Cidade atualizada!")
        } else {
          const res = await fetch("/api/cidades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error("Falha ao criar cidade")
          toast.success("Cidade criada!")
        }
        await loadCidades()
      }

      setModalOpen(false)
      setFormData({})
      setEditingItem(null)
    } catch (error) {
      toast.error("Erro ao salvar")
    } finally {
      setProcessing(false)
    }
  }

  const openDeleteDialog = (type: string, item: any) => {
    setItemToDelete({ type, item })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      setProcessing(true)

      if (itemToDelete.type === "fornecedor") {
        await deleteFornecedor(itemToDelete.item.id)
        toast.success("Fornecedor excluído!")
        await loadFornecedores()
      } else if (itemToDelete.type === "material" || itemToDelete.type === "madeira" || itemToDelete.type === "telha") {
        await deleteMaterial(itemToDelete.item.id)
        toast.success("Material excluído!")
        await loadMateriais()
      } else if (itemToDelete.type === "componente") {
        await deleteComponente(itemToDelete.item.id)
        toast.success("Componente excluído!")
        await loadComponentes()
      } else if (itemToDelete.type === "equipe") {
        const res = await fetch(`/api/equipes/${itemToDelete.item.id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Falha ao excluir equipe")
        toast.success("Equipe excluída!")
        await loadEquipes()
      } else if (itemToDelete.type === "cidade") {
        const res = await fetch(`/api/cidades/${itemToDelete.item.id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Falha ao excluir cidade")
        toast.success("Cidade excluída!")
        await loadCidades()
      }

      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      toast.error("Erro ao excluir")
    } finally {
      setProcessing(false)
    }
  }

  // Navigation helpers
  const getAddButtonType = (): typeof modalType => {
    if (selectedFornecedor) {
      return selectedFornecedor.tipo === "madeira" ? "madeira" : "telha"
    }
    switch (activeCategory) {
      case "fornecedores": return "fornecedor"
      case "materiais": return "material"
      case "componentes": return "componente"
      case "equipes": return "equipe"
      case "cidades": return "cidade"
      default: return "material"
    }
  }

  const handleFornecedorClick = (fornecedor: FornecedorDTO) => {
    // Apenas fornecedores de madeira podem ser expandidos
    // Telhas mantidas sem separação por fornecedor conforme solicitado
    if (fornecedor.tipo?.toLowerCase() !== "madeira") return
    setSelectedFornecedor(fornecedor)
    setSearchTerm("")
  }

  const handleBack = () => {
    setSelectedFornecedor(null)
    setSearchTerm("")
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const filteredData = getFilteredData()

  return (
    <PageLayout
      pageBackground="bg-bege-pagina"
    >
      <Toaster richColors />

      <div className="space-y-6">
        {selectedFornecedor ? (
          // Fornecedor Detail View
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-1.5 h-auto"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{selectedFornecedor.nome}</CardTitle>
                      <Badge className={getTipoFornecedorColor(selectedFornecedor.tipo)}>
                        {getTipoFornecedorLabel(selectedFornecedor.tipo)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {materiais.filter(m => m.fornecedorId === selectedFornecedor.id).length} itens cadastrados
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => openAddModal(getAddButtonType())}
                  className="bg-marromEscuro text-bege hover:bg-marromEscuro/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar {selectedFornecedor.tipo === "madeira" ? "Madeira" : "Telha"}
                </Button>
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
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

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nome</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Preço</TableHead>
                    <TableHead className="text-right px-4 py-3 font-semibold text-muted-foreground w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="px-4 py-12 text-center">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="px-4 py-12 text-center">
                        <div className="text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">Nenhum item encontrado</p>
                          <p className="text-sm mt-1">Adicione um novo item ou ajuste sua busca</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => {
                      const product = item as MaterialDTO
                      const type = selectedFornecedor.tipo === "madeira" ? "madeira" : "telha"

                      return (
                        <TableRow key={product.id} className="hover:bg-muted/30">
                          <TableCell className="px-4 py-3 font-medium">{product.descricao}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground">{formatCurrency(Number(product.preco_unitario))}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
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
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          // Main Tabs View
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
            <TabsList className="grid w-full grid-cols-6 h-auto p-1">
              <TabsTrigger value="fornecedores" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Truck className="w-4 h-4" />
                <span className="hidden lg:inline">Fornecedores</span>
                <span className="lg:hidden">Forn.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{fornecedores.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="materiais" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Package className="w-4 h-4" />
                <span className="hidden lg:inline">Materiais</span>
                <span className="lg:hidden">Mat.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{materiais.filter(m => m.tipo === 'geral' || !m.tipo).length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="telhas" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Home className="w-4 h-4" />
                <span className="hidden lg:inline">Telhas</span>
                <span className="lg:hidden">Tel.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{materiais.filter(m => m.tipo?.toLowerCase() === 'telha').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="componentes" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Package className="w-4 h-4" />
                <span className="hidden lg:inline">Componentes</span>
                <span className="lg:hidden">Comp.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{componentes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="equipes" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Equipes</span>
                <span className="lg:hidden">Eqp.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{equipes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cidades" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <MapPin className="w-4 h-4" />
                <span className="hidden lg:inline">Cidades</span>
                <span className="lg:hidden">Cid.</span>
                <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">{cidades.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Fornecedores Tab */}
            <TabsContent value="fornecedores" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar fornecedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('fornecedor')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Fornecedor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nome</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-right px-4 py-3 font-semibold text-muted-foreground w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="px-4 py-12 text-center">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="px-4 py-12 text-center">
                            <div className="text-muted-foreground">
                              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p className="font-medium">Nenhum fornecedor encontrado</p>
                              <p className="text-sm mt-1">Adicione um novo fornecedor</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((item) => {
                          const fornecedor = item as FornecedorDTO
                          const Icon = getTipoFornecedorIcon(fornecedor.tipo)
                          const isClickable = fornecedor.tipo?.toLowerCase() === "madeira"
                          const productCount = materiais.filter(m => m.fornecedorId === fornecedor.id).length

                          return (
                            <TableRow
                              key={fornecedor.id}
                              onClick={() => isClickable && handleFornecedorClick(fornecedor)}
                              className={cn(
                                "hover:bg-muted/30 transition-colors",
                                isClickable ? "cursor-pointer" : ""
                              )}
                            >
                              <TableCell className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{fornecedor.nome}</span>
                                  {isClickable && (
                                    <Badge variant="outline" className="text-xs">
                                      {productCount} itens
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <Badge className={cn("text-xs gap-1", getTipoFornecedorColor(fornecedor.tipo))}>
                                  <Icon className="w-3 h-3" />
                                  {getTipoFornecedorLabel(fornecedor.tipo)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
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
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Materiais Tab */}
            <TabsContent value="materiais" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar material..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('material')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Material
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nome</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Preço</TableHead>
                        <TableHead className="text-right px-4 py-3 font-semibold text-muted-foreground w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="px-4 py-12 text-center">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="px-4 py-12 text-center">
                            <div className="text-muted-foreground">
                              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p className="font-medium">Nenhum material encontrado</p>
                              <p className="text-sm mt-1">Adicione um novo material</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((item) => {
                          const material = item as MaterialDTO
                          return (
                            <TableRow key={material.id} className="hover:bg-muted/30">
                              <TableCell className="px-4 py-3 font-medium">{material.descricao}</TableCell>
                              <TableCell className="px-4 py-3 text-muted-foreground">{formatCurrency(Number(material.preco_unitario))}</TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditModal("material", material)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteDialog("material", material)}
                                    className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Telhas Tab */}
            <TabsContent value="telhas" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar telha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('telha')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Telha
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Preço</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                            </td>
                          </tr>
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <div className="text-muted-foreground">
                                <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Nenhuma telha encontrada</p>
                                <p className="text-sm mt-1">Adicione uma nova telha</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((item) => {
                            const telha = item as MaterialDTO
                            return (
                              <tr key={telha.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">{telha.descricao}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{formatCurrency(Number(telha.preco_unitario))}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => openEditModal("telha", telha)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      aria-label="Editar"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteDialog("telha", telha)}
                                      className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      aria-label="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Componentes Tab */}
            <TabsContent value="componentes" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar componente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('componente')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Componente
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-12 text-center">
                              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                            </td>
                          </tr>
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-12 text-center">
                              <div className="text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Nenhum componente encontrado</p>
                                <p className="text-sm mt-1">Adicione um novo componente</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((item) => {
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
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Equipes Tab */}
            <TabsContent value="equipes" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar equipe..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('equipe')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Equipe
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Cor</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                            </td>
                          </tr>
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <div className="text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Nenhuma equipe encontrada</p>
                                <p className="text-sm mt-1">Adicione uma nova equipe</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((item) => {
                            const equipe = item as { id: number; nome: string; cor: string | null }
                            return (
                              <tr key={equipe.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">{equipe.nome}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full border border-border"
                                      style={{ backgroundColor: equipe.cor || "#E5E5E5" }}
                                    />
                                    <span className="text-sm text-muted-foreground">{equipe.cor || "Sem cor"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => openEditModal("equipe", equipe)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      aria-label="Editar"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteDialog("equipe", equipe)}
                                      className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      aria-label="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cidades Tab */}
            <TabsContent value="cidades" className="space-y-4 mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => openAddModal('cidade')} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Cidade
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Nome</th>
                          <th className="text-left text-sm font-semibold text-muted-foreground px-4 py-3">Cor</th>
                          <th className="text-right text-sm font-semibold text-muted-foreground px-4 py-3 w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                            </td>
                          </tr>
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                              <div className="text-muted-foreground">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Nenhuma cidade encontrada</p>
                                <p className="text-sm mt-1">Adicione uma nova cidade</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((item) => {
                            const cidade = item as { id: number; nome: string; cor: string | null }
                            return (
                              <tr key={cidade.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium">{cidade.nome}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full border border-border"
                                      style={{ backgroundColor: cidade.cor || "#E5E5E5" }}
                                    />
                                    <span className="text-sm text-muted-foreground">{cidade.cor || "Sem cor"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => openEditModal("cidade", cidade)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      aria-label="Editar"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteDialog("cidade", cidade)}
                                      className="p-1.5 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      aria-label="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
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
                      <SelectItem value="andaime">
                        <div className="flex items-center gap-2">
                          <Construction className="w-4 h-4" />
                          Andaime
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(modalType === "equipe" || modalType === "cidade") && (
              <div className="space-y-2">
                <Label>Cor (para Agenda)</Label>
                <div className="flex flex-wrap gap-2">
                  {["#3B82F6", "#22C55E", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#6B7280", "#A855F7", "#64748B"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border border-border hover:scale-110 transition-transform ring-offset-background",
                        formData.cor === color ? "ring-2 ring-ring ring-offset-2" : ""
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, cor: color })}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <Input
                      type="color"
                      value={formData.cor || "#000000"}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">Personalizado</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={processing} className="bg-marromEscuro text-bege hover:bg-marromEscuro/90">
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
    </PageLayout>
  )
}
