"use client"
import { useMemo, useRef, useState, useEffect } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Edit, Save, X, Loader2, Plus, Trash2 } from "lucide-react"

import { Toaster, toast } from "sonner"
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"



export type ItemBase = { id: number; nome: string; preco: number }
export type ComponenteItem = { id: number; nome: string }

type Aba = "materiais" | "madeiras" | "telhas"

const moeda = (n: number) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

function parseNumeroBR(v: string): number | null {
  if (!v?.trim()) return null
  const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

/* ============================
 * API helpers (fetch)
 * ============================ */
async function patchMaterial(
  id: number,
  fields: { descricao?: string; preco_unitario?: number }
) {
  const res = await fetch(`/api/materiais/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao atualizar material")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

async function deleteMaterial(id: number) {
  const res = await fetch(`/api/materiais/${id}`, {
    method: "DELETE",
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao excluir material")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

async function postMaterial(input: {
  descricao: string
  tipo: "geral" | "madeira" | "telha"
  preco_unitario: number
}) {
  const res = await fetch(`/api/materiais`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao criar material")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

async function patchComponente(id: number, nome: string) {
  const res = await fetch(`/api/componentes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao atualizar componente")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

async function deleteComponente(id: number) {
  const res = await fetch(`/api/componentes/${id}`, {
    method: "DELETE",
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao excluir componente")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

async function postComponente(nome: string) {
  const res = await fetch(`/api/componentes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao criar componente")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

type Fornecedor = { id: number; nome: string }

async function getFornecedores(): Promise<Fornecedor[]> {
  const res = await fetch(`/api/fornecedores`, { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao listar fornecedores")
  return res.json()
}

async function getMadeirasByFornecedor(fornecedorId: number) {
  const res = await fetch(`/api/materiais?fornecedorId=${fornecedorId}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao listar madeiras do fornecedor")
  return res.json() as Promise<Array<{ id: number; descricao: string; preco_unitario: number }>>
}

async function postMadeira(input: {
  descricao: string
  preco_unitario: number
  unidade_de_medida?: string | null
  fornecedorId: number
}) {
  const res = await fetch(`/api/materiais`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao criar madeira")
  }
  return res.json() as Promise<{ id: number }>
}

async function patchMadeira(
  id: number,
  fields: { descricao?: string; preco_unitario?: number; unidade_de_medida?: string | null }
) {
  const res = await fetch(`/api/materiais/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao atualizar madeira")
  }
  return res.json()
}

async function deleteMadeira(id: number) {
  const res = await fetch(`/api/materiais/${id}`, {
    method: "DELETE",
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao excluir madeira")
  }
  return res.json()
}

function TabelaMateriais({
  title,
  tipo,
  items,
  setItems,
  onEditingChange,
}: {
  title: string
  tipo: "geral" | "madeira" | "telha"
  items: ItemBase[]
  setItems: React.Dispatch<React.SetStateAction<ItemBase[]>>
  onEditingChange: (editing: boolean) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nomeInput, setNomeInput] = useState<string>("")
  const [precoInput, setPrecoInput] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [addingSaving, setAddingSaving] = useState(false)

  // Inclusão (no topo)
  const [adding, setAdding] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novoPreco, setNovoPreco] = useState("")
  const addRef = useRef<HTMLDivElement | null>(null)

  const isMadeiraTabela = tipo === "madeira"
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fornecedorSel, setFornecedorSel] = useState<number | null>(null)
  const fornecedorSelObj = useMemo(
    () => fornecedores.find((f) => f.id === fornecedorSel) || null,
    [fornecedores, fornecedorSel]
  )

  const [confirmOpen, setConfirmOpen] = useState(false)

  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toDelete, setToDelete] = useState<{ id: number; nome: string } | null>(null)


  useEffect(() => {
    if (adding && addRef.current) {
      addRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [adding])

  useEffect(() => {
    if (!isMadeiraTabela) return
      ; (async () => {
        try {
          const lista = await getFornecedores()
          setFornecedores(lista)
          const fromLS = Number(localStorage.getItem("gd.fornecedorSelecionado") || "")
          const preferido =
            (Number.isFinite(fromLS) && lista.some((f) => f.id === fromLS)) ? fromLS :
              (lista.find((f) => f.nome.toLowerCase() === "shopping da madeira")?.id ?? lista[0]?.id)
          setFornecedorSel(preferido ?? null)
        } catch (err: any) {
          toast.error(err?.message ?? "Falha ao carregar fornecedores")
        }
      })()
  }, [isMadeiraTabela])


  useEffect(() => {
    if (!isMadeiraTabela || !fornecedorSel) return
    localStorage.setItem("gd.fornecedorSelecionado", String(fornecedorSel))
      ; (async () => {
        try {
          const rows = await getMadeirasByFornecedor(fornecedorSel)
          const mapped = rows
            .map((r) => ({ id: r.id, nome: r.descricao, preco: Number(r.preco_unitario ?? 0) }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
          setItems(mapped)
        } catch (err: any) {
          toast.error(err?.message ?? "Falha ao listar madeiras do fornecedor")
        }
      })()
  }, [isMadeiraTabela, fornecedorSel, setItems])

  // Deleção em progresso por id
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const editingRow = useMemo(
    () => items.find((i) => i.id === editingId) || null,
    [editingId, items]
  )

  const startEdit = (row: ItemBase) => {
    setEditingId(row.id)
    setNomeInput(row.nome)
    setPrecoInput(String(row.preco))
    onEditingChange(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNomeInput("")
    setPrecoInput("")
    setIsSaving(false)
    onEditingChange(false)
  }

  const saveEdit = async () => {
    if (editingId === null) return

    const nome = (nomeInput || "").trim()
    if (!nome) {
      toast.warning("Informe um nome válido.")
      return
    }

    const parsed = parseNumeroBR(precoInput)
    if (parsed === null || parsed < 0) {
      toast.warning("Informe um preço válido (≥ 0).")
      return
    }

    try {
      setIsSaving(true)

      // Update otimista
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingId ? { ...i, nome, preco: parsed } : i
        )
      )

      if (isMadeiraTabela) {
        await patchMadeira(editingId, { descricao: nome, preco_unitario: parsed })
      } else {
        await patchMaterial(editingId, { descricao: nome, preco_unitario: parsed })
      }


      toast.success("Material atualizado!")
      cancelEdit()
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível salvar.")
      setIsSaving(false)
    }
  }

  const startAdd = () => {
    setAdding(true)
    setNovoNome("")
    setNovoPreco("")
  }

  const cancelAdd = () => {
    setAdding(false)
    setNovoNome("")
    setNovoPreco("")
  }

  const saveAdd = async () => {
    const nome = (novoNome || "").trim()
    if (!nome) {
      toast.warning("Informe um nome para adicionar.")
      return
    }
    const parsed = parseNumeroBR(novoPreco)
    if (parsed === null || parsed < 0) {
      toast.warning("Informe um preço válido (≥ 0).")
      return
    }

    try {
      setAddingSaving(true)
      if (isMadeiraTabela) {
        if (!fornecedorSel) {
          toast.warning("Selecione um fornecedor.")
          return
        }
        const res = await postMadeira({
          descricao: nome,
          preco_unitario: parsed,
          unidade_de_medida: null,
          fornecedorId: fornecedorSel,
        })
        const rows = await getMadeirasByFornecedor(fornecedorSel)
        const mapped = rows
          .map((r) => ({ id: r.id, nome: r.descricao, preco: Number(r.preco_unitario ?? 0) }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        setItems(mapped)
      } else {
        const res = await postMaterial({ descricao: nome, tipo, preco_unitario: parsed })
        setItems((prev) =>
          [{ id: res.id, nome, preco: parsed }, ...prev].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        )
      }
      cancelAdd()
      toast.success("Material criado!")
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao criar material.")
    } finally {
      setAddingSaving(false)
    }

  }

  const openConfirm = (row: ItemBase) => {
    setToDelete({ id: row.id, nome: row.nome })
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      setConfirmLoading(true)
      // otimista
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id))
      if (isMadeiraTabela) {
        await deleteMadeira(toDelete.id)
      } else {
        await deleteMaterial(toDelete.id)
      }

      toast.success("Material excluído!")
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao excluir material.")
      // rollback recomendado se quiser (guarde backup antes de filtrar)
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setToDelete(null)
    }
  }


  return (

    <Card className="w-full border shadow-sm rounded-2xl">
      <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
        <CardTitle className="text-lg font-semibold text-marromEscuro">
          {isMadeiraTabela && fornecedorSelObj ? `Madeiras — ${fornecedorSelObj.nome}` : title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isMadeiraTabela && (
            <Select
              value={fornecedorSel ? String(fornecedorSel) : ""}
              onValueChange={(v) => setFornecedorSel(Number(v))}
            >
              <SelectTrigger className="h-9 w-56 bg-white">
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!adding ? (
            <Button
              size="sm"
              onClick={startAdd}
              disabled={editingId !== null || addingSaving || isSaving || (isMadeiraTabela && !fornecedorSel)}
              title="Adicionar"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          ) : (
            <div className="flex items-center gap-2" ref={addRef}>
              <Input
                className="h-9 w-48"
                placeholder="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                disabled={addingSaving}
              />
              <Input
                className="h-9 w-36"
                inputMode="decimal"
                placeholder="0,00"
                value={novoPreco}
                onChange={(e) => setNovoPreco(e.target.value)}
                disabled={addingSaving}
              />
              <Button
                size="sm"
                onClick={saveAdd}
                title="Salvar novo"
                disabled={addingSaving}
                aria-busy={addingSaving}
              >
                {addingSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelAdd}
                title="Cancelar"
                disabled={addingSaving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>


      <CardContent className="overflow-x-auto rounded-b-2xl">
        <Table className="rounded-xl overflow-hidden">
          <TableHeader>
            <TableRow className="bg-bege">
              <TableHead className="w-2/5">Nome</TableHead>
              <TableHead className="w-1/5">Preço (R$)</TableHead>
              <TableHead className="w-1/5 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((row) => {
              const isRowEditing = row.id === editingId
              const isDeleting = deletingId === row.id
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    {isRowEditing ? (
                      <Input
                        value={nomeInput}
                        onChange={(e) => setNomeInput(e.target.value)}
                        disabled={isSaving}
                        autoFocus
                        placeholder="Nome do material"
                      />
                    ) : (
                      row.nome
                    )}
                  </TableCell>

                  <TableCell>
                    {isRowEditing ? (
                      <Input
                        inputMode="decimal"
                        value={precoInput}
                        onChange={(e) => setPrecoInput(e.target.value)}
                        disabled={isSaving}
                        placeholder="0,00"
                      />
                    ) : (
                      moeda(row.preco)
                    )}
                  </TableCell>

                  <TableCell className="flex justify-center gap-2">
                    {isRowEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          disabled={isSaving}
                          aria-busy={isSaving}
                          aria-label="Salvar"
                          title="Salvar"
                        >
                          {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          aria-label="Cancelar"
                          title="Cancelar"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(row)}
                          disabled={editingId !== null || adding || isSaving || addingSaving}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>


                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConfirm(row)}
                          disabled={editingId !== null || isSaving || addingSaving}
                          aria-label="Excluir"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </Button>


                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Toaster richColors position="top-right" />
      </CardContent>

      {editingRow && (
        <div className="px-6 pb-4 text-sm text-muted-foreground">
          Editando: <span className="font-medium">{editingRow.nome}</span>
        </div>
      )}

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => {
          if (!confirmLoading) {
            setConfirmOpen(false)
            setToDelete(null)
          }
        }}
        onConfirm={confirmDelete}
        loading={confirmLoading}
        title="Excluir material"
        message={
          toDelete
            ? `Tem certeza que deseja excluir "${toDelete.nome}"? Essa ação não pode ser desfeita.`
            : "Tem certeza que deseja excluir este item?"
        }
      />


    </Card>


  )
}

/* ============================
 * Tabela de Componentes
 * - Edita APENAS NOME
 * - Adiciona no topo
 * - Exclui
 * ============================ */
function TabelaComponentes({
  title = "Componentes",
  items,
  setItems,
  onEditingChange,
}: {
  title?: string
  items: ComponenteItem[]
  setItems: React.Dispatch<React.SetStateAction<ComponenteItem[]>>
  onEditingChange: (editing: boolean) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nomeInput, setNomeInput] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [addingSaving, setAddingSaving] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toDelete, setToDelete] = useState<{ id: number; nome: string } | null>(null)


  const [adding, setAdding] = useState(false)
  const [novoNome, setNovoNome] = useState<string>("")
  const addRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (adding && addRef.current) {
      addRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [adding])

  const [deletingId, setDeletingId] = useState<number | null>(null)

  const editingRow = useMemo(
    () => items.find((i) => i.id === editingId) || null,
    [editingId, items]
  )

  const startEdit = (row: ComponenteItem) => {
    setEditingId(row.id)
    setNomeInput(row.nome)
    onEditingChange(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNomeInput("")
    setIsSaving(false)
    onEditingChange(false)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    const nome = (nomeInput || "").trim()
    if (!nome) {
      toast.warning("Informe um nome válido.")
      return
    }

    try {
      setIsSaving(true)
      // otimista
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, nome } : i))
      )
      await patchComponente(editingId, nome)
      toast.success("Componente atualizado!")
      cancelEdit()
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível salvar.")
      setIsSaving(false)
    }
  }

  const startAdd = () => {
    setAdding(true)
    setNovoNome("")
  }
  const cancelAdd = () => {
    setAdding(false)
    setNovoNome("")
  }
  const saveAdd = async () => {
    const nome = (novoNome || "").trim()
    if (!nome) { toast.warning("Informe um nome para adicionar."); return }
    try {
      setAddingSaving(true)
      const res = await postComponente(nome)
      setItems((prev) => [{ id: res.id, nome }, ...prev])
      cancelAdd()
      toast.success("Componente criado!")
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao criar componente.")
    } finally {
      setAddingSaving(false)
    }
  }


  const openConfirm = (row: ComponenteItem) => {
    setToDelete({ id: row.id, nome: row.nome })
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      setConfirmLoading(true)
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id))
      await deleteComponente(toDelete.id)
      toast.success("Componente excluído!")
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao excluir componente.")
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setToDelete(null)
    }
  }


  return (
    <Card className="w-full border shadow-sm rounded-2xl">
      <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
        <CardTitle className="text-lg font-semibold text-marromEscuro">
          {title}
        </CardTitle>
        <div className="flex gap-2">
          {!adding ? (
            <Button
              size="sm"
              onClick={startAdd}
              disabled={editingId !== null || addingSaving || isSaving}
              title="Adicionar"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>

          ) : (
            <div className="flex items-center gap-2" ref={addRef}>
              <Input
                className="h-9 w-56"
                placeholder="Nome do componente"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                disabled={addingSaving}
              />
              <Button
                size="sm"
                onClick={saveAdd}
                title="Salvar novo"
                disabled={addingSaving}
                aria-busy={addingSaving}
              >
                {addingSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelAdd}
                title="Cancelar"
                disabled={addingSaving}
              >
                <X className="w-4 h-4" />
              </Button>

            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto rounded-b-2xl">
        <Table className="rounded-xl overflow-hidden">
          <TableHeader>
            <TableRow className="bg-bege">
              <TableHead className="w-3/5">Nome</TableHead>
              <TableHead className="w-2/5 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((row) => {
              const isRowEditing = row.id === editingId
              const isDeleting = deletingId === row.id
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    {isRowEditing ? (
                      <Input
                        value={nomeInput}
                        onChange={(e) => setNomeInput(e.target.value)}
                        disabled={isSaving}
                        autoFocus
                        placeholder="Nome do componente"
                      />
                    ) : (
                      row.nome
                    )}
                  </TableCell>

                  <TableCell className="flex justify-center gap-2">
                    {isRowEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          disabled={isSaving}
                          aria-busy={isSaving}
                          aria-label="Salvar"
                          title="Salvar"
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        </Button>


                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          aria-label="Cancelar"
                          title="Cancelar"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(row)}
                          disabled={editingId !== null || adding || isSaving || addingSaving}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConfirm(row)}
                          disabled={editingId !== null || isSaving || addingSaving}
                          aria-label="Excluir"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </Button>

                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Toaster richColors position="top-right" />
      </CardContent>

      {editingRow && (
        <div className="px-6 pb-4 text-sm text-muted-foreground">
          Editando: <span className="font-medium">{editingRow.nome}</span>
        </div>
      )}

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => {
          if (!confirmLoading) {
            setConfirmOpen(false)
            setToDelete(null)
          }
        }}
        onConfirm={confirmDelete}
        loading={confirmLoading}
        title="Excluir componente"
        message={
          toDelete
            ? `Tem certeza que deseja excluir "${toDelete.nome}"? Essa ação não pode ser desfeita.`
            : "Tem certeza que deseja excluir este item?"
        }
      />

    </Card>
  )
}

/* ============================
 * Página Client
 * ============================ */
export default function EditarMateriaisClient({
  materiaisGerais,
  madeiras,
  telhas,
  componentes,
}: {
  materiaisGerais: ItemBase[]
  madeiras: ItemBase[]
  telhas: ItemBase[]
  componentes: ComponenteItem[]
}) {
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Aba>("madeiras")

  const [stateMateriais, setStateMateriais] =
    useState<ItemBase[]>(materiaisGerais)
  const [stateMadeiras, setStateMadeiras] = useState<ItemBase[]>(madeiras)
  const [stateTelhas, setStateTelhas] = useState<ItemBase[]>(telhas)
  const [stateComponentes, setStateComponentes] =
    useState<ComponenteItem[]>(componentes)

  const links = [
    { label: "Home", href: "/" },
    { label: "Editar Materiais", href: "/editar-materiais" },
  ]

  const triggerBase =
    "px-6 py-2 font-medium rounded-lg transition disabled:pointer-events-none disabled:opacity-50"
  const triggerActive = "bg-white shadow-sm text-black"

  return (
    <PageLayout links={links}>
      <div className="max-w-8xl mx-auto mt-10">
        <h1 className="text-4xl font-bold mb-4 text-marromEscuro">
          Editar Materiais
        </h1>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Aba)}>
          <TabsList className="bg-muted p-1 rounded-xl border w-full max-w-xl">
            {[
              ["materiais", "Materiais"],
              ["madeiras", "Madeiras"],
              ["telhas", "Telhas"],
            ].map(([val, label]) => (
              <TabsTrigger
                key={val}
                value={val}
                disabled={editing}
                className={`${triggerBase} ${tab === val ? triggerActive : ""}`}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Materiais (gerais) — nome + preço + adicionar topo + excluir */}
          <TabsContent value="materiais" className="mt-6">
            <TabelaMateriais
              title="Materiais"
              tipo="geral"
              items={stateMateriais}
              setItems={setStateMateriais}
              onEditingChange={setEditing}
            />
          </TabsContent>

          {/* Madeiras — duas tabelas lado a lado */}
          <TabsContent value="madeiras" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TabelaMateriais
                title="Madeiras"
                tipo="madeira"
                items={stateMadeiras}
                setItems={setStateMadeiras}
                onEditingChange={setEditing}
              />
              <TabelaComponentes
                title="Componentes"
                items={stateComponentes}
                setItems={setStateComponentes}
                onEditingChange={setEditing}
              />
            </div>
          </TabsContent>

          {/* Telhas — nome + preço + adicionar topo + excluir */}
          <TabsContent value="telhas" className="mt-6">
            <TabelaMateriais
              title="Telhas"
              tipo="telha"
              items={stateTelhas}
              setItems={setStateTelhas}
              onEditingChange={setEditing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
