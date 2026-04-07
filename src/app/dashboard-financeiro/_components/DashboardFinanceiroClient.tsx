"use client"

import Link from "next/link"
import { ArrowDownCircle, ArrowRight, ArrowUpCircle, Landmark, Target, TrendingDown, TrendingUp } from "lucide-react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateBR } from "@/lib/financeiro-utils"
import type { DashboardSummary, UpcomingItem } from "@/types/financeiro"

interface Props {
    data: DashboardSummary
}

interface DashboardTooltipEntry {
    dataKey?: string | number
    color?: string
    name?: string
    value?: number
}

interface DashboardTooltipProps {
    active?: boolean
    payload?: DashboardTooltipEntry[]
    label?: string
}

const MONTH_LABELS: Record<string, string> = {
    "01": "Jan",
    "02": "Fev",
    "03": "Mar",
    "04": "Abr",
    "05": "Mai",
    "06": "Jun",
    "07": "Jul",
    "08": "Ago",
    "09": "Set",
    "10": "Out",
    "11": "Nov",
    "12": "Dez",
}

function formatMonthLabel(ym: string) {
    const parts = ym.split("-")
    return `${MONTH_LABELS[parts[1]] ?? parts[1]}/${parts[0].slice(2)}`
}

function CustomTooltipContent({ active, payload, label }: DashboardTooltipProps) {
    if (!active || !payload?.length) return null

    return (
        <div className="rounded-xl border border-[#2C201B]/10 bg-[#FFFCF7] p-3 text-sm shadow-sm">
            <p className="mb-1 font-semibold text-[#2C201B]">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-[#2C201B]/75">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
    )
}

function getItemHref(item: UpcomingItem, mode: "overdue" | "next7") {
    const base = item.tipo === "pagar" ? "/contas-pagar" : "/contas-receber"
    const params = new URLSearchParams()
    params.set("scope", mode)
    params.set("search", item.descricao)
    return `${base}?${params.toString()}`
}

function AgendaCard({
    title,
    href,
    items,
    kind,
}: {
    title: string
    href: string
    items: UpcomingItem[]
    kind: "pagar" | "receber"
}) {
    return (
        <Card className="border-[#2C201B]/10 bg-[#FFFCF7]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold text-[#2C201B]">{title}</CardTitle>
                <Button type="button" variant="ghost" size="sm" asChild className="h-8 px-2 text-[#2C201B]/65 hover:text-[#2C201B]">
                    <Link href={href}>
                        Ver lista
                        <ArrowRight className="ml-1 size-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#2C201B]/10 bg-white/60 px-4 py-5 text-center text-sm text-[#2C201B]/55">
                        Nenhum item para os próximos 7 dias.
                    </div>
                ) : (
                    items.slice(0, 5).map((item) => (
                        <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between gap-4 rounded-xl bg-white/68 px-4 py-3 ring-1 ring-[#2C201B]/8">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5">
                                    {kind === "pagar" ? (
                                        <ArrowDownCircle className="size-4 text-[#2C201B]/65" />
                                    ) : (
                                        <ArrowUpCircle className="size-4 text-[#393316]/80" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#2C201B]">{item.descricao}</p>
                                    <p className="mt-0.5 text-xs text-[#2C201B]/55">
                                        {item.entidade ?? item.categoria} • {formatDateBR(item.data_vencimento)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="whitespace-nowrap text-sm font-semibold text-[#2C201B]">
                                    {formatCurrency(item.valor_pendente)}
                                </p>
                                <Button type="button" variant="ghost" size="sm" asChild className="h-8 px-2 text-[#2C201B]/60 hover:text-[#2C201B]">
                                    <Link href={getItemHref(item, "next7")}>Abrir</Link>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

export default function DashboardFinanceiroClient({ data }: Props) {
    const chartData = data.entradas_saidas_12m.map((month) => ({
        name: formatMonthLabel(month.month),
        Receitas: month.receitas,
        Despesas: month.despesas,
    }))

    const kpiCards = [
        { label: "Saldo total", value: formatCurrency(data.saldo_total), icon: Landmark },
        { label: "A receber 30d", value: formatCurrency(data.a_receber_30d), icon: TrendingUp },
        { label: "A pagar 30d", value: formatCurrency(data.a_pagar_30d), icon: TrendingDown },
        { label: "Projeção 30d", value: formatCurrency(data.projecao_30d), icon: Target },
    ]

    return (
        <PageLayout title="Dashboard Financeiro">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {kpiCards.map((card) => (
                        <Card key={card.label} className="border-[#2C201B]/10 bg-[#FFFCF7]">
                            <CardContent className="space-y-2 p-5">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs uppercase tracking-[0.18em] text-[#2C201B]/45">{card.label}</p>
                                    <card.icon className="size-4 text-[#2C201B]/55" />
                                </div>
                                <p className="text-2xl font-semibold text-[#2C201B]">{card.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {data.operational_result ? (
                    <Card className="border-[#2C201B]/10 bg-[#FFFCF7]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-semibold text-[#2C201B]">Resultado Operacional</CardTitle>
                            <Button type="button" variant="ghost" size="sm" asChild>
                                <Link href="/relatorios/resultado-operacional">Ver detalhes</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-4">
                            <div>
                                <p className="text-sm text-[#2C201B]/55">Resultado</p>
                                <p className="mt-1 text-2xl font-semibold text-[#2C201B]">{formatCurrency(data.operational_result.resultado_operacional)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#2C201B]/55">Margem</p>
                                <p className="mt-1 text-2xl font-semibold text-[#2C201B]">{data.operational_result.margem_operacional?.toFixed(1) ?? "-"}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#2C201B]/55">Receitas</p>
                                <p className="mt-1 text-lg font-semibold text-[#2C201B]">{formatCurrency(data.operational_result.receitas_totais)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#2C201B]/55">Despesas</p>
                                <p className="mt-1 text-lg font-semibold text-[#2C201B]">{formatCurrency(data.operational_result.custos_despesas_totais)}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
                    <Card className="border-[#2C201B]/10 bg-[#FFFCF7]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-[#2C201B]">Receitas vs despesas - últimos 12 meses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,32,27,0.08)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#2C201B" }} tickLine={false} axisLine={{ stroke: "rgba(44,32,27,0.08)" }} />
                                        <YAxis tick={{ fontSize: 12, fill: "#2C201B" }} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                                        <Tooltip content={<CustomTooltipContent />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="Receitas" fill="#393316" radius={[6, 6, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="Despesas" fill="#F5D193" radius={[6, 6, 0, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#2C201B]/10 bg-[#FFFCF7]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-[#2C201B]">Categorias do mês</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {data.top_categorias_mes.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#2C201B]/10 bg-white/60 px-4 py-6 text-center text-sm text-[#2C201B]/55">
                                    Sem lançamentos neste mês.
                                </div>
                            ) : (
                                data.top_categorias_mes.map((category, index) => {
                                    const maxValue = data.top_categorias_mes[0]?.total || 1
                                    const percentage = (category.total / maxValue) * 100
                                    return (
                                        <div key={`${category.nome}-${index}`}>
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: category.cor || "#F5D193" }} />
                                                    <span className="truncate text-sm font-medium text-[#2C201B]">{category.nome}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-[#2C201B]">{formatCurrency(category.total)}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-[#2C201B]/8">
                                                <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.cor || "#F5D193" }} />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <AgendaCard
                        title="Próximos vencimentos (7d)"
                        href="/contas-pagar?scope=next7"
                        items={data.upcoming_payables_7d}
                        kind="pagar"
                    />
                    <AgendaCard
                        title="Próximos recebimentos (7d)"
                        href="/contas-receber?scope=next7"
                        items={data.upcoming_receivables_7d}
                        kind="receber"
                    />
                </div>
            </div>
        </PageLayout>
    )
}
