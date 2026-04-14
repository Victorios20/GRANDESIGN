import {
    addDays,
    endOfDay,
    endOfMonth,
    format,
    startOfDay,
    startOfMonth,
    startOfYear,
    subDays,
    subMonths,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import type {
    DashboardAnalysisStatus,
    DashboardAppliedFilters,
    DashboardChartWindowPreset,
    DashboardExpenseScope,
    DashboardPeriodPreset,
} from "@/types/financeiro"

export const DEFAULT_DASHBOARD_PERIOD_PRESET: DashboardPeriodPreset = "thisMonth"
export const DEFAULT_DASHBOARD_ANALYSIS_STATUS: DashboardAnalysisStatus = "realizado"

export const DASHBOARD_PERIOD_OPTIONS: Array<{ key: DashboardPeriodPreset; label: string }> = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "last7", label: "7 dias" },
    { key: "last30", label: "30 dias" },
    { key: "thisMonth", label: "Mês atual" },
    { key: "lastMonth", label: "Mês passado" },
    { key: "thisYear", label: "Este ano" },
    { key: "last3Months", label: "Últimos 3 meses" },
    { key: "custom", label: "Personalizado" },
]

export const DASHBOARD_EXPENSE_SCOPE_OPTIONS: Array<{ key: DashboardExpenseScope; label: string }> = [
    { key: "expense", label: "Despesas" },
    { key: "cost", label: "Custos" },
]

export const DASHBOARD_ANALYSIS_STATUS_OPTIONS: Array<{
    key: DashboardAnalysisStatus
    label: string
}> = [
    { key: "realizado", label: "Realizado" },
    { key: "previsto", label: "Previsto" },
    { key: "ambos", label: "Ambos" },
]

export const DASHBOARD_CHART_WINDOW_OPTIONS: Array<{ key: DashboardChartWindowPreset; label: string }> = [
    { key: "thisMonth", label: "Mês atual" },
    { key: "30d", label: "30d" },
    { key: "3m", label: "3m" },
    { key: "6m", label: "6m" },
    { key: "12m", label: "12m" },
]

interface ResolveDashboardFiltersInput {
    period_preset?: string | null
    period_start?: string | null
    period_end?: string | null
    account_ids?: number[]
    analysis_status?: string | null
    now?: Date
}

export interface DashboardPeriodShortcutOption {
    key: DashboardPeriodPreset
    label: string
    range: DateRange
}

function toISODate(value: Date) {
    return format(value, "yyyy-MM-dd")
}

function isValidPreset(value: string | null | undefined): value is DashboardPeriodPreset {
    return DASHBOARD_PERIOD_OPTIONS.some((option) => option.key === value)
}

function isValidAnalysisStatus(value: string | null | undefined): value is DashboardAnalysisStatus {
    return DASHBOARD_ANALYSIS_STATUS_OPTIONS.some((option) => option.key === value)
}

export function isValidDashboardChartWindow(value: string | null | undefined): value is DashboardChartWindowPreset {
    return DASHBOARD_CHART_WINDOW_OPTIONS.some((option) => option.key === value)
}

export function parseDashboardAccountIds(value: string | null | undefined) {
    if (!value) return []

    return value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0)
}

export function getDashboardStatusLabel(status: DashboardAnalysisStatus) {
    return DASHBOARD_ANALYSIS_STATUS_OPTIONS.find((option) => option.key === status)?.label ?? "Realizado"
}

export function getDashboardPresetLabel(preset: DashboardPeriodPreset) {
    return DASHBOARD_PERIOD_OPTIONS.find((option) => option.key === preset)?.label ?? "Mês atual"
}

export function getDashboardChartWindowLabel(window: DashboardChartWindowPreset) {
    return DASHBOARD_CHART_WINDOW_OPTIONS.find((option) => option.key === window)?.label ?? "30d"
}

export function getDashboardExpenseScopeLabel(scope: DashboardExpenseScope) {
    return DASHBOARD_EXPENSE_SCOPE_OPTIONS.find((option) => option.key === scope)?.label ?? "Despesas"
}

export function getDashboardShortcutOptions(now = new Date()): DashboardPeriodShortcutOption[] {
    const today = startOfDay(now)
    const yesterday = startOfDay(subDays(today, 1))
    const lastMonthDate = subMonths(today, 1)

    return [
        { key: "today", label: "Hoje", range: { from: today, to: today } },
        { key: "yesterday", label: "Ontem", range: { from: yesterday, to: yesterday } },
        { key: "last7", label: "Últimos 7 dias", range: { from: startOfDay(subDays(today, 6)), to: today } },
        { key: "last30", label: "Últimos 30 dias", range: { from: startOfDay(subDays(today, 29)), to: today } },
        { key: "thisMonth", label: "Este mês", range: { from: startOfMonth(today), to: today } },
        {
            key: "lastMonth",
            label: "Mês passado",
            range: { from: startOfMonth(lastMonthDate), to: endOfMonth(lastMonthDate) },
        },
        { key: "thisYear", label: "Este ano", range: { from: startOfYear(today), to: today } },
    ]
}

export function resolveDashboardFilters({
    period_preset,
    period_start,
    period_end,
    account_ids = [],
    analysis_status,
    now = new Date(),
}: ResolveDashboardFiltersInput): DashboardAppliedFilters {
    const today = startOfDay(now)
    const preset = isValidPreset(period_preset) ? period_preset : DEFAULT_DASHBOARD_PERIOD_PRESET
    const status = isValidAnalysisStatus(analysis_status) ? analysis_status : DEFAULT_DASHBOARD_ANALYSIS_STATUS

    if (preset === "custom" && period_start && period_end) {
        return {
            period_preset: "custom",
            period_start,
            period_end,
            period_label: `${format(new Date(`${period_start}T00:00:00`), "dd/MM/yyyy")} - ${format(new Date(`${period_end}T00:00:00`), "dd/MM/yyyy")}`,
            account_ids,
            analysis_status: status,
        }
    }

    const previousMonth = subMonths(today, 1)
    const ranges: Record<Exclude<DashboardPeriodPreset, "custom">, { start: Date; end: Date; label: string }> = {
        today: {
            start: today,
            end: endOfDay(today),
            label: "Hoje",
        },
        yesterday: {
            start: startOfDay(subDays(today, 1)),
            end: endOfDay(subDays(today, 1)),
            label: "Ontem",
        },
        last7: {
            start: startOfDay(subDays(today, 6)),
            end: endOfDay(today),
            label: "Últimos 7 dias",
        },
        last30: {
            start: startOfDay(subDays(today, 29)),
            end: endOfDay(today),
            label: "Últimos 30 dias",
        },
        thisMonth: {
            start: startOfMonth(today),
            end: endOfDay(today),
            label: "Mês atual",
        },
        lastMonth: {
            start: startOfMonth(previousMonth),
            end: endOfMonth(previousMonth),
            label: "Mês passado",
        },
        thisYear: {
            start: startOfYear(today),
            end: endOfDay(today),
            label: "Este ano",
        },
        last3Months: {
            start: startOfMonth(subMonths(today, 2)),
            end: endOfDay(today),
            label: "Últimos 3 meses",
        },
    }

    const range = ranges[preset as Exclude<DashboardPeriodPreset, "custom">]

    return {
        period_preset: preset as Exclude<DashboardPeriodPreset, "custom">,
        period_start: toISODate(range.start),
        period_end: toISODate(range.end),
        period_label: range.label,
        account_ids,
        analysis_status: status,
    }
}

export function buildDashboardSearchParams(filters: DashboardAppliedFilters) {
    const params = new URLSearchParams()

    params.set("period_preset", filters.period_preset)
    params.set("period_start", filters.period_start)
    params.set("period_end", filters.period_end)
    params.set("analysis_status", filters.analysis_status)

    if (filters.account_ids.length > 0) {
        params.set("account_ids", filters.account_ids.join(","))
    }

    return params
}

export function resolveDashboardChartWindow(window: string | null | undefined): DashboardChartWindowPreset {
    return isValidDashboardChartWindow(window) ? window : "3m"
}

export function getDashboardChartWindowRange(window: DashboardChartWindowPreset, now = new Date()) {
    const today = startOfDay(now)

    switch (window) {
        case "thisMonth":
            return {
                start: startOfMonth(today),
                end: endOfDay(today),
                resolution: "day" as const,
                label: "Mês atual",
            }
        case "30d":
            return {
                start: startOfDay(subDays(today, 29)),
                end: endOfDay(today),
                resolution: "day" as const,
                label: "Últimos 30 dias",
            }
        case "3m":
            return {
                start: startOfMonth(subMonths(today, 2)),
                end: endOfDay(today),
                resolution: "month" as const,
                label: "Últimos 3 meses",
            }
        case "6m":
            return {
                start: startOfMonth(subMonths(today, 5)),
                end: endOfDay(today),
                resolution: "month" as const,
                label: "Últimos 6 meses",
            }
        case "12m":
            return {
                start: startOfMonth(subMonths(today, 11)),
                end: endOfDay(today),
                resolution: "month" as const,
                label: "Últimos 12 meses",
            }
    }
}

export function getDashboardNext30Window(now = new Date()) {
    const today = startOfDay(now)
    return {
        start: today,
        end: endOfDay(addDays(today, 30)),
    }
}

export function getDashboardNext7Window(now = new Date()) {
    const today = startOfDay(now)
    return {
        start: today,
        end: endOfDay(addDays(today, 7)),
    }
}

export function getDashboardCurrentMonthWindow(now = new Date()) {
    const today = startOfDay(now)
    return {
        start: startOfMonth(today),
        end: endOfMonth(today),
    }
}
