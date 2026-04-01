"use client"

import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { Loader2, HelpCircle } from "lucide-react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { PageLayout } from "@/components/ui/pageLayout"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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

// ── Sub-componente: item de linha no sidebar ──────────────────────────────────
function SidebarRow({
    label,
    children,
}: {
    label: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-[86px] flex-col justify-center space-y-1 py-4 last:pb-0">
            <div className="flex items-center gap-1.5">{label}</div>
            {children}
        </div>
    )
}

// ── Sub-componente: label de seção no sidebar ─────────────────────────────────
function SidebarLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9a8f7c]">
            {children}
        </p>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FluxoCaixaClient({ costCenters, initialData }: Props) {
    const [data, setData] = useState(initialData)
    const [filters, setFilters] = useState<AppliedFilters>({
        costCenterId: "all",
        period: buildCashFlowSelectionFromScope(initialData.scope),
        range: parseCashFlowScopeRange(initialData.scope),
    })
    const [loading, setLoading] = useState(false)

    const diagnosis = useMemo(() => buildCashFlowDiagnosis(data), [data])

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

            const response = await fetch(
                `/api/financeiro/reports/cash-flow-projection?${params.toString()}`,
                { cache: "no-store" },
            )

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

    async function handlePeriodChange(
        period: CashFlowPeriodSelection,
        range: DateRange | undefined,
    ) {
        await fetchProjection({ ...filters, period, range })
    }

    async function handleCostCenterChange(costCenterId: string) {
        await fetchProjection({ ...filters, costCenterId })
    }

    return (
        <PageLayout title="Fluxo de Caixa">
            <div className="mx-auto max-w-[1480px] space-y-6 pb-10">

                {/* ── Cabeçalho ── */}
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">
                        Fluxo de Caixa
                    </h1>
                    <p className="text-sm text-[#7b705f]">
                        Projeção diária de entradas, saídas e saldo
                    </p>
                </div>

                {/* ── Filtros ── */}
                <div className="rounded-2xl border border-[#e8e1d6] bg-[#faf8f3] px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-3">
                            <CashFlowPeriodControl
                                selection={filters.period}
                                range={filters.range}
                                disabled={loading}
                                onApplySelection={(period, range) =>
                                    void handlePeriodChange(period, range)
                                }
                            />

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8f7c]">
                                    Centro de custo
                                </Label>
                                <Select
                                    value={filters.costCenterId}
                                    onValueChange={(value) =>
                                        void handleCostCenterChange(value)
                                    }
                                    disabled={loading}
                                >
                                    <SelectTrigger className="h-9 w-full rounded-lg border-[#d9d3c8] bg-white text-sm text-[#2c201b] focus-visible:ring-[#393316]/15 md:w-[240px]">
                                        <SelectValue placeholder="Todos os centros" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos os centros
                                        </SelectItem>
                                        {costCenters.map((costCenter) => (
                                            <SelectItem
                                                key={costCenter.id}
                                                value={String(costCenter.id)}
                                            >
                                                {costCenter.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            <span className="rounded-md border border-[#ddd7cc] bg-white px-3 py-1.5 text-[11px] tabular-nums text-[#7b705f]">
                                {formatCashFlowDate(data.scope.period_start)} até{" "}
                                {formatCashFlowDate(data.scope.period_end)}
                            </span>
                            <span className="rounded-md border border-[#ddd7cc] bg-white px-3 py-1.5 text-[11px] tabular-nums text-[#7b705f]">
                                Limite de segurança:{" "}
                                <span className="font-medium text-[#5b5347]">
                                    {formatCurrency(data.safety_limit)}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 4 cards principais ── */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <CashFlowMetricCard
                        label="Saldo atual"
                        value={formatCurrency(data.summary.saldo_atual)}
                        supportingText="Base disponível hoje"
                        variant="primary"
                    />
                    <CashFlowMetricCard
                        label="Saldo projetado"
                        value={formatCurrency(data.summary.saldo_final_previsto)}
                        supportingText="Fechamento do período"
                        tone={data.summary.saldo_final_previsto <= 0 ? "accent" : "default"}
                    />
                    <CashFlowMetricCard
                        label="Entradas"
                        value={formatCurrency(data.summary.entradas_previstas)}
                        supportingText="Total previsto na janela"
                        tone="positive"
                    />
                    <CashFlowMetricCard
                        label="Saídas"
                        value={formatCurrency(data.summary.saidas_previstas)}
                        supportingText="Total previsto na janela"
                        tone="accent"
                    />
                </div>

                {/* ── Gráfico + Sidebar de análise ── */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">

                    {/* Chart — cresce para ocupar o espaço disponível */}
                    <div className="min-w-0 flex-1">
                        <CashFlowChartPanel data={data} />
                    </div>

                    {/* Sidebar — painel de análise fixo à direita */}
                    <div className="overflow-hidden rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:w-[256px] xl:shrink-0">

                        {/* Header do sidebar */}
                        <div className="border-b border-[#e7e0d4] bg-[#faf8f3] px-5 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a8f7c]">
                                Análise do período
                            </p>
                        </div>

                        {/* Corpo do sidebar — itens empilhados com divisores */}
                        <div className="divide-y divide-[#f0ece4] px-5">

                            {/* Melhor dia */}
                            <SidebarRow label={<SidebarLabel>Melhor dia</SidebarLabel>}>
                                <p className="text-base font-semibold leading-tight tabular-nums text-[#2f7a52]">
                                    {formatCurrency(data.analytics.best_day.value)}
                                </p>
                                <p className="text-[11px] tabular-nums text-[#9a8f7c]">
                                    {formatCashFlowDate(data.analytics.best_day.date)}
                                </p>
                            </SidebarRow>

                            {/* Pior dia */}
                            <SidebarRow label={<SidebarLabel>Pior dia</SidebarLabel>}>
                                <p className="text-base font-semibold leading-tight tabular-nums text-[#9b4b1d]">
                                    {formatCurrency(data.analytics.worst_day.value)}
                                </p>
                                <p className="text-[11px] tabular-nums text-[#9a8f7c]">
                                    {formatCashFlowDate(data.analytics.worst_day.date)}
                                </p>
                            </SidebarRow>

                            {/* Dias críticos */}
                            <SidebarRow label={<SidebarLabel>Dias críticos</SidebarLabel>}>
                                <p className={`text-base font-semibold leading-tight tabular-nums ${data.analytics.critical_days_count > 0 ? "text-[#9b4b1d]" : "text-[#2c201b]"}`}>
                                    {data.analytics.critical_days_count}
                                </p>
                                <p className="text-[11px] tabular-nums text-[#9a8f7c]">
                                    {data.analytics.attention_days_count} em atenção
                                </p>
                            </SidebarRow>

                            {/* Pressão de caixa + tooltip */}
                            <SidebarRow
                                label={
                                    <>
                                        <SidebarLabel>Pressão de caixa</SidebarLabel>
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="flex items-center text-[#c5bdb3] transition-colors hover:text-[#7b705f] focus-visible:outline-none"
                                                        aria-label="Entender pressão de caixa"
                                                    >
                                                        <HelpCircle className="h-3 w-3" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="left"
                                                    align="start"
                                                    className="max-w-[260px] rounded-xl border border-[#e8e1d6] bg-white p-4 text-left shadow-[0_4px_16px_rgba(44,32,27,0.10)]"
                                                >
                                                    <p className="mb-2 text-xs font-semibold text-[#2c201b]">
                                                        Pressão de caixa
                                                    </p>
                                                    <p className="mb-3 text-[11px] leading-[1.6] text-[#6f6556]">
                                                        Indica o nível de risco financeiro no período analisado, calculado a partir da quantidade de dias críticos e de atenção.
                                                    </p>
                                                    <div className="space-y-2 border-t border-[#f0ece4] pt-3">
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#2f7a52]" />
                                                            <p className="text-[11px] leading-[1.5] text-[#5b5347]">
                                                                <span className="font-semibold">Baixa</span> — nenhum dia abaixo do limite de segurança.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#b87c2a]" />
                                                            <p className="text-[11px] leading-[1.5] text-[#5b5347]">
                                                                <span className="font-semibold">Moderada</span> — há dias em atenção, mas sem saldo negativo ou zerado.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#9b4b1d]" />
                                                            <p className="text-[11px] leading-[1.5] text-[#5b5347]">
                                                                <span className="font-semibold">Alta</span> — existem dias críticos com saldo zerado ou negativo.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </>
                                }
                            >
                                <p className={`text-base font-semibold leading-tight ${
                                    diagnosis.pressure === "Alta"     ? "text-[#9b4b1d]" :
                                    diagnosis.pressure === "Moderada" ? "text-[#5b3f00]" :
                                                                        "text-[#2f7a52]"
                                }`}>
                                    {diagnosis.pressure}
                                </p>
                            </SidebarRow>

                            {/* Diagnóstico textual */}
                            <SidebarRow label={<SidebarLabel>Diagnóstico</SidebarLabel>}>
                                <p className="text-[12px] font-semibold leading-snug text-[#2c201b]">
                                    {diagnosis.headline}
                                </p>
                                <p className="mt-1 text-[11px] leading-[1.55] text-[#6f6556]">
                                    {diagnosis.description}
                                </p>
                            </SidebarRow>

                        </div>
                    </div>
                </div>

                {/* ── Tabela diária ── */}
                <CashFlowDailyTable data={data} />

                {/* ── Loading overlay ── */}
                {loading ? (
                    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e1d6] bg-white px-4 py-2 text-xs text-[#7b705f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                            <Loader2 className="size-3.5 animate-spin text-[#9a8f7c]" />
                            Atualizando fluxo de caixa...
                        </div>
                    </div>
                ) : null}
            </div>
        </PageLayout>
    )
}
