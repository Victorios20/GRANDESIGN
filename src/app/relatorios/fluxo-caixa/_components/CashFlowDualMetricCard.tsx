import { cn } from "@/lib/utils"
import { formatCashFlowDate } from "./cash-flow-view-model"

type Props = {
    bestDayValue: string
    bestDayDate: string | null
    worstDayValue: string
    worstDayDate: string | null
}

/**
 * Card dual com layout HORIZONTAL: Melhor | Pior lado a lado com divisor vertical.
 * Altura idêntica aos outros CashFlowMetricCard — sem esticar a linha.
 */
export function CashFlowDualMetricCard({
    bestDayValue,
    bestDayDate,
    worstDayValue,
    worstDayDate,
}: Props) {
    return (
        <div className="flex min-w-0 overflow-hidden rounded-2xl border border-[#e8e1d6] bg-[#f6f2e7] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {/* ── Melhor dia ── */}
            <div className="flex min-w-0 flex-1 flex-col gap-1 px-5 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">
                    Melhor dia
                </p>
                <p className="mt-1 truncate text-[1.35rem] font-bold leading-none tracking-tight text-[#2f7a52]">
                    {bestDayValue}
                </p>
                <p className={cn(
                    "mt-0.5 text-[11px] text-[#7b705f]",
                    !bestDayDate && "invisible"
                )}>
                    {formatCashFlowDate(bestDayDate)}
                </p>
            </div>

            {/* Divisor vertical */}
            <div className="my-4 w-px shrink-0 bg-[#ddd7cc]" />

            {/* ── Pior dia ── */}
            <div className="flex min-w-0 flex-1 flex-col gap-1 px-5 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">
                    Pior dia
                </p>
                <p className="mt-1 truncate text-[1.35rem] font-bold leading-none tracking-tight text-[#9b4b1d]">
                    {worstDayValue}
                </p>
                <p className={cn(
                    "mt-0.5 text-[11px] text-[#7b705f]",
                    !worstDayDate && "invisible"
                )}>
                    {formatCashFlowDate(worstDayDate)}
                </p>
            </div>
        </div>
    )
}
