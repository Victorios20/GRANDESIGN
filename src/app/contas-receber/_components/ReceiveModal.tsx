"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, remaining } from "@/lib/financeiro-utils"
import type { ReceivableListItem, BankOption } from "@/types/financeiro"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: ReceivableListItem
    banks: BankOption[]
    onSuccess: () => void
}

export default function ReceiveModal({ open, onOpenChange, item, banks, onSuccess }: Props) {
    const saldo = remaining(item.valor_total, item.valor_recebido)

    const [contaBancariaId, setContaBancariaId] = useState("")
    const [valor, setValor] = useState(saldo)
    const [juros, setJuros] = useState(0)
    const [descontos, setDescontos] = useState(0)
    const [dataRecebimento, setDataRecebimento] = useState(() => new Date().toISOString().split("T")[0])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const valorFinal = useMemo(() => valor + juros - descontos, [valor, juros, descontos])

    const isValid = useMemo(() => {
        if (!contaBancariaId) return false
        if (valorFinal <= 0) return false
        if (valorFinal > saldo + 0.01) return false
        if (!dataRecebimento) return false
        return true
    }, [contaBancariaId, valorFinal, saldo, dataRecebimento])

    async function handleSubmit() {
        if (!isValid) return
        setSubmitting(true)
        setError("")

        try {
            const idempotencyKey = `recv-${item.id}-${Date.now()}`
            const res = await fetch("/api/financeiro/receivables/receive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conta_receber_id: item.id,
                    conta_bancaria_id: Number(contaBancariaId),
                    valor: valorFinal,
                    data_recebimento: new Date(dataRecebimento),
                    idempotencyKey,
                }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || "Erro ao processar recebimento")
            }

            onSuccess()
        } catch (err: any) {
            setError(err.message || "Erro inesperado")
            toast.error(err.message || "Erro ao processar recebimento")
        } finally {
            setSubmitting(false)
        }
    }

    const selectedBank = banks.find(b => String(b.id) === contaBancariaId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: "var(--brand-bg)" }}>
                <DialogHeader>
                    <DialogTitle style={{ color: "var(--brand-primary)" }}>Registrar Recebimento</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-lg p-3 border" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                        <p className="text-sm font-medium" style={{ color: "var(--brand-primary)" }}>{item.descricao}</p>
                        <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--brand-primary)", opacity: 0.6 }}>
                            <span>Total: {formatCurrency(item.valor_total)}</span>
                            <span>Recebido: {formatCurrency(item.valor_recebido)}</span>
                            <span className="font-semibold" style={{ opacity: 1 }}>Saldo: {formatCurrency(saldo)}</span>
                        </div>
                    </div>

                    <div>
                        <Label style={{ color: "var(--brand-primary)" }}>Data do Recebimento</Label>
                        <Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
                    </div>

                    <div>
                        <Label style={{ color: "var(--brand-primary)" }}>Conta Bancária</Label>
                        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                            <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                            <SelectContent>
                                {banks.map(b => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                        {b.nome} — Saldo: {formatCurrency(b.saldo_atual)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedBank && (
                            <p className="text-xs mt-1" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
                                Saldo disponível: {formatCurrency(selectedBank.saldo_atual)}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label style={{ color: "var(--brand-primary)" }}>Valor</Label>
                            <Input type="number" step="0.01" min="0.01" max={saldo} value={valor} onChange={(e) => setValor(Number(e.target.value))} />
                        </div>
                        <div>
                            <Label style={{ color: "var(--brand-primary)" }}>Juros / Multa</Label>
                            <Input type="number" step="0.01" min="0" value={juros} onChange={(e) => setJuros(Number(e.target.value))} />
                        </div>
                        <div>
                            <Label style={{ color: "var(--brand-primary)" }}>Descontos</Label>
                            <Input type="number" step="0.01" min="0" value={descontos} onChange={(e) => setDescontos(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(44,32,27,0.05)" }}>
                        <p className="text-xs" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>Valor Final</p>
                        <p className="text-xl font-bold" style={{ color: valorFinal > saldo + 0.01 ? "#b91c1c" : "var(--brand-primary)" }}>
                            {formatCurrency(valorFinal)}
                        </p>
                        {valorFinal > saldo + 0.01 && (
                            <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>Valor excede o saldo restante</p>
                        )}
                    </div>

                    {error && <p className="text-sm text-center" style={{ color: "#b91c1c" }}>{error}</p>}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!isValid || submitting} className="btn-primary">
                        {submitting ? <><Loader2 className="size-4 animate-spin mr-2" /> Processando...</> : "Confirmar Recebimento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
