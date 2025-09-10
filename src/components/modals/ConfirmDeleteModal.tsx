// src/components/modals/ConfirmDeleteModal.tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
  title?: string
  message?: string
}

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Confirmar exclusão",
  message = "Tem certeza que deseja excluir este item? Essa ação não pode ser desfeita.",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !loading && !v && onClose()}>
      <DialogContent className="rounded-2xl p-6" style={{ width: "100%", maxWidth: 520 }}>
        <div className="flex justify-center">
          <div className="rounded-full border-[6px] border-red-500 p-4">
            <Trash2 className="h-12 w-12 text-red-500" strokeWidth={2.5} />
          </div>
        </div>

        <DialogHeader className="items-center mt-6">
          <DialogTitle className="text-red-700 text-lg font-semibold text-center">
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
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
