"use client"

import { useState } from "react"
import { Loader2, SlidersHorizontal, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { CashFlowSettings } from "@/types/financeiro"

type Props = {
    initialCashFlowSettings: CashFlowSettings
}

export default function ParametersPageClient({ initialCashFlowSettings }: Props) {
    const [cashFlowSettings, setCashFlowSettings] = useState(initialCashFlowSettings)
    const [safetyLimitInput, setSafetyLimitInput] = useState(String(initialCashFlowSettings.safety_limit))
    const [closingDateInput, setClosingDateInput] = useState(
        initialCashFlowSettings.closing_date ? initialCashFlowSettings.closing_date.split("T")[0] : ""
    )
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        try {
            setSaving(true)

            const response = await fetch("/api/financeiro/settings/cash-flow", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    safety_limit: Number(safetyLimitInput || 0),
                    closing_date: closingDateInput ? closingDateInput : null,
                }),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(payload?.error ?? "Erro ao salvar parametrizacoes")
            }

            setCashFlowSettings(payload as CashFlowSettings)
            setSafetyLimitInput(String((payload as CashFlowSettings).safety_limit))
            setClosingDateInput(
                (payload as CashFlowSettings).closing_date
                    ? (payload as CashFlowSettings).closing_date!.split("T")[0]
                    : ""
            )
            toast.success("Parametrizacao do fluxo de caixa atualizada")
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2C201B]/10 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2C201B]/52">
                        <SlidersHorizontal className="size-3.5" />
                        Configuracoes Financeiras
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
                            Parametrizacoes
                        </h1>
                        <p className="mt-1 text-sm text-[#2C201B]/62">
                            Ajuste o limite que separa dias em atencao dos dias saudaveis no fluxo de caixa.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                <Card className="border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2C201B]/45">
                                    Limite atual
                                </p>
                                <p className="text-2xl font-semibold text-[#2C201B]">
                                    {formatCurrency(cashFlowSettings.safety_limit)}
                                </p>
                                <p className="text-sm text-[#2C201B]/58">
                                    Saldo acumulado acima deste valor sera classificado como saudavel.
                                </p>
                                <p className="text-sm text-[#2C201B]/58">
                                    Fechamento atual: {cashFlowSettings.closing_date ? cashFlowSettings.closing_date.split("T")[0] : "Nao definido"}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2C201B]/8 bg-[#FAF3E0]">
                                <WalletCards className="size-5 text-[#393316]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-[rgba(44,32,27,0.08)] bg-[#FFFCF7]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-[#2C201B]">
                            Fluxo de Caixa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-end">
                            <div className="space-y-2">
                                <Label htmlFor="cash-flow-closing-date">Data de fechamento</Label>
                                <Input
                                    id="cash-flow-closing-date"
                                    type="date"
                                    value={closingDateInput}
                                    onChange={(event) => setClosingDateInput(event.target.value)}
                                    className="h-11 border-[#2C201B]/10 bg-white"
                                />
                            </div>
                            <p className="text-sm leading-6 text-[#2C201B]/62">
                                Lancamentos com data de competencia ate a data informada ficam bloqueados para alteracao ate que o periodo seja reaberto.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-end">
                            <div className="space-y-2">
                                <Label htmlFor="cash-flow-safety-limit">Limite de seguranca</Label>
                                <Input
                                    id="cash-flow-safety-limit"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={safetyLimitInput}
                                    onChange={(event) => setSafetyLimitInput(event.target.value)}
                                    className="h-11 border-[#2C201B]/10 bg-white"
                                />
                            </div>
                            <p className="text-sm leading-6 text-[#2C201B]/62">
                                Dias com saldo acumulado menor ou igual a zero seguem como criticos. Dias acima de zero, mas abaixo deste limite, aparecem como atencao.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="button" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                                Salvar parametro
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
