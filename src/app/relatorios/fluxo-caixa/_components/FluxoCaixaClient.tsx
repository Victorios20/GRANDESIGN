"use client"

import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PageLayout } from "@/components/ui/pageLayout"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { CashFlowProjectionResponse } from "@/types/financeiro"

import { CashFlowChartPanel } from "./CashFlowChartPanel"
import { CashFlowDailyTable } from "./CashFlowDailyTable"
import { CashFlowMetricCard } from "./CashFlowMetricCard"
import { CashFlowPeriodControl } from "./CashFlowPeriodControl"
import {
    buildCashFlowDiagnosis,
    buildCashFlowSelectionFromScope,
    formatCashFlowDate,
    parseCashFlowScopeRange,
    type CashFlowPeriodSelection,
} from "./cash-flow-view-model"

interface Option {
    id: number
    nome: string
}

interface Props {
    costCenters: Option[]
    initialData: CashFlowProjectionResponse
}

interface AppliedFilters {
    costCenterId: string
    period: CashFlowPeriodSelection
    range: DateRange | undefined
}

export default function FluxoCaixaClient({ costCenters, initialData }: Props) {
    const [data, setData] = useState(initialData)
    const [filters, setFilters] = useState<AppliedFilters>({
        costCenterId: "all",
        period: buildCashFlowSelectionFromScope(initialData.scope),
        range: parseCashFlowScopeRange(initialData.scope),
    })
    const [loading, setLoading] = useState(false)

    const diagnosis = useMemo(() => buildCashFlowDiagnosis(data), [data])
    const netVariation = data.summary.entradas_previstas - data.summary.saidas_previstas

    async function fetchProjection(nextFilters: AppliedFilters) {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                scope_mode: nextFilters.period.scopeMode,
            })

            if (nextFilters.period.scopeMode === "custom_range") {
                if (nextFilters.period.periodStart) {
                    params.set("period_start", nextFilters.period.periodStart)
                }

                if (nextFilters.period.periodEnd) {
                    params.set("period_end", nextFilters.period.periodEnd)
                }
            }

            if (nextFilters.costCenterId !== "all") {
                params.set("centro_custo_id", nextFilters.costCenterId)
            }

            const response = await fetch(`/api/financeiro/reports/cash-flow-projection?${params.toString()}`, {
                cache: "no-store",
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error ?? "Erro ao carregar projecao")
            }

            const nextData = (await response.json()) as CashFlowProjectionResponse

            setData(nextData)
            setFilters({
                ...nextFilters,
                period: buildCashFlowSelectionFromScope(nextData.scope),
                range: parseCashFlowScopeRange(nextData.scope),
            })
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    async function handlePeriodChange(period: CashFlowPeriodSelection, range: DateRange | undefined) {
        await fetchProjection({
            ...filters,
            period,
            range,
        })
    }

    async function handleCostCenterChange(costCenterId: string) {
        await fetchProjection({
            ...filters,
            costCenterId,
        })
    }

    return (
        <PageLayout title="Fluxo de Caixa">
            <div className="mx-auto max-w-[1480px] space-y-6 pb-10">
                <section className="space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[#2c201b]">
                            Fluxo de Caixa
                        </h1>
                        <p className="text-sm text-[rgba(44,32,27,0.68)]">
                            Projecao diaria de entradas, saidas e saldo
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(44,32,27,0.08)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                            <CashFlowPeriodControl
                                selection={filters.period}
                                range={filters.range}
                                disabled={loading}
                                onApplySelection={(period, range) => void handlePeriodChange(period, range)}
                            />

                            <div className="space-y-2">
                                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.62)]">
                                    Centro de custo
                                </Label>
                                <Select
                                    value={filters.costCenterId}
                                    onValueChange={(value) => void handleCostCenterChange(value)}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="h-11 w-full rounded-lg border-[#2c201b] bg-transparent text-[#2c201b] md:w-[240px]">
                                        <SelectValue placeholder="Todos os centros" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os centros</SelectItem>
                                        {costCenters.map((costCenter) => (
                                            <SelectItem key={costCenter.id} value={String(costCenter.id)}>
                                                {costCenter.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-[rgba(44,32,27,0.68)]">
                            <span className="rounded-full border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] px-3 py-1.5">
                                {formatCashFlowDate(data.scope.period_start)} ate {formatCashFlowDate(data.scope.period_end)}
                            </span>
                            <span className="rounded-full border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] px-3 py-1.5">
                                Limite de seguranca: {formatCurrency(data.safety_limit)}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-5">
                    <CashFlowMetricCard
                        label="Saldo atual"
                        value={formatCurrency(data.summary.saldo_atual)}
                        supportingText="Base disponivel hoje"
                    />
                    <CashFlowMetricCard
                        label="Saldo projetado"
                        value={formatCurrency(data.summary.saldo_final_previsto)}
                        supportingText="Fechamento do periodo"
                        tone={data.summary.saldo_final_previsto <= 0 ? "accent" : "default"}
                    />
                    <CashFlowMetricCard
                        label="Entradas"
                        value={formatCurrency(data.summary.entradas_previstas)}
                        supportingText="Total previsto na janela"
                    />
                    <CashFlowMetricCard
                        label="Saidas"
                        value={formatCurrency(data.summary.saidas_previstas)}
                        supportingText="Total previsto na janela"
                    />
                    <CashFlowMetricCard
                        label="Variacao liquida"
                        value={formatCurrency(netVariation)}
                        supportingText="Entradas menos saidas"
                        tone={netVariation < 0 ? "accent" : "muted"}
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <CashFlowMetricCard
                        label="Pior dia"
                        value={formatCurrency(data.analytics.worst_day.value)}
                        supportingText={formatCashFlowDate(data.analytics.worst_day.date)}
                        tone="accent"
                    />
                    <CashFlowMetricCard
                        label="Melhor dia"
                        value={formatCurrency(data.analytics.best_day.value)}
                        supportingText={formatCashFlowDate(data.analytics.best_day.date)}
                        tone="muted"
                    />
                    <CashFlowMetricCard
                        label="Dias criticos"
                        value={String(data.analytics.critical_days_count)}
                        supportingText={`${data.analytics.attention_days_count} dia(s) em atencao`}
                        tone={data.analytics.critical_days_count > 0 ? "accent" : "default"}
                    />
                </section>

                <CashFlowChartPanel data={data} />

                <Card className="rounded-2xl border border-[rgba(44,32,27,0.08)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="max-w-3xl space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                    Diagnostico rapido
                                </p>
                                <h2 className="text-lg font-semibold text-[#2c201b]">
                                    {diagnosis.headline}
                                </h2>
                                <p className="text-sm leading-6 text-[rgba(44,32,27,0.72)]">
                                    {diagnosis.description}
                                </p>
                            </div>

                            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:max-w-[520px]">
                                <div className="rounded-xl border border-[rgba(44,32,27,0.08)] bg-[#FAF3E0] px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                        Menor saldo
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-[#2c201b]">
                                        {formatCurrency(data.analytics.worst_day.value)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[rgba(44,32,27,0.08)] bg-[#FAF3E0] px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                        Data critica
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-[#2c201b]">
                                        {formatCashFlowDate(data.analytics.worst_day.date)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[rgba(44,32,27,0.08)] bg-[#FAF3E0] px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                        Dias criticos
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-[#2c201b]">
                                        {data.analytics.critical_days_count}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[rgba(44,32,27,0.08)] bg-[#FAF3E0] px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                        Pressao de caixa
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-[#2c201b]">
                                        {diagnosis.pressure}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <CashFlowDailyTable data={data} />

                {loading ? (
                    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(44,32,27,0.10)] bg-white px-4 py-2 text-sm text-[rgba(44,32,27,0.72)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                            <Loader2 className="size-4 animate-spin" />
                            Atualizando fluxo de caixa...
                        </div>
                    </div>
                ) : null}
            </div>
        </PageLayout>
    )
}
