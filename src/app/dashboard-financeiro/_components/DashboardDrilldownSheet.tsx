"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import { buildDashboardSearchParams } from "@/lib/financeiro-dashboard"
import type {
    DashboardAppliedFilters,
    DashboardCashDetail,
    DashboardDetailListItem,
    DashboardEntryDetail,
    DashboardPeriodDetail,
} from "@/types/financeiro"

export type DashboardDrilldownTarget =
    | {
          type: "period"
          start: string
          end: string
          label: string
      }
    | {
          type: "entry"
          kind: "pagar" | "receber"
          entryId: number
          label: string
      }
    | {
          type: "cash"
          label: string
      }

interface DashboardDrilldownSheetProps {
    filters: DashboardAppliedFilters
    target: DashboardDrilldownTarget | null
    onOpenChange: (open: boolean) => void
}

function isPeriodDetail(detail: DashboardPeriodDetail | DashboardEntryDetail | DashboardCashDetail): detail is DashboardPeriodDetail {
    return "period_label" in detail
}

function isCashDetail(detail: DashboardPeriodDetail | DashboardEntryDetail | DashboardCashDetail): detail is DashboardCashDetail {
    return "accounts" in detail
}

function isEntryDetail(detail: DashboardPeriodDetail | DashboardEntryDetail | DashboardCashDetail): detail is DashboardEntryDetail {
    return "due_date" in detail
}

function DetailListItem({ item }: { item: DashboardDetailListItem }) {
    return (
        <div className="rounded-xl border border-[#E8E1D6] bg-white px-3.5 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#2C201B]">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-[#6F6556]">{item.subtitle || "Sem complemento"}</p>
                    <p className="mt-1.5 break-words text-[11px] leading-relaxed text-[#7B705F]">
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })} • {item.source}
                    </p>
                </div>

                <div className="shrink-0 text-right">
                    <p
                        className={cn(
                            "text-sm font-semibold",
                            item.tone === "positive" && "text-[#2F7A52]",
                            item.tone === "negative" && "text-[#8F3F37]",
                            item.tone === "neutral" && "text-[#2C201B]",
                        )}
                    >
                        {formatCurrency(item.amount)}
                    </p>
                    <Link
                        href={item.href}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                    >
                        Abrir
                        <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export function DashboardDrilldownSheet({ filters, target, onOpenChange }: DashboardDrilldownSheetProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [detail, setDetail] = useState<DashboardPeriodDetail | DashboardEntryDetail | DashboardCashDetail | null>(null)

    const queryBase = useMemo(() => buildDashboardSearchParams(filters).toString(), [filters])
    const periodDetail = detail && isPeriodDetail(detail) ? detail : null
    const cashDetail = detail && isCashDetail(detail) ? detail : null
    const entryDetail = detail && isEntryDetail(detail) ? detail : null

    useEffect(() => {
        let ignore = false

        async function load() {
            if (!target) {
                setDetail(null)
                setError(null)
                return
            }

            setLoading(true)
            setError(null)

            try {
                const endpoint =
                    target.type === "period"
                        ? `/api/financeiro/reports/dashboard-period-detail?${queryBase}&detail_start=${target.start}&detail_end=${target.end}`
                        : target.type === "cash"
                          ? `/api/financeiro/reports/dashboard-cash-detail?${queryBase}`
                          : `/api/financeiro/reports/dashboard-entry-detail?kind=${target.kind}&entry_id=${target.entryId}`

                const response = await fetch(endpoint, { cache: "no-store" })
                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null
                    throw new Error(payload?.error ?? "Falha ao carregar detalhe.")
                }

                const payload = (await response.json()) as DashboardPeriodDetail | DashboardEntryDetail | DashboardCashDetail
                if (!ignore) {
                    setDetail(payload)
                }
            } catch (fetchError) {
                if (!ignore) {
                    setError((fetchError as Error).message)
                    setDetail(null)
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
    }, [queryBase, target])

    return (
        <Sheet open={!!target} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col border-l border-[#E8E1D6] bg-[#FAF3E0] p-0 text-[#2C201B] sm:max-w-xl">
                <SheetHeader className="border-b border-[#E8E1D6] px-5 py-4 sm:px-6 sm:py-5">
                    <SheetTitle className="text-xl font-bold tracking-tight text-[#393316]">
                        {target?.label ?? "Detalhe"}
                    </SheetTitle>
                    <SheetDescription className="text-[#6F6556]">Inspeção sem sair do painel.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden px-5 py-4 sm:px-6 sm:py-5">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-20 animate-pulse rounded-xl border border-[#E8E1D6] bg-white" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 py-5 text-sm text-[#6F6556]">
                            {error}
                        </div>
                    ) : !detail ? null : periodDetail ? (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-[#E8E1D6] bg-white px-4 py-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Período</p>
                                <p className="mt-1 text-sm font-medium text-[#2C201B]">{periodDetail.period_label}</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Receitas</p>
                                    <p className="mt-1 text-base font-semibold text-[#2F7A52]">{formatCurrency(periodDetail.summary.receitas)}</p>
                                </div>
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Despesas</p>
                                    <p className="mt-1 text-base font-semibold text-[#8F3F37]">{formatCurrency(periodDetail.summary.despesas)}</p>
                                </div>
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Resultado</p>
                                    <p className="mt-1 text-base font-semibold text-[#2C201B]">{formatCurrency(periodDetail.summary.resultado)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[#2C201B]">Itens</p>
                                <ScrollArea className="h-[360px] pr-2 sm:pr-3">
                                    <div className="space-y-2 pb-4">
                                        {periodDetail.items.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 py-5 text-sm text-[#6F6556]">
                                                Nenhum item encontrado.
                                            </div>
                                        ) : (
                                            periodDetail.items.map((item) => <DetailListItem key={`${item.source}-${item.id}`} item={item} />)
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            <Link
                                href={periodDetail.cta_href}
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                            >
                                {periodDetail.cta_label}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    ) : cashDetail ? (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-[#E8E1D6] bg-white px-4 py-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Total</p>
                                <p className="mt-1 text-lg font-semibold text-[#2C201B]">{formatCurrency(cashDetail.total)}</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[#2C201B]">Contas</p>
                                <div className="space-y-2">
                                    {cashDetail.accounts.map((account) => (
                                        <div
                                            key={account.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E1D6] bg-white px-3 py-2.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[#2C201B]">{account.nome}</p>
                                                <p className="mt-0.5 truncate text-xs text-[#6F6556]">
                                                    {account.tipo}
                                                    {account.banco ? ` • ${account.banco}` : ""}
                                                </p>
                                            </div>
                                            <p className={cn("text-sm font-semibold text-[#2C201B]", account.saldo_atual < 0 && "text-[#8F3F37]")}>
                                                {formatCurrency(account.saldo_atual)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[#2C201B]">Movimentações recentes</p>
                                <ScrollArea className="h-[280px] pr-2 sm:pr-3">
                                    <div className="space-y-2 pb-4">
                                        {cashDetail.latest_movements.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 py-5 text-sm text-[#6F6556]">
                                                Nenhuma movimentação recente.
                                            </div>
                                        ) : (
                                            cashDetail.latest_movements.map((item) => (
                                                <DetailListItem key={`${item.source}-${item.id}`} item={item} />
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            <Link
                                href={cashDetail.cta_href}
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                            >
                                {cashDetail.cta_label}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    ) : entryDetail ? (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-[#E8E1D6] bg-white px-4 py-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Descrição</p>
                                <p className="mt-1 text-base font-semibold text-[#2C201B]">{entryDetail.description}</p>
                                <p className="mt-1 text-sm text-[#6F6556]">{entryDetail.subtitle}</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Valor</p>
                                    <p className="mt-1 text-base font-semibold text-[#2C201B]">{formatCurrency(entryDetail.amount)}</p>
                                </div>
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Vencimento</p>
                                    <p className="mt-1 text-base font-semibold text-[#2C201B]">
                                        {format(new Date(entryDetail.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                    <Badge className="mt-2 border-[#DDD7CC] bg-[#F7F4ED] text-[#6F6556]">{entryDetail.badge_label}</Badge>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Categoria</p>
                                    <p className="mt-1 text-sm font-medium text-[#2C201B]">{entryDetail.category}</p>
                                </div>
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Entidade</p>
                                    <p className="mt-1 text-sm font-medium text-[#2C201B]">{entryDetail.entity ?? "Não informada"}</p>
                                </div>
                            </div>

                            {entryDetail.notes ? (
                                <div className="rounded-xl border border-[#E8E1D6] bg-white px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">Observações</p>
                                    <p className="mt-1 text-sm text-[#2C201B]">{entryDetail.notes}</p>
                                </div>
                            ) : null}

                            <Link
                                href={entryDetail.cta_href}
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#6F6556] transition-colors hover:text-[#2C201B]"
                            >
                                {entryDetail.cta_label}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
