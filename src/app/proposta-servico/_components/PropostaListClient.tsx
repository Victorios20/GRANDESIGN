"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { excluirProposta } from "@/actions/proposta-servico"
import { formatCurrency } from "@/lib/financeiro-utils"
import { formatPropostaNumero } from "@/lib/proposta-utils"

type Item = {
  id: number
  titulo: string
  cliente: string
  valor_final: number
  status: string
  created_at: string
}

export default function PropostaListClient({ items }: { items: Item[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await excluirProposta(deleteId)
      toast.success("Proposta excluída")
      setDeleteId(null)
      router.refresh()
    } catch {
      toast.error("Erro ao excluir proposta")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Propostas de Serviço</h1>
        <Button asChild className="btn-primary">
          <Link href="/proposta-servico/new"><Plus className="mr-2 size-4" /> Nova proposta</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Nº</th>
              <th className="p-3">Título</th>
              <th className="p-3 hidden sm:table-cell">Cliente</th>
              <th className="p-3">Valor</th>
              <th className="p-3 hidden sm:table-cell">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma proposta ainda.</td></tr>
            ) : items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-3">{formatPropostaNumero(it.id)}</td>
                <td className="p-3">
                  <Link href={`/proposta-servico/detalhes/${it.id}`} className="font-medium hover:underline">{it.titulo}</Link>
                </td>
                <td className="p-3 hidden sm:table-cell">{it.cliente}</td>
                <td className="p-3">{formatCurrency(it.valor_final)}</td>
                <td className="p-3 hidden sm:table-cell">{it.status}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(it.id)}>
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); void handleDelete() }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
