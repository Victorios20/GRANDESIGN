"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import type { DashboardSummary, UpcomingItem } from "@/types/financeiro"

interface AgendaCardProps {
    data: DashboardSummary["upcoming_payables"] | DashboardSummary["upcoming_receivables"]
    href: string
    onOpenItem: (item: UpcomingItem) => void
}

function getUrgencyStyles(item: UpcomingItem) {
    if (item.urgency === "overdue") {
        return {
            badge: "border-[#E9C8C3] bg-[#FFF4F2] text-[#8F3F37]",
            date: "border-[#E9C8C3] bg-[#FFF4F2]",
        }
    }

    if (item.urgency === "today" || item.urgency === "tomorrow") {
        return {
            badge: "border-[#ECD7B2] bg-[#FFF8E9] text-[#9B4B1D]",
            date: "border-[#ECD7B2] bg-[#FFF8E9]",
        }
    }

    return {
        badge: "border-[#DDD7CC] bg-[#F7F4ED] text-[#6F6556]",
        date: "border-[#E8E1D6] bg-[#F7F4ED]",
    }
}

function formatDateLabel(value: string) {
    return format(new Date(value), "dd MMM", { locale: ptBR }).replace(".", "").toUpperCase()
}

function getEmptyMessage(title: string) {
    return title.toLowerCase().includes("pagamento")
        ? "Nenhum compromisso previsto."
        : "Nenhuma entrada prevista."
}

function getRemainingLabel(count: number) {
    return `Mais ${count} ${count === 1 ? "conta" : "contas"}`
}

export function AgendaCard({ data, href, onOpenItem }: AgendaCardProps) {
    return (
        <Card className="flex h-full flex-col border-[#E8E1D6] bg-[#FFFCF7] py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <CardHeader className="border-b border-[#EFE8DC] px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold text-[#2C201B]">{data.title}</CardTitle>
                        <CardDescription className="text-xs text-[#6F6556]">{data.subtitle}</CardDescription>
                    </div>

                    <Link
                        href={href}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-[#7B705F] transition-colors hover:border-[#DDD7CC] hover:bg-[#F7F4ED] hover:text-[#2C201B]"
                    >
                        <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col px-4 py-3">
                {data.items.length === 0 ? (
                    <div className="flex h-[204px] flex-1 items-center justify-center rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 text-center text-sm text-[#6F6556] sm:h-[220px] xl:h-[236px]">
                        {getEmptyMessage(data.title)}
                    </div>
                ) : (
                    <div className="flex h-full flex-1 flex-col gap-2">
                        <ScrollArea className="h-[204px] flex-1 pr-2 sm:h-[220px] xl:h-[236px]">
                            <div className="space-y-1.5">
                                {data.items.map((item) => {
                                    const urgency = getUrgencyStyles(item)

                                    return (
                                        <button
                                            key={`${item.tipo}-${item.id}`}
                                            type="button"
                                            onClick={() => onOpenItem(item)}
                                            className="flex w-full items-start gap-2.5 rounded-xl border border-[#E8E1D6] bg-white px-2.5 py-2 text-left transition-colors hover:bg-[#FAF8F4]"
                                        >
                                            <div
                                                className={cn(
                                                    "flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border px-1.5 py-1.5 text-center",
                                                    urgency.date,
                                                )}
                                            >
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6F6556]">
                                                    {formatDateLabel(item.data_vencimento)}
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-1.5 min-[440px]:flex-row min-[440px]:items-start min-[440px]:justify-between min-[440px]:gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold text-[#2C201B]">{item.descricao}</p>
                                                        <p className="mt-0.5 truncate text-[11px] text-[#6F6556]">
                                                            {[item.categoria, item.entidade].filter(Boolean).join(" • ")}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 flex-col items-end">
                                                        <span
                                                            className={cn(
                                                                "inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]",
                                                                urgency.badge,
                                                            )}
                                                        >
                                                            {item.badge_label}
                                                        </span>
                                                        <p className="mt-1 text-[13px] font-semibold text-[#2C201B]">
                                                            {formatCurrency(item.valor_pendente)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </ScrollArea>

                        {data.remaining_count > 0 ? (
                            <Link
                                href={href}
                                className="inline-flex w-fit items-center rounded-lg px-1 text-xs font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                            >
                                {getRemainingLabel(data.remaining_count)}
                            </Link>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
