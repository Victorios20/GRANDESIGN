"use client"

import { useState } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import type { DashboardSummary, UpcomingItem } from "@/types/financeiro"
import { AccountBalancesCard } from "./AccountBalancesCard"
import { AgendaCard } from "./AgendaCard"
import { DashboardChartCard } from "./DashboardChartCard"
import { DashboardDrilldownSheet, type DashboardDrilldownTarget } from "./DashboardDrilldownSheet"
import { DashboardFilterBar } from "./DashboardFilterBar"
import { ExecutiveKpiCard } from "./ExecutiveKpiCard"
import { TopExpensesCard } from "./TopExpensesCard"

interface Props {
    data: DashboardSummary
}

export default function DashboardFinanceiroClient({ data }: Props) {
    const [drilldownTarget, setDrilldownTarget] = useState<DashboardDrilldownTarget | null>(null)

    const kpiCards = [
        data.kpis.saldo_disponivel,
        data.kpis.resultado_periodo,
        data.kpis.saidas_previstas,
        data.kpis.saldo_projetado,
    ]

    function openEntryDetail(item: UpcomingItem) {
        setDrilldownTarget({
            type: "entry",
            kind: item.tipo,
            entryId: item.id,
            label: item.descricao,
        })
    }

    function openCashDetail() {
        setDrilldownTarget({
            type: "cash",
            label: data.cash_composition.title,
        })
    }

    return (
        <PageLayout title="Dashboard Financeiro">
            <div className="space-y-3 md:space-y-3.5">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold tracking-tight text-[#393316] md:text-[2rem]">
                            {data.header_context.title}
                        </h1>
                        <p className="text-sm text-[#6F6556]">Caixa, resultado e agenda financeira.</p>
                    </div>

                    <div className="w-full lg:w-auto lg:pt-0.5">
                        <DashboardFilterBar filters={data.filters_applied} />
                    </div>
                </section>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {kpiCards.map((metric) => (
                        <ExecutiveKpiCard key={metric.label} metric={metric} />
                    ))}
                </section>

                <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.92fr)] xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.92fr)]">
                    <DashboardChartCard
                        data={data.evolution}
                        filters={data.filters_applied}
                        onSelectPoint={(point) =>
                            setDrilldownTarget({
                                type: "period",
                                start: point.start,
                                end: point.end,
                                label: point.label,
                            })
                        }
                    />
                    <TopExpensesCard data={data.top_expenses} filters={data.filters_applied} />
                </section>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch">
                    <div className="md:col-span-2 xl:col-span-1">
                        <AccountBalancesCard data={data.cash_composition} onOpenDetails={openCashDetail} />
                    </div>
                    <AgendaCard
                        data={data.upcoming_payables}
                        href="/contas-pagar?scope=next7"
                        onOpenItem={openEntryDetail}
                    />
                    <AgendaCard
                        data={data.upcoming_receivables}
                        href="/contas-receber?scope=next7"
                        onOpenItem={openEntryDetail}
                    />
                </section>
            </div>

            <DashboardDrilldownSheet
                filters={data.filters_applied}
                target={drilldownTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setDrilldownTarget(null)
                    }
                }}
            />
        </PageLayout>
    )
}
