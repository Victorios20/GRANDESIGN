"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { ConferenceSessionHistoryItem } from "@/types/financeiro"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    bankId: string
    bankName: string
}

function getStatusLabel(status: ConferenceSessionHistoryItem["status"]) {
    if (status === "LOCKED") return "Conciliação encerrada"
    if (status === "REOPENED") return "Conciliação reaberta"
    return "Conciliação em andamento"
}

export default function ConferenceHistorySheet({
    open,
    onOpenChange,
    bankId,
    bankName,
}: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [items, setItems] = useState<ConferenceSessionHistoryItem[]>([])

    useEffect(() => {
        let ignore = false

        async function load() {
            if (!open || !bankId || bankId === "all") {
                setItems([])
                setError(null)
                return
            }

            setLoading(true)
            setError(null)

            try {
                const response = await fetch(`/api/financeiro/transactions/sessions/history?conta_bancaria_id=${bankId}`, {
                    cache: "no-store",
                })

                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null
                    throw new Error(payload?.error ?? "Falha ao carregar histórico")
                }

                const payload = (await response.json()) as ConferenceSessionHistoryItem[]
                if (!ignore) setItems(payload)
            } catch (requestError) {
                if (!ignore) {
                    setItems([])
                    setError((requestError as Error).message)
                }
            } finally {
                if (!ignore) setLoading(false)
            }
        }

        void load()

        return () => {
            ignore = true
        }
    }, [bankId, open])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col border-l border-[#E8E1D6] bg-[#FAF3E0] p-0 text-[#2C201B] sm:max-w-lg">
                <SheetHeader className="border-b border-[#E8E1D6] px-6 py-5">
                    <SheetTitle className="text-xl font-bold tracking-tight text-[#393316]">
                        Histórico
                    </SheetTitle>
                    <SheetDescription className="text-[#6F6556]">
                        {bankName}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden px-6 py-5">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-24 animate-pulse rounded-xl border border-[#E8E1D6] bg-white" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 py-5 text-sm text-[#6F6556]">
                            {error}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#DDD7CC] bg-[#F7F4ED] px-4 py-5 text-sm text-[#6F6556]">
                            Nenhum histórico de conciliação para esta conta.
                        </div>
                    ) : (
                        <ScrollArea className="h-[78vh] pr-3">
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-[#E8E1D6] bg-white px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-[#2C201B]">
                                                    {getStatusLabel(item.status)}
                                                </p>
                                                <p className="text-xs text-[#6F6556]">
                                                    Iniciada em {format(new Date(item.criada_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                </p>
                                                {item.concluida_em ? (
                                                    <p className="text-xs text-[#7B705F]">
                                                        Encerrada em {format(new Date(item.concluida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <p className="text-sm font-semibold text-[#2C201B]">
                                                {formatCurrency(item.total_conferido)}
                                            </p>
                                        </div>

                                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                            <MiniMetric label="Conferidos" value={String(item.reviewed_count)} />
                                            <MiniMetric label="Pendências" value={String(item.pending_issue_count)} />
                                            <MiniMetric label="Não revisados" value={String(item.not_reviewed_count)} />
                                        </div>

                                        {item.nota ? (
                                            <p className="mt-3 rounded-lg border border-[#E8E1D6] bg-[#FAF8F3] px-3 py-2 text-sm text-[#6F6556]">
                                                {item.nota}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F6556]">{label}</p>
            <p className="text-sm font-semibold text-[#2C201B]">{value}</p>
        </div>
    )
}
