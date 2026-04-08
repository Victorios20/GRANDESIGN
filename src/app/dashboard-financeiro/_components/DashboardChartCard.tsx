"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildDashboardSearchParams, DASHBOARD_CHART_WINDOW_OPTIONS } from "@/lib/financeiro-dashboard"
import { formatCurrency } from "@/lib/financeiro-utils"
import type {
    DashboardAppliedFilters,
    DashboardChartWindowPreset,
    DashboardEvolutionPoint,
    DashboardSummary,
} from "@/types/financeiro"

interface DashboardChartCardProps {
    data: DashboardSummary["evolution"]
    filters: DashboardAppliedFilters
    onSelectPoint: (point: DashboardEvolutionPoint) => void
}

interface TooltipEntry {
    color?: string
    dataKey?: string | number
    name?: string
    value?: number
}

interface ChartClickState {
    activePayload?: Array<{
        payload?: DashboardEvolutionPoint
    }>
}

const CHART_SERIES_COLORS = {
    receitas: "#4B8F67",
    despesas: "#B66A61",
    saldo_acumulado: "#2C201B",
} as const

const CHART_SERIES_META = [
    { key: "receitas", label: "Receitas", color: CHART_SERIES_COLORS.receitas },
    { key: "despesas", label: "Despesas", color: CHART_SERIES_COLORS.despesas },
    { key: "saldo_acumulado", label: "Saldo acumulado", color: CHART_SERIES_COLORS.saldo_acumulado },
] as const

function formatAxisValue(value: number) {
    const absoluteValue = Math.abs(value)

    if (absoluteValue >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace(".0", "")} mi`
    }

    if (absoluteValue >= 1_000) {
        return `${(value / 1_000).toFixed(0)}k`
    }

    return `${value}`
}

function ChartTooltipContent({
    active,
    label,
    payload,
}: {
    active?: boolean
    label?: string
    payload?: TooltipEntry[]
}) {
    if (!active || !payload?.length) return null

    const uniquePayload = payload.filter(
        (entry, index, entries) => entries.findIndex((candidate) => candidate.dataKey === entry.dataKey) === index,
    )

    return (
        <div className="rounded-xl border border-[#E8E1D6] bg-[#FFFCF7] p-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="mb-2 font-semibold text-[#2C201B]">{label}</p>
            <div className="space-y-1.5">
                {uniquePayload.map((entry) => (
                    <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[#5B5347]">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold text-[#2C201B]">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ChartLegend() {
    return (
        <div className="flex flex-wrap justify-start gap-x-4 gap-y-1 lg:justify-end">
            {CHART_SERIES_META.map((series) => (
                <div key={series.key} className="flex items-center gap-2 text-xs font-medium text-[#5B5347]">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                    <span>{series.label}</span>
                </div>
            ))}
        </div>
    )
}

export function DashboardChartCard({ data, filters, onSelectPoint }: DashboardChartCardProps) {
    const [chartWindow, setChartWindow] = useState<DashboardChartWindowPreset>(data.window_preset ?? "3m")
    const [chartData, setChartData] = useState(data)
    const [loading, setLoading] = useState(false)
    const filtersQuery = useMemo(() => buildDashboardSearchParams(filters).toString(), [filters])

    useEffect(() => {
        let ignore = false

        async function load() {
            setLoading(true)

            try {
                const response = await fetch(`/api/financeiro/reports/dashboard-evolution?${filtersQuery}&chart_window=${chartWindow}`, {
                    cache: "no-store",
                })
                if (!response.ok) {
                    throw new Error("Falha ao atualizar o gráfico.")
                }

                const payload = (await response.json()) as DashboardSummary["evolution"]
                if (!ignore) {
                    setChartData(payload)
                }
            } catch {
                if (!ignore) {
                    setChartData(data)
                }
            } finally {
                if (!ignore) {
                    setLoading(false)
                }
            }
        }

        void load()

        return () => {
            ignore = true
        }
    }, [chartWindow, data, filtersQuery])

    const currentPoint = chartData.points.find((point) => point.is_current)

    return (
        <Card className="border-[#E8E1D6] bg-[#FFFCF7] py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader className="border-b border-[#EFE8DC] px-5 py-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold text-[#2C201B]">{chartData.title}</CardTitle>
                            <p className="text-xs text-[#6F6556]">{chartData.range_label ?? chartData.subtitle}</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {DASHBOARD_CHART_WINDOW_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setChartWindow(option.key)}
                                    className={
                                        chartWindow === option.key
                                            ? "rounded-lg border border-[#D9D3C8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2C201B]"
                                            : "rounded-lg border border-transparent bg-[#F7F4ED] px-2.5 py-1.5 text-xs font-medium text-[#6F6556] transition-colors hover:border-[#DDD7CC] hover:text-[#2C201B]"
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-xl border border-[#E8E1D6] bg-white px-3.5 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Receitas</p>
                            <p className="mt-1 text-sm font-semibold" style={{ color: CHART_SERIES_COLORS.receitas }}>
                                {formatCurrency(chartData.summary.receitas)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#E8E1D6] bg-white px-3.5 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Despesas</p>
                            <p className="mt-1 text-sm font-semibold" style={{ color: CHART_SERIES_COLORS.despesas }}>
                                {formatCurrency(chartData.summary.despesas)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#E8E1D6] bg-white px-3.5 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Saldo acumulado</p>
                            <p className="mt-1 text-sm font-semibold" style={{ color: CHART_SERIES_COLORS.saldo_acumulado }}>
                                {formatCurrency(chartData.summary.saldo_acumulado)}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:pb-7">
                <div className="relative h-[248px] sm:h-[276px] lg:h-[320px]">
                    {loading ? (
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end">
                            <span className="rounded-full border border-[#E8E1D6] bg-white px-2 py-1 text-[11px] font-medium text-[#6F6556]">
                                Atualizando...
                            </span>
                        </div>
                    ) : null}

                    <div className="mb-2.5">
                        <ChartLegend />
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData.points}
                            margin={{ top: 8, right: 12, left: 0, bottom: 18 }}
                            onClick={(state) => {
                                const point = (state as unknown as ChartClickState).activePayload?.[0]?.payload
                                if (point) onSelectPoint(point)
                            }}
                        >
                            {currentPoint ? (
                                <ReferenceArea
                                    x1={currentPoint.label}
                                    x2={currentPoint.label}
                                    fill="rgba(245, 209, 147, 0.18)"
                                    strokeOpacity={0}
                                />
                            ) : null}

                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,32,27,0.08)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 12, fill: "#5B5347" }}
                                tickLine={false}
                                axisLine={{ stroke: "rgba(44,32,27,0.08)" }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: "#5B5347" }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatAxisValue}
                            />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="receitas"
                                name="Receitas"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={24}
                                fill={CHART_SERIES_COLORS.receitas}
                            />
                            <Bar
                                dataKey="despesas"
                                name="Despesas"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={24}
                                fill={CHART_SERIES_COLORS.despesas}
                            />
                            <Area
                                type="monotone"
                                dataKey="saldo_acumulado"
                                name="Saldo acumulado"
                                stroke="none"
                                fill="rgba(44, 32, 27, 0.08)"
                                activeDot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="saldo_acumulado"
                                name="Saldo acumulado"
                                stroke={CHART_SERIES_COLORS.saldo_acumulado}
                                strokeWidth={2.5}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4, fill: CHART_SERIES_COLORS.saldo_acumulado }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
