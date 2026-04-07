"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"
import { formatCurrency, remaining } from "@/lib/financeiro-utils"
import { formatPedidoId } from "@/lib/pedido-compra-utils"
import type { BankOption, PayableListItem } from "@/types/financeiro"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: PayableListItem
    banks: BankOption[]
    onSuccess: () => void
}

function getTodayValue() {
    return new Date().toISOString().split("T")[0]
}

export default function PaymentModal({ open, onOpenChange, item, banks, onSuccess }: Props) {
    const saldo = remaining(item.valor_total, item.valor_pago)
    const [contaBancariaId, setContaBancariaId] = useState("")
    const [valor, setValor] = useState(saldo)
    const [juros, setJuros] = useState(0)
    const [descontos, setDescontos] = useState(0)
    const [dataPagamento, setDataPagamento] = useState(getTodayValue)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!open) return
        setContaBancariaId("")
        setValor(saldo)
        setJuros(0)
        setDescontos(0)
        setDataPagamento(getTodayValue())
        setError("")
    }, [open, saldo, item.id])

    const valorFinal = useMemo(() => valor + juros - descontos, [valor, juros, descontos])
    const bankItems = useMemo(
        () => banks.map((bank) => ({ value: String(bank.id), label: `${bank.nome} - ${formatCurrency(bank.saldo_atual)}` })),
        [banks]
    )
    const selectedBank = banks.find((bank) => String(bank.id) === contaBancariaId)

    const isValid = useMemo(() => {
        if (!contaBancariaId) return false
        if (valorFinal <= 0) return false
        if (valorFinal > saldo + 0.01) return false
        if (!dataPagamento) return false
        return true
    }, [contaBancariaId, dataPagamento, saldo, valorFinal])

    async function handleSubmit() {
        if (!isValid) return
        setSubmitting(true)
        setError("")

        try {
            const idempotencyKey = `pay-${item.id}-${Date.now()}`
            const response = await fetch("/api/financeiro/payables/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conta_pagar_id: item.id,
                    conta_bancaria_id: Number(contaBancariaId),
                    valor: valorFinal,
                    data_pagamento: new Date(dataPagamento),
                    idempotencyKey,
                }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || "Erro ao processar pagamento")
            }

            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro inesperado"
            setError(message)
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-[#2C201B]/10 bg-[#FFFCF7] sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-[#2C201B]">Registrar baixa</DialogTitle>
                    <DialogDescription className="text-[#2C201B]/65">
                        Confirme a conta bancária, a data e o valor efetivo para quitar esta conta.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-xl border border-[#2C201B]/10 bg-white/70 p-4">
                        <p className="text-sm font-semibold text-[#2C201B]">{item.descricao}</p>
                        {item.pedido_compra ? (
                            <Link
                                href={`/pedido_compra/ver/${item.pedido_compra.id}`}
                                className="mt-2 inline-flex rounded-md border border-[#ebe5da] bg-[#faf8f4] px-2 py-0.5 text-[11px] font-medium text-[#8a7f70] transition-colors hover:border-[#ddd7cc] hover:text-[#2c201b]"
                            >
                                Origem {formatPedidoId(item.pedido_compra.id, item.pedido_compra.obra_id)}
                            </Link>
                        ) : null}
                        <div className="mt-3 grid gap-3 text-sm text-[#2C201B]/70 sm:grid-cols-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Total</p>
                                <p className="mt-1 font-medium text-[#2C201B]">{formatCurrency(item.valor_total)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Pago</p>
                                <p className="mt-1 font-medium text-[#2C201B]">{formatCurrency(item.valor_pago)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Saldo</p>
                                <p className="mt-1 font-semibold text-[#2C201B]">{formatCurrency(saldo)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#2C201B]">Data da baixa</Label>
                        <Input type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#2C201B]">Conta bancária</Label>
                        <SearchableSelect
                            value={contaBancariaId}
                            onValueChange={setContaBancariaId}
                            items={bankItems}
                            placeholder="Selecionar conta bancária"
                            searchPlaceholder="Buscar conta bancária"
                        />
                        {selectedBank ? (
                            <p className="text-xs text-[#2C201B]/55">Saldo atual da conta: {formatCurrency(selectedBank.saldo_atual)}</p>
                        ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-[#2C201B]">Valor da baixa</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={saldo}
                                value={valor}
                                onChange={(event) => setValor(Number(event.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#2C201B]">Juros / multa</Label>
                            <Input type="number" step="0.01" min="0" value={juros} onChange={(event) => setJuros(Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#2C201B]">Descontos</Label>
                            <Input type="number" step="0.01" min="0" value={descontos} onChange={(event) => setDescontos(Number(event.target.value))} />
                        </div>
                    </div>

                    <div className={cn(
                        "rounded-xl border p-4 text-center",
                        valorFinal > saldo + 0.01 ? "border-[#F1B7B0] bg-[#FFF4F2]" : "border-[#E8D9BC] bg-[#FFF9EE]"
                    )}>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#2C201B]/45">Valor final da baixa</p>
                        <p className={cn("mt-2 text-3xl font-semibold", valorFinal > saldo + 0.01 ? "text-[#B42318]" : "text-[#2C201B]")}>
                            {formatCurrency(valorFinal)}
                        </p>
                        {valorFinal > saldo + 0.01 ? (
                            <p className="mt-2 text-sm text-[#B42318]">O valor final não pode ultrapassar o saldo restante.</p>
                        ) : null}
                    </div>

                    {error ? (
                        <div className="flex items-start gap-2 rounded-xl border border-[#F1B7B0] bg-[#FFF4F2] px-4 py-3 text-sm text-[#8F3F37]">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={!isValid || submitting} className="btn-primary">
                        {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Processando...</> : "Confirmar baixa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
