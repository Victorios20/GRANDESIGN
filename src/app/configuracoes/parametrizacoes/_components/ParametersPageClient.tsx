"use client"

import { useState } from "react"
import { Loader2, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfigurationPageIntro } from "@/components/configuracoes/ConfigurationChrome"
import {
    operationalListPrimaryButtonClass,
    operationalListShellClass,
} from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CashFlowSettings } from "@/types/financeiro"

type Props = {
    initialCashFlowSettings: CashFlowSettings
}

export default function ParametersPageClient({ initialCashFlowSettings }: Props) {
    const [safetyLimitInput, setSafetyLimitInput] = useState(String(initialCashFlowSettings.safety_limit))
    const [margemPadraoInput, setMargemPadraoInput] = useState(String(initialCashFlowSettings.margem_padrao_obras ?? 15))
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
                    margem_padrao_obras: Number(margemPadraoInput || 15),
                }),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(payload?.error ?? "Erro ao salvar parametrizacoes")
            }

            setSafetyLimitInput(String((payload as CashFlowSettings).safety_limit))
            setMargemPadraoInput(String((payload as CashFlowSettings).margem_padrao_obras ?? 15))
            setClosingDateInput(
                (payload as CashFlowSettings).closing_date
                    ? (payload as CashFlowSettings).closing_date!.split("T")[0]
                    : ""
            )
            toast.success("Parametrizações atualizadas com sucesso!")
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <ConfigurationPageIntro
                eyebrow="Configurações globais"
                title="Parametrizações"
                description="Controle as regras de negócio e os limites operacionais básicos do sistema."
            />

            <div className="hidden">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2C201B]/10 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2C201B]/52">
                        <SlidersHorizontal className="size-3.5" />
                        Configuracoes globais
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#2C201B]">
                            Parametrizacoes
                        </h1>
                        <p className="mt-1 text-sm text-[#2C201B]/62">
                            Controle as regras unificadas de funcionamento.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                <Card className={cn(operationalListShellClass, "overflow-hidden")}>
                    <CardHeader className="border-b border-[#2C201B]/5 bg-[#FAFAFA] px-6 py-4">
                        <CardTitle className="text-base font-semibold text-[#2C201B]">
                            Obras e Orçamentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-start">
                            <div className="space-y-2">
                                <Label htmlFor="obra-margem" className="text-sm font-medium text-[#2C201B]/90">
                                    Margem de lucro (%)
                                </Label>
                                <Input
                                    id="obra-margem"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={margemPadraoInput}
                                    onChange={(event) => setMargemPadraoInput(event.target.value)}
                                    className="h-11 border-[#2C201B]/10 bg-white"
                                />
                            </div>
                            <div className="md:pt-9">
                                <p className="text-sm leading-6 text-[#2C201B]/62">
                                    Define o percentual base (Empresa GD) aplicado sobre a soma de materiais e mão-de-obra na geração automática de orçamentos.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(operationalListShellClass, "overflow-hidden")}>
                    <CardHeader className="border-b border-[#2C201B]/5 bg-[#FAFAFA] px-6 py-4">
                        <CardTitle className="text-base font-semibold text-[#2C201B]">
                            Fluxo de Caixa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-start">
                            <div className="space-y-2">
                                <Label htmlFor="cash-flow-closing-date" className="text-sm font-medium text-[#2C201B]/90">
                                    Data de fechamento
                                </Label>
                                <Input
                                    id="cash-flow-closing-date"
                                    type="date"
                                    value={closingDateInput}
                                    onChange={(event) => setClosingDateInput(event.target.value)}
                                    className="h-11 border-[#2C201B]/10 bg-white"
                                />
                            </div>
                            <div className="md:pt-9">
                                <p className="text-sm leading-6 text-[#2C201B]/62">
                                    Lancamentos com data de competencia ate a data informada ficam bloqueados para alteracao ate que o periodo seja reaberto.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-start">
                            <div className="space-y-2">
                                <Label htmlFor="cash-flow-safety-limit" className="text-sm font-medium text-[#2C201B]/90">
                                    Limite de seguranca (R$)
                                </Label>
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
                            <div className="md:pt-9">
                                <p className="text-sm leading-6 text-[#2C201B]/62">
                                    Dias com saldo acumulado menor ou igual a zero seguem como criticos. Dias acima de zero, mas abaixo deste limite, aparecem na cor de atencao.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(operationalListPrimaryButtonClass, "h-11 px-8")}
                    >
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Salvar parametrizações
                    </Button>
                </div>
            </div>
        </div>
    )
}
