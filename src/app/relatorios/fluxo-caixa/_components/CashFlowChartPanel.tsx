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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <div className="min-w-[250px] rounded-2xl border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#2c201b]">
                        {formatCashFlowDate(point.date)}
                    </p>
                    <p className="text-xs text-[rgba(44,32,27,0.62)]">{point.weekdayLabel}</p>
                </div>
                <CashFlowStatusBadge status={point.status} />
            </div>

            <div className="mt-4 grid gap-2 text-sm text-[rgba(44,32,27,0.72)]">
                <div className="flex items-center justify-between gap-4">
                    <span>Entradas</span>
                    <strong className="text-[#2c201b]">{formatCurrency(point.entradas_previstas)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span>Saidas</span>
                    <strong className="text-[#2c201b]">{formatCurrency(point.saidas_previstas)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span>Saldo do dia</span>
                    <strong className="text-[#2c201b]">{formatCurrency(point.saldo_dia)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[rgba(44,32,27,0.10)] pt-2">
                    <span>Saldo acumulado</span>
                    <strong className="text-[#2c201b]">{formatCurrency(point.saldo_final)}</strong>
                </div>
            </div>
        </div>
    )
}

function LegendItem({ label, colorClass }: { label: string; colorClass: string }) {
    return (
        <span className="inline-flex items-center gap-2 text-xs text-[rgba(44,32,27,0.62)]">
            <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
            {label}
        </span>
    )
}

export function CashFlowChartPanel({ data }: Props) {
    const chartData = buildCashFlowChartData(data)
    const criticalPoints = chartData.filter((point) => point.isCriticalDay)

    return (
        <Card className="overflow-hidden rounded-2xl border border-[rgba(44,32,27,0.08)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardHeader className="gap-4 border-b border-[rgba(44,32,27,0.08)] pb-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-[#2c201b]">
                            Projecao diaria
                        </CardTitle>
                        <p className="text-sm leading-6 text-[rgba(44,32,27,0.68)]">
                            Entradas e saidas diarias com leitura do saldo acumulado ao longo da janela.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <LegendItem label="Entradas" colorClass="bg-[#f5d193]" />
                        <LegendItem label="Saidas" colorClass="bg-[rgba(44,32,27,0.26)]" />
                        <LegendItem label="Saldo acumulado" colorClass="bg-[#393316]" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 md:p-6">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="shortDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.58)", fontSize: 12 }}
                                minTickGap={18}
                            />
                            <YAxis
                                yAxisId="balance"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.58)", fontSize: 12 }}
                                tickFormatter={formatAxisCurrency}
                                width={74}
                            />
                            <YAxis
                                yAxisId="flow"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(44,32,27,0.46)", fontSize: 12 }}
                                tickFormatter={formatAxisCurrency}
                                width={74}
                            />
                            <Tooltip cursor={{ fill: "rgba(245,209,147,0.14)" }} content={<CustomTooltip />} />
                            <ReferenceLine
                                yAxisId="balance"
                                y={0}
                                stroke="rgba(44,32,27,0.22)"
                                strokeDasharray="4 4"
                            />
                            <Bar
                                yAxisId="flow"
                                dataKey="entradas_previstas"
                                fill="#f5d193"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={18}
                            />
                            <Bar
                                yAxisId="flow"
                                dataKey="saidas_previstas"
                                fill="rgba(44,32,27,0.26)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={18}
                            />
                            <Line
                                yAxisId="balance"
                                type="monotone"
                                dataKey="saldo_final"
                                stroke="#393316"
                                strokeOpacity={0.82}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={false}
                                activeDot={{ r: 4, fill: "#393316", stroke: "#FAF3E0", strokeWidth: 2 }}
                            />

                            {criticalPoints.map((point) => (
                                <ReferenceDot
                                    key={`critical-${point.date}`}
                                    yAxisId="balance"
                                    x={point.shortDate}
                                    y={point.saldo_final}
                                    r={3.5}
                                    fill="#2c201b"
                                    stroke="#FAF3E0"
                                    strokeWidth={1.5}
                                />
                            ))}

                            {data.analytics.worst_day.date ? (
                                <ReferenceDot
                                    yAxisId="balance"
                                    x={formatCashFlowDate(data.analytics.worst_day.date, "dd/MM")}
                                    y={data.analytics.worst_day.value}
                                    r={5}
                                    fill="#2c201b"
                                    stroke="#f5d193"
                                    strokeWidth={2}
                                />
                            ) : null}

                            {data.analytics.best_day.date ? (
                                <ReferenceDot
                                    yAxisId="balance"
                                    x={formatCashFlowDate(data.analytics.best_day.date, "dd/MM")}
                                    y={data.analytics.best_day.value}
                                    r={5}
                                    fill="#f5d193"
                                    stroke="#393316"
                                    strokeWidth={2}
                                />
                            ) : null}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-[rgba(44,32,27,0.68)]">
                    <span className="rounded-full border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] px-3 py-1.5">
                        Pior dia: {formatCashFlowDate(data.analytics.worst_day.date, "dd/MM")} · {formatCurrency(data.analytics.worst_day.value)}
                    </span>
                    <span className="rounded-full border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] px-3 py-1.5">
                        Melhor dia: {formatCashFlowDate(data.analytics.best_day.date, "dd/MM")} · {formatCurrency(data.analytics.best_day.value)}
                    </span>
                    <span className="rounded-full border border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] px-3 py-1.5">
                        Dias criticos: {data.analytics.critical_days_count}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
