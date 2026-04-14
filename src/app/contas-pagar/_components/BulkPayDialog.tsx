"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/financeiro-utils"
import { getTodayDateOnly } from "@/lib/date-only"
import type { BankOption } from "@/types/financeiro"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    banks: BankOption[]
    selectedIds: number[]
    selectedTotal: number
    onSuccess: () => Promise<void> | void
}

export default function BulkPayDialog({ open, onOpenChange, banks, selectedIds, selectedTotal, onSuccess }: Props) {
    const [contaBancariaId, setContaBancariaId] = useState("")
    const [dataPagamento, setDataPagamento] = useState(() => getTodayDateOnly())
    const [submitting, setSubmitting] = useState(false)

    const canSubmit = useMemo(
        () => Boolean(contaBancariaId) && selectedIds.length > 0 && dataPagamento,
        [contaBancariaId, dataPagamento, selectedIds.length]
    )

    async function handleSubmit() {
        if (!canSubmit) return
        setSubmitting(true)
        try {
            const response = await fetch("/api/financeiro/payables/bulk-pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conta_ids: selectedIds,
                    conta_bancaria_id: Number(contaBancariaId),
                    data_pagamento: dataPagamento,
                }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Falha ao registrar pagamentos")
            }

            toast.success("Pagamentos em lote processados")
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
                    <DialogTitle className="text-[#2C201B]">Baixa em massa</DialogTitle>
                    <DialogDescription className="text-[#2C201B]/65">
                        Registre o pagamento integral das contas selecionadas em uma única operação.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-xl border border-[#2C201B]/10 bg-white/70 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#2C201B]/45">Resumo</p>
                        <p className="mt-2 text-sm font-semibold text-[#2C201B]">{selectedIds.length} contas selecionadas</p>
                        <p className="mt-1 text-lg font-bold text-[#2C201B]">{formatCurrency(selectedTotal)}</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#2C201B]">Conta bancária</Label>
                        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                            <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                            <SelectContent>
                                {banks.map((bank) => (
                                    <SelectItem key={bank.id} value={String(bank.id)}>
                                        {bank.nome} - {formatCurrency(bank.saldo_atual)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#2C201B]">Data do pagamento</Label>
                        <Input type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
                    <Button type="button" className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                        {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Processando...</> : "Confirmar pagamentos"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
