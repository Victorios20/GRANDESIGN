"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import type { DashboardKpiMetric } from "@/types/financeiro"

interface ExecutiveKpiCardProps {
    metric: DashboardKpiMetric
}

function normalizeLabel(label: string) {
    return label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
}

function getMetricTone(metric: DashboardKpiMetric) {
    const normalizedLabel = normalizeLabel(metric.label)

    if (normalizedLabel.includes("saidas previstas")) {
        return "text-[#2C201B]"
    }

    if (metric.value > 0) return "text-[#2F7A52]"
    if (metric.value < 0) return "text-[#8F3F37]"
    return "text-[#2C201B]"
}

function getComparisonLabel(metric: DashboardKpiMetric) {
    if (!metric.comparison) return null

    const direction = metric.comparison.value > 0 ? "acima" : metric.comparison.value < 0 ? "abaixo" : "igual"
    return `${formatCurrency(Math.abs(metric.comparison.value))} ${direction} ${metric.comparison.label}`
}

export function ExecutiveKpiCard({ metric }: ExecutiveKpiCardProps) {
    const comparisonLabel = getComparisonLabel(metric)
    const toneClassName = getMetricTone(metric)

    return (
        <Card className="border-[#E8E1D6] bg-[#FFFCF7] py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardContent className="px-4 py-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">
                            {metric.label}
                        </p>
                        <p className={cn("mt-2 text-[1.45rem] font-semibold tracking-tight sm:text-[1.65rem]", toneClassName)}>
                            {formatCurrency(metric.value)}
                        </p>
                    </div>

                    <span className="inline-flex shrink-0 self-start items-center rounded-full border border-[#E8E1D6] bg-[#F7F4ED] px-2 py-1 text-[11px] font-medium text-[#6F6556]">
                        {metric.anchor_label}
                    </span>
                </div>

                {comparisonLabel ? (
                    <p className={cn("mt-2 text-xs font-medium", toneClassName)}>
                        {comparisonLabel}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    )
}
