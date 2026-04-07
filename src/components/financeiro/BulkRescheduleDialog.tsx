"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    endpoint: string
    selectedIds: number[]
    selectedCount: number
    title: string
    description: string
    dateLabel: string
    confirmLabel: string
    successMessage: string
    onSuccess: () => Promise<void> | void
}

function getTodayValue() {
    return new Date().toISOString().split("T")[0]
}

export default function BulkRescheduleDialog({
    open,
    onOpenChange,
    endpoint,
    selectedIds,
    selectedCount,
    title,
    description,
    dateLabel,
    confirmLabel,
    successMessage,
    onSuccess,
}: Props) {
    const [dueDate, setDueDate] = useState(getTodayValue)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) setDueDate(getTodayValue())
    }, [open])

    const canSubmit = useMemo(() => selectedIds.length > 0 && Boolean(dueDate), [dueDate, selectedIds.length])

    async function handleSubmit() {
        if (!canSubmit) return

        setSubmitting(true)

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conta_ids: selectedIds,
                    data_vencimento: dueDate,
                }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao alterar vencimento")
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
            <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="text-[#2C201B]">{title}</DialogTitle>
                    <DialogDescription className="text-[#2C201B]/65">{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-xl border border-[#2C201B]/10 bg-white/70 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#2C201B]/45">Resumo</p>
                        <p className="mt-2 text-sm font-semibold text-[#2C201B]">{selectedCount} contas selecionadas</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#2C201B]">{dateLabel}</Label>
                        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="button" className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                        {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</> : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
