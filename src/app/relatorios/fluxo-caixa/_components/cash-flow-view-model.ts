import {
    addDays,
    endOfMonth,
    format,
    isValid,
    parseISO,
    startOfDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import type {
    CashFlowDayStatus,
    CashFlowProjectionItem,
    CashFlowProjectionResponse,
    CashFlowProjectionScope,
    CashFlowScopeMode,
} from "@/types/financeiro"

export const CASH_FLOW_BRAND = {
    accent: "#f5d193",
    primary: "#2c201b",
    background: "#FAF3E0",
    secondary: "#393316",
} as const

export type CashFlowPresetKey =
    | "preset_7"
    | "preset_14"
    | "preset_28"
    | "current_month"
    | "preset_30"
    | "preset_60"
    | "preset_90"
    | "custom"

export interface CashFlowPeriodSelection {
    key: CashFlowPresetKey
    label: string
    scopeMode: CashFlowScopeMode
    periodStart?: string
    periodEnd?: string
}

export interface CashFlowChartPoint extends CashFlowProjectionItem {
    shortDate: string
    shortWeekday: string
    weekdayLabel: string
    isWorstDay: boolean
    isBestDay: boolean
    isCriticalDay: boolean
    observation: string
}

export const CASH_FLOW_PERIOD_OPTIONS: Array<{
    key: Exclude<CashFlowPresetKey, "custom">
    label: string
}> = [
    { key: "preset_7", label: "7 dias" },
    { key: "preset_14", label: "14 dias" },
    { key: "preset_28", label: "28 dias" },
    { key: "current_month", label: "Mes atual" },
    { key: "preset_30", label: "Prox. 30 dias" },
    { key: "preset_60", label: "Prox. 60 dias" },
    { key: "preset_90", label: "Prox. 90 dias" },
]

function parseDate(value: string) {
    return parseISO(value)
}

export function toIsoDate(value: Date) {
    return format(startOfDay(value), "yyyy-MM-dd")
}

export function parseCashFlowScopeRange(scope: CashFlowProjectionScope): DateRange | undefined {
    const from = parseDate(scope.period_start)
    const to = parseDate(scope.period_end)

    if (!isValid(from) || !isValid(to)) {
        return undefined
    }

    return { from, to }
}

export function formatCashFlowDate(value: string | null, pattern = "dd/MM/yyyy") {
    if (!value) {
        return "--"
    }

    const parsedDate = parseDate(value)

    if (!isValid(parsedDate)) {
        return value
    }

    return format(parsedDate, pattern, { locale: ptBR })
}

export function buildCashFlowSelectionFromScope(scope: CashFlowProjectionScope): CashFlowPeriodSelection {
    if (scope.mode === "preset_7") {
        return { key: "preset_7", label: "7 dias", scopeMode: "preset_7" }
    }

    if (scope.mode === "preset_14") {
        return { key: "preset_14", label: "14 dias", scopeMode: "preset_14" }
    }

    if (scope.mode === "preset_28") {
        return { key: "preset_28", label: "28 dias", scopeMode: "preset_28" }
    }

    if (scope.mode === "preset_30") {
        return { key: "preset_30", label: "Prox. 30 dias", scopeMode: "preset_30" }
    }

    if (scope.mode === "preset_60") {
        return { key: "preset_60", label: "Prox. 60 dias", scopeMode: "preset_60" }
    }

    if (scope.mode === "preset_90") {
        return { key: "preset_90", label: "Prox. 90 dias", scopeMode: "preset_90" }
    }

    return {
        key: "custom",
        label: "Periodo personalizado",
        scopeMode: "custom_range",
        periodStart: scope.period_start,
        periodEnd: scope.period_end,
    }
}

export function buildCashFlowSelectionFromPreset(key: Exclude<CashFlowPresetKey, "custom">): CashFlowPeriodSelection {
    const today = startOfDay(new Date())

    if (key === "current_month") {
        return {
            key,
            label: "Mes atual",
            scopeMode: "custom_range",
            periodStart: toIsoDate(today),
            periodEnd: toIsoDate(endOfMonth(today)),
        }
    }

    return {
        key,
        label: CASH_FLOW_PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? "Periodo",
        scopeMode: key,
    }
}

export function buildCashFlowCustomSelection(range: DateRange): CashFlowPeriodSelection {
    const from = range.from ? startOfDay(range.from) : undefined
    const to = startOfDay(range.to ?? range.from ?? new Date())

    return {
        key: "custom",
        label: "Periodo personalizado",
        scopeMode: "custom_range",
        periodStart: from ? toIsoDate(from) : undefined,
        periodEnd: toIsoDate(to),
    }
}

export function buildCashFlowPresetRange(key: Exclude<CashFlowPresetKey, "custom">): DateRange {
    const today = startOfDay(new Date())

    if (key === "preset_7") return { from: today, to: addDays(today, 6) }
    if (key === "preset_14") return { from: today, to: addDays(today, 13) }
    if (key === "preset_28") return { from: today, to: addDays(today, 27) }
    if (key === "current_month") return { from: today, to: endOfMonth(today) }
    if (key === "preset_60") return { from: today, to: addDays(today, 59) }
    if (key === "preset_90") return { from: today, to: addDays(today, 89) }

    return { from: today, to: addDays(today, 29) }
}

export function formatCashFlowRangeLabel(range: DateRange | undefined) {
    if (!range?.from) {
        return "Selecionar periodo"
    }

    const from = format(range.from, "dd/MM/yyyy", { locale: ptBR })
    const to = format(range.to ?? range.from, "dd/MM/yyyy", { locale: ptBR })

    if (from === to) {
        return from
    }

    return `${from} - ${to}`
}

export function formatAxisCurrency(value: number) {
    const absValue = Math.abs(value)

    if (absValue >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        })} mi`
    }

    if (absValue >= 1000) {
        return `${(value / 1000).toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        })} mil`
    }

    return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })
}

export function getCashFlowStatusLabel(status: CashFlowDayStatus) {
    if (status === "CRITICO") return "Critico"
    if (status === "ATENCAO") return "Atencao"
    return "Saudavel"
}

export function getCashFlowStatusClasses(status: CashFlowDayStatus) {
    if (status === "CRITICO") {
        // Darker, more present — saldo zero ou negativo merece peso visual real
        return "border-[rgba(44,32,27,0.28)] bg-[rgba(44,32,27,0.12)] text-[#2c201b]"
    }

    if (status === "ATENCAO") {
        // Legível: fundo mais rico e texto escuro para contraste WCAG
        return "border-[rgba(245,209,147,0.85)] bg-[rgba(245,209,147,0.52)] text-[#4a3400]"
    }

    // Usa cor semântica positiva do brand.md: #2f7a52
    return "border-[rgba(47,122,82,0.22)] bg-[rgba(47,122,82,0.07)] text-[#2f7a52]"
}

export function getCashFlowRowClasses(status: CashFlowDayStatus) {
    if (status === "CRITICO") {
        return "border-l-[3px] border-l-[#2c201b] bg-[rgba(44,32,27,0.05)] hover:bg-[rgba(44,32,27,0.08)]"
    }

    if (status === "ATENCAO") {
        return "border-l-[3px] border-l-[#e6b84a] bg-[rgba(245,209,147,0.16)] hover:bg-[rgba(245,209,147,0.22)]"
    }

    return "border-l-[3px] border-l-transparent bg-white hover:bg-[#faf8f4]"
}

export function getCashPressureLabel(data: CashFlowProjectionResponse) {
    if (data.analytics.critical_days_count > 0) {
        return "Alta"
    }

    if (data.analytics.attention_days_count > 0) {
        return "Moderada"
    }

    return "Baixa"
}

function buildCashFlowObservation(
    item: CashFlowProjectionItem,
    data: CashFlowProjectionResponse,
) {
    if (item.date === data.analytics.worst_day.date) {
        return "Pior saldo"
    }

    if (item.date === data.analytics.best_day.date) {
        return "Melhor saldo"
    }

    if (item.date === data.analytics.biggest_inflow_day.date && item.entradas_previstas > 0) {
        return "Maior entrada"
    }

    if (item.date === data.analytics.biggest_outflow_day.date && item.saidas_previstas > 0) {
        return "Maior saida"
    }

    if (item.status === "CRITICO") {
        return "Saldo zerado ou negativo"
    }

    if (item.status === "ATENCAO") {
        return "Abaixo do limite"
    }

    return "Dentro do limite"
}

export function buildCashFlowChartData(data: CashFlowProjectionResponse): CashFlowChartPoint[] {
    return data.projection.map((item) => ({
        ...item,
        shortDate: formatCashFlowDate(item.date, "dd/MM"),
        shortWeekday: format(parseDate(item.date), "EEE", { locale: ptBR }),
        weekdayLabel: format(parseDate(item.date), "EEEE", { locale: ptBR }),
        isWorstDay: item.date === data.analytics.worst_day.date,
        isBestDay: item.date === data.analytics.best_day.date,
        isCriticalDay: item.status === "CRITICO",
        observation: buildCashFlowObservation(item, data),
    }))
}

export function buildCashFlowDiagnosis(data: CashFlowProjectionResponse) {
    const pressure = getCashPressureLabel(data)
    const worstDayDate = formatCashFlowDate(data.analytics.worst_day.date)
    const worstDayValue = data.analytics.worst_day.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })

    if (
        data.summary.entradas_previstas === 0 &&
        data.summary.saidas_previstas === 0 &&
        data.analytics.critical_days_count === 0
    ) {
        return {
            headline: "Horizonte estavel no periodo selecionado.",
            description: "Nao ha novos compromissos abertos pressionando o caixa nesta janela.",
            pressure,
        }
    }

    if (data.analytics.critical_days_count > 0) {
        return {
            headline: `${data.analytics.critical_days_count} dia(s) critico(s) na janela.`,
            description: `Menor saldo em ${worstDayDate}, com fechamento projetado de ${worstDayValue}.`,
            pressure,
        }
    }

    if (data.analytics.attention_days_count > 0) {
        return {
            headline: `${data.analytics.attention_days_count} dia(s) abaixo do limite de seguranca.`,
            description: `O pior ponto ocorre em ${worstDayDate}, com saldo projetado de ${worstDayValue}.`,
            pressure,
        }
    }

    return {
        headline: "Caixa saudavel em toda a janela.",
        description: `O menor saldo projetado no periodo e ${worstDayValue}, em ${worstDayDate}.`,
        pressure,
    }
}
