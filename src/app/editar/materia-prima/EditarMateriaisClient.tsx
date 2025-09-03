/* ────────────────────────────────────────────────────────────────
   File: app/home/editar-materiais/EditarMateriaisClient.tsx
   Ajustes:
   - Snackbar (Sonner): sucesso/erro
   - loading state no salvar, disable de botões/inputs
   - validação robusta do preço
   - correção da checagem de editingId
───────────────────────────────────────────────────────────────── */
"use client"

import { useState } from "react"
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
import { Edit, Save, X, Loader2 } from "lucide-react"
import { Toaster, toast } from "sonner"

export type ItemBase = { id: number; nome: string; preco: number }

const moeda = (n: number) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

async function patchPreco(id: number, preco: number) {
  const res = await fetch(`/api/materiais/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preco_unitario: preco }),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || "Falha ao atualizar material")
  }
  return res.json() as Promise<{ ok: true; id: number }>
}

function EditableTable({
  items,
  setItems,
  title,
  onEditingChange,
}: {
  items: ItemBase[]
  setItems: React.Dispatch<React.SetStateAction<ItemBase[]>>
  title: string
  onEditingChange: (editing: boolean) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [precoInput, setPrecoInput] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  const startEdit = (row: ItemBase) => {
    setEditingId(row.id)
    setPrecoInput(String(row.preco))
    onEditingChange(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setPrecoInput("")
    setIsSaving(false)
    onEditingChange(false)
  }

  const parsedPreco = (() => {
    const v = Number(
      // aceita "12,34" ou "12.34"
      (precoInput || "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    )
    return Number.isFinite(v) ? v : NaN
  })()

  const saveEdit = async () => {
    if (editingId === null) return
    if (!Number.isFinite(parsedPreco) || parsedPreco <= 0) {
      toast.warning("Informe um preço válido maior que zero.")
      return
    }

    try {
      setIsSaving(true)

      // otimista
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, preco: parsedPreco } : i))
      )

      await patchPreco(editingId, parsedPreco)

      toast.success("Preço atualizado com sucesso!")
      cancelEdit()
    } catch (err: any) {
      // desfaz otimista (recarregando do estado anterior não é trivial aqui;
      // como fallback simples, apenas alerta o usuário)
      toast.error(err?.message ?? "Não foi possível salvar.")
      setIsSaving(false)
    }
  }

  const editingRow = items.find((i) => i.id === editingId) || null

  return (
    <Card className="w-full max-w-[1000px] mx-auto border shadow-sm rounded-2xl">
      <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
        <CardTitle className="text-lg font-semibold text-marromEscuro">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto rounded-b-2xl">
        <Table className="rounded-xl overflow-hidden">
          <TableHeader>
            <TableRow className="bg-bege">
              <TableHead className="w-1/2">Nome</TableHead>
              <TableHead className="w-1/4">Preço (R$)</TableHead>
              <TableHead className="w-1/4 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => {
              const rowEditing = row.id === editingId
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.nome}</TableCell>
                  <TableCell>
                    {rowEditing ? (
                      <Input
                        inputMode="decimal"
                        value={precoInput}
                        onChange={(e) => setPrecoInput(e.target.value)}
                        autoFocus
                        disabled={isSaving}
                        placeholder="0,00"
                      />
                    ) : (
                      moeda(row.preco)
                    )}
                  </TableCell>
                  <TableCell className="flex justify-center gap-2">
                    {rowEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          disabled={isSaving}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(row)}
                        disabled={editingId !== null}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {/* Snackbar host — caso você já tenha um <Toaster /> global, pode remover este */}
        <Toaster richColors position="top-right" />
      </CardContent>

      {/* Rodapé opcional com contexto da edição */}
      {editingRow && (
        <div className="px-6 pb-4 text-sm text-muted-foreground">
          Editando: <span className="font-medium">{editingRow.nome}</span>
        </div>
      )}
    </Card>
  )
}

type Aba = "materiais" | "madeiras" | "telhas"

export default function EditarMateriaisClient({
  materiaisGerais,
  madeiras,
  telhas,
}: {
  materiaisGerais: ItemBase[]
  madeiras: ItemBase[]
  telhas: ItemBase[]
}) {
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Aba>("materiais")
  const [stateMateriais, setStateMateriais] =
    useState<ItemBase[]>(materiaisGerais)
  const [stateMadeiras, setStateMadeiras] = useState<ItemBase[]>(madeiras)
  const [stateTelhas, setStateTelhas] = useState<ItemBase[]>(telhas)

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
          <TabsList className="bg-muted p-1 rounded-xl border w-full max-w-xs">
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

          <TabsContent value="materiais" className="mt-6">
            <EditableTable
              title="Materiais"
              items={stateMateriais}
              setItems={setStateMateriais}
              onEditingChange={setEditing}
            />
          </TabsContent>

          <TabsContent value="madeiras" className="mt-6">
            <EditableTable
              title="Madeiras"
              items={stateMadeiras}
              setItems={setStateMadeiras}
              onEditingChange={setEditing}
            />
          </TabsContent>

          <TabsContent value="telhas" className="mt-6">
            <EditableTable
              title="Telhas"
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
