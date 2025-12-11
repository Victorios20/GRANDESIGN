// src/components/modals/ExcluirModalOrcamento.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

type ExcluirModalOrcamentoProps = {
  open: boolean
  onClose: () => void
  orcamentoId: number | null | undefined
  /**
   * true  => orçamento já está excluído (ação será REATIVAR)
   * false => orçamento está ativo      (ação será EXCLUIR)
   */
  isExcluido: boolean
  /**
   * Callback opcional para o pai refazer consulta / atualizar tela
   */
  onFinished?: () => void
}

export default function ExcluirModalOrcamento({
  open,
  onClose,
  orcamentoId,
  isExcluido,
  onFinished,
}: ExcluirModalOrcamentoProps) {
  const [loading, setLoading] = useState(false)

  const isReativar = !!isExcluido
  const actionLabel = isReativar ? "Reativar" : "Excluir"
  const title = isReativar ? "Reativar orçamento" : "Confirmar exclusão do orçamento"
  const message = isReativar
    ? "Tem certeza que deseja reativar este orçamento? Ele voltará a aparecer como ativo."
    : "Tem certeza que deseja excluir este orçamento? Ele deixará de aparecer como ativo, mas poderá ser reativado depois."

  const ringColor = isReativar ? "border-emerald-500" : "border-red-500"
  const iconColor = isReativar ? "text-emerald-500" : "text-red-500"

  async function handleConfirm() {
    if (!orcamentoId || loading) return

    setLoading(true)
    try {
      const res = await fetch("/api/Orcamentos/excluir", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orcamentoId,
          excluido: !isExcluido, // toggle
        }),
      })

      if (!res.ok) {
        toast.error("Erro ao atualizar status do orçamento.")
        return
      }

      toast.success(
        !isExcluido
          ? "Orçamento marcado como excluído."
          : "Orçamento reativado com sucesso."
      )

      onFinished?.()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Erro de comunicação com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && !v && onClose()}>
      <DialogContent className="rounded-2xl p-6" style={{ width: "100%", maxWidth: 520 }}>
        <div className="flex justify-center">
          <div className={`rounded-full border-[6px] p-4 ${ringColor}`}>
            {isReativar ? (
              <CheckCircle2 className={`h-12 w-12 ${iconColor}`} strokeWidth={2.5} />
            ) : (
              <Trash2 className={`h-12 w-12 ${iconColor}`} strokeWidth={2.5} />
            )}
          </div>
        </div>

        <DialogHeader className="items-center mt-6">
          <DialogTitle
            className={`text-lg font-semibold text-center ${
              isReativar ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground mt-2">{message}</p>

        <DialogFooter className="mt-8 px-2">
          <div className="flex justify-between w-full gap-4">
            <Button
              variant="outline"
              className="px-6"
              disabled={loading}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              className="px-6"
              onClick={handleConfirm}
              disabled={loading || !orcamentoId}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isReativar ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {actionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
