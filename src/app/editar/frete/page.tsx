"use client"

import { useEffect, useState } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card"
import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Save, Trash, X } from "lucide-react"
import {
  getFretes,
  addFrete,
  updateFrete,
  deleteFrete,
} from "./actions/frete-db"



type Frete = { id: number; bairro: string; preco: number }

export default function EditarFretePage() {
  const [fretes, setFretes] = useState<Frete[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<{ bairro: string; preco: number }>({ bairro: "", preco: 0 })

  const isValid = editData.bairro.trim() !== "" && editData.preco > 0

  useEffect(() => {
    getFretes().then(setFretes)
  }, [])

  const startEdit = (f: Frete) => {
    setEditingId(f.id)
    setEditData({ bairro: f.bairro, preco: f.preco })
  }

  const cancelEdit = () => {
    if (
      editingId !== null &&
      fretes.find((f) => f.id === editingId)?.bairro.trim() === ""
    ) {
      setFretes((old) => old.filter((f) => f.id !== editingId))
    }
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (editingId === null || !isValid) return
    const existing = fretes.find((f) => f.id === editingId)

    if (existing?.bairro.trim() === "") {
      const newFrete = await addFrete(editData.bairro, editData.preco)
      if (newFrete) {
        setFretes((old) => old.map((f) => (f.id === editingId ? newFrete : f)))
      }
    } else {
      const ok = await updateFrete(editingId, editData.bairro, editData.preco)
      if (ok) {
        setFretes((old) =>
          old.map((f) => (f.id === editingId ? { ...f, ...editData } : f))
        )
      }
    }
    setEditingId(null)
  }

  const removeFrete = async (id: number) => {
    const ok = await deleteFrete(id)
    if (ok) setFretes((old) => old.filter((f) => f.id !== id))
    if (editingId === id) cancelEdit()
  }

  const addFreteLocal = () => {
    const tempId = Math.max(0, ...fretes.map((f) => f.id)) + 1
    setFretes((old) => [...old, { id: tempId, bairro: "", preco: 0 }])
    setEditingId(tempId)
    setEditData({ bairro: "", preco: 0 })
  }

  return (
    <PageLayout links={[{ label: "Home", href: "/" }, { label: "Editar Frete", href: "/editar/frete" }]}>
      <div className="max-w-7xl mx-auto mt-10">
        <h1 className="text-4xl font-bold mb-6 text-marromEscuro">Editar Frete</h1>

        <Card className="w-full max-w-[900px] mx-auto border border-bege shadow-sm rounded-2xl">
          <CardHeader className="flex items-center justify-between bg-bege-header rounded-t-2xl">
            <CardTitle className="text-lg font-semibold text-marromEscuro">Cidades e Fretes</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={addFreteLocal}
              disabled={editingId !== null}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </CardHeader>

          <CardContent className="overflow-x-auto rounded-b-2xl">
            <Table className="rounded-xl overflow-hidden">
              <TableHeader>
                <TableRow className="bg-bege">
                  <TableHead className="w-1/2 text-marromEscuro">Bairro</TableHead>
                  <TableHead className="w-1/4 text-marromEscuro">Preço (R$)</TableHead>
                  <TableHead className="w-1/4 text-center text-marromEscuro">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {fretes.map(({ id, bairro, preco }) => {
                  const editing = id === editingId
                  return (
                    <TableRow key={id} className="group hover:bg-madeira-100">
                      <TableCell>
                        {editing ? (
                          <Input
                            value={editData.bairro}
                            onChange={(e) => setEditData((d) => ({ ...d, bairro: e.target.value }))}
                            autoFocus
                            className="h-8 text-xs bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        ) : (
                          bairro
                        )}
                      </TableCell>

                      <TableCell>
                        {editing ? (
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editData.preco}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                preco: Number(e.target.value) || 0,
                              }))
                            }
                            className="h-8 text-xs bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        ) : (
                          `R$ ${preco.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )}
                      </TableCell>

                      <TableCell className="flex justify-center gap-2">
                        {editing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEdit}
                              disabled={!isValid}
                            >
                              <Save className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEdit}>
                              <X className="w-5 h-5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit({ id, bairro, preco })}
                              disabled={editingId !== null}
                            >
                              <Edit className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFrete(id)}
                              className="text-destructive hover:bg-destructive/10"
                              disabled={editingId !== null}
                            >
                              <Trash className="w-5 h-5" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
