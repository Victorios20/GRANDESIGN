"use client"

import {
    Bar,
    ComposedChart,
    Line,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

import { formatCurrency } from "@/lib/financeiro-utils"
import type { CashFlowProjectionResponse } from "@/types/financeiro"

import { CashFlowStatusBadge } from "./CashFlowStatusBadge"
import {
    buildCashFlowChartData,
    formatAxisCurrency,
    formatCashFlowDate,
} from "./cash-flow-view-model"

type Props = {
    data: CashFlowProjectionResponse
}

type TooltipProps = {
    active?: boolean
    payload?: Array<{ payload: ReturnType<typeof buildCashFlowChartData>[number] }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) {
        return null
    }

    const point = payload[0].payload

    return (
        <div className="min-w-[260px] rounded-xl border border-[#e8e1d6] bg-white p-4 shadow-[0_4px_16px_rgba(44,32,27,0.10)]">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#f0ece4] pb-3">
                <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#2c201b]">
                        {formatCashFlowDate(point.date)}
                    </p>
                    <p className="text-xs capitalize text-[#9a8f7c]">{point.weekdayLabel}</p>
                </div>
                <CashFlowStatusBadge status={point.status} />
            </div>

            {/* Linhas de dados */}
            <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-[#7b705f]">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#2f7a52]" />
                        Entradas
                    </span>
                    <span className="tabular-nums font-semibold text-[#2c201b]">
                        {formatCurrency(point.entradas_previstas)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-[#7b705f]">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#a6542f]" />
                        Saídas
                    </span>
                    <span className="tabular-nums font-semibold text-[#2c201b]">
                        {formatCurrency(point.saidas_previstas)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="text-[#7b705f]">Saldo do dia</span>
                    <span className="tabular-nums font-semibold text-[#2c201b]">
                        {formatCurrency(point.saldo_dia)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-6 border-t border-[#f0ece4] pt-2">
                    <span className="font-medium text-[#5b5347]">Saldo acumulado</span>
                    <span className="tabular-nums font-bold text-[#393316]">
                        {formatCurrency(point.saldo_final)}
                    </span>
                </div>
            </div>
        </div>
    )
}

function LegendItem({ label, colorClass, isLine = false }: { label: string; colorClass: string; isLine?: boolean }) {
    return (
        <span className="inline-flex items-center gap-2 text-xs text-[#7b705f]">
            {isLine ? (
                <span className={`inline-block h-[3px] w-5 rounded-full ${colorClass}`} />
            ) : (
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${colorClass}`} />
            )}
            {label}
        </span>
    )
}

export function CashFlowChartPanel({ data }: Props) {
    const chartData = buildCashFlowChartData(data)
    const criticalPoints = chartData.filter((point) => point.isCriticalDay)

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {/* Header */}
            <div className="border-b border-[#e7e0d4] bg-[#faf8f3] px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-0.5">
                        <h2 className="text-base font-semibold text-[#393316]">
                            Projeção diária
                        </h2>
                        <p className="text-xs text-[#7b705f]">
                            Entradas e saídas com leitura do saldo acumulado ao longo da janela.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end">
                        <LegendItem label="Entradas" colorClass="bg-[#2f7a52]" />
                        <LegendItem label="Saídas" colorClass="bg-[#a6542f]" />
                        <LegendItem label="Saldo acumulado" colorClass="bg-[#393316]" isLine />
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-5">
                <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="shortDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.50)", fontSize: 11 }}
                                minTickGap={18}
                            />
                            <YAxis
                                yAxisId="balance"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.50)", fontSize: 11 }}
                                tickFormatter={formatAxisCurrency}
                                width={72}
                            />
                            <YAxis
                                yAxisId="flow"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.38)", fontSize: 11 }}
                                tickFormatter={formatAxisCurrency}
                                width={72}
                            />

                            {/* Cursor warm */}
                            <Tooltip
                                cursor={{ fill: "rgba(47,122,82,0.10)" }}
                                content={<CustomTooltip />}
                            />

                            {/* Linha zero */}
                            <ReferenceLine
                                yAxisId="balance"
                                y={0}
                                stroke="rgba(44,32,27,0.16)"
                                strokeDasharray="4 4"
                            />

                            {/* Barras de entradas — dourado sólido */}
                            <Bar
                                yAxisId="flow"
                                dataKey="entradas_previstas"
                                fill="#2f7a52"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={14}
                            />

                            {/* Barras de saídas — escuro com opacidade, contraste vs dourado */}
                            <Bar
                                yAxisId="flow"
                                dataKey="saidas_previstas"
                                fill="#a6542f"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={14}
                            />

                            {/* Linha de saldo acumulado — mais grossa e presente */}
                            <Line
                                yAxisId="balance"
                                type="monotone"
                                dataKey="saldo_final"
                                stroke="#393316"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={false}
                                activeDot={{
                                    r: 5,
                                    fill: "#393316",
                                    stroke: "#ffffff",
                                    strokeWidth: 2,
                                }}
                            />

                            {/* Pontos críticos */}
                            {criticalPoints.map((point) => (
                                <ReferenceDot
                                    key={`critical-${point.date}`}
                                    yAxisId="balance"
                                    x={point.shortDate}
                                    y={point.saldo_final}
                                    r={4}
                                    fill="#2c201b"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                />
                            ))}

                            {/* Marcador pior dia */}
                            {data.analytics.worst_day.date ? (
                                <ReferenceDot
                                    yAxisId="balance"
                                    x={formatCashFlowDate(data.analytics.worst_day.date, "dd/MM")}
                                    y={data.analytics.worst_day.value}
                                    r={6}
                                    fill="#9b4b1d"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                />
                            ) : null}

                            {/* Marcador melhor dia */}
                            {data.analytics.best_day.date ? (
                                <ReferenceDot
                                    yAxisId="balance"
                                    x={formatCashFlowDate(data.analytics.best_day.date, "dd/MM")}
                                    y={data.analytics.best_day.value}
                                    r={6}
                                    fill="#2f7a52"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                />
                            ) : null}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Rodapé — linha de resumo com separadores */}
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#f0ece4] pt-4 text-[11px] text-[#7b705f]">
                    <span className="flex items-center gap-1.5 tabular-nums">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#9b4b1d]" />
                        <span className="font-medium text-[#5b5347]">Pior dia:</span>
                        {formatCashFlowDate(data.analytics.worst_day.date, "dd/MM")}
                        {" · "}
                        <span>{formatCurrency(data.analytics.worst_day.value)}</span>
                    </span>
                    <span className="hidden sm:block text-[#ddd7cc]">·</span>
                    <span className="flex items-center gap-1.5 tabular-nums">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2f7a52]" />
                        <span className="font-medium text-[#5b5347]">Melhor dia:</span>
                        {formatCashFlowDate(data.analytics.best_day.date, "dd/MM")}
                        {" · "}
                        <span>{formatCurrency(data.analytics.best_day.value)}</span>
                    </span>
                    <span className="hidden sm:block text-[#ddd7cc]">·</span>
                    <span>
                        <span className="font-medium text-[#5b5347]">Dias críticos:</span>{" "}
                        {data.analytics.critical_days_count}
                    </span>
                </div>
            </div>
        </div>
    )
}
