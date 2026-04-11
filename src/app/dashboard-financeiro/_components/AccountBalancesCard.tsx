"use client"

import { ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import type { DashboardSummary } from "@/types/financeiro"

interface AccountBalancesCardProps {
    data: DashboardSummary["cash_composition"]
    onOpenDetails: () => void
}

export function AccountBalancesCard({ data, onOpenDetails }: AccountBalancesCardProps) {
    const visibleItems = data.items.slice(0, 4)

    return (
        <button
            type="button"
            onClick={onOpenDetails}
            className="flex h-full w-full flex-col rounded-2xl border border-[#E8E1D6] bg-[#FFFCF7] text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-[#FFF9F0]"
        >
            <div className="border-b border-[#EFE8DC] px-4 py-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-base font-semibold text-[#2C201B]">{data.title}</p>
                        <p className="text-xs text-[#6F6556]">{data.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Total</p>
                            <p className={cn("mt-1 text-base font-semibold text-[#2C201B]", data.total < 0 && "text-[#8F3F37]")}>
                                {formatCurrency(data.total)}
                            </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-[#9A8F7C]" />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col px-4 py-3">
                {visibleItems.length === 0 ? (
                    <div className="flex h-[204px] flex-1 items-center rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-3 py-4 text-sm text-[#6F6556] sm:h-[220px] xl:h-[236px]">
                        Nenhuma conta ativa disponível.
                    </div>
                ) : (
                    <div className="flex h-[204px] flex-1 flex-col gap-1.5 sm:h-[220px] xl:h-[236px]">
                        {visibleItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E1D6] bg-white px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#2C201B]">{item.nome}</p>
                                    <p className="mt-0.5 truncate text-xs text-[#6F6556]">
                                        {item.tipo}
                                        {item.banco ? ` • ${item.banco}` : ""}
                                    </p>
                                </div>

                                <p className={cn("text-sm font-semibold text-[#2C201B]", item.saldo_atual < 0 && "text-[#8F3F37]")}>
                                    {formatCurrency(item.saldo_atual)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </button>
    )
}
