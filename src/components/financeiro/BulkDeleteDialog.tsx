"use client"

import { useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    endpoint: string
    selectedIds: number[]
    selectedCount: number
    title: string
    description: string
    confirmLabel: string
    successMessage: string
    onSuccess: () => Promise<void> | void
}

export default function BulkDeleteDialog({
    open,
    onOpenChange,
    endpoint,
    selectedIds,
    selectedCount,
    title,
    description,
    confirmLabel,
    successMessage,
    onSuccess,
}: Props) {
    const [submitting, setSubmitting] = useState(false)
    const canSubmit = useMemo(() => selectedIds.length > 0, [selectedIds.length])

    async function handleSubmit() {
        if (!canSubmit) return

        setSubmitting(true)

        try {
            const response = await fetch(endpoint, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conta_ids: selectedIds }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao excluir contas")
            }

            toast.success(successMessage)
            onOpenChange(false)
            await onSuccess()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-[#8F3F37]/15 bg-[#FFFCF7] sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="text-[#8F3F37]">{title}</DialogTitle>
                    <DialogDescription className="text-[#2C201B]/70">{description}</DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-[#8F3F37]/15 bg-[#FFF4F2] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#8F3F37]">
                        <Trash2 className="size-4" />
                        {selectedCount} contas prontas para exclusão
                    </p>
                    <p className="mt-2 text-sm text-[#6A3A33]">Essa ação é definitiva e não pode ser desfeita.</p>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="bg-[#8F3F37] text-white hover:bg-[#7E352E]"
                    >
                        {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Excluindo...</> : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
