"use client"

import { useState, useCallback } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Landmark,
    TrendingUp,
    TrendingDown,
    Target,
    RefreshCw,
    ArrowDownCircle,
    ArrowUpCircle,
    AlertTriangle,
    CalendarClock,
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { toast } from "sonner"
import { formatCurrency, formatDateBR } from "@/lib/financeiro-utils"
import type { DashboardSummary, UpcomingItem } from "@/types/financeiro"

interface Props {
    data: DashboardSummary
}

const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
}

function formatMonthLabel(ym: string) {
    const parts = ym.split("-")
    return `${MONTH_LABELS[parts[1]] ?? parts[1]}/${parts[0].slice(2)}`
}

function CustomTooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-md text-sm">
            <p className="font-semibold mb-1 text-foreground">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-foreground">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
    )
}

function UpcomingTable({ items, title, icon: Icon, emptyMessage, isOverdue }: {
    items: UpcomingItem[]
    title: string
    icon: any
    emptyMessage: string
    isOverdue?: boolean
}) {
    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Icon className="size-5 text-muted-foreground" />
                    {title}
                    {items.length > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-foreground">
                            {items.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {items.length === 0 ? (
                    <p className="text-sm py-4 text-center text-muted-foreground">{emptyMessage}</p>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={`${item.tipo}-${item.id}`}
                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex-shrink-0">
                                        {item.tipo === "pagar" ? (
                                            <ArrowDownCircle className="size-4 text-foreground" />
                                        ) : (
                                            <ArrowUpCircle className="size-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate text-foreground">
                                            {item.descricao}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.entidade ?? item.categoria} · {formatDateBR(item.data_vencimento)}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold whitespace-nowrap ml-3 text-foreground">
                                    {formatCurrency(item.valor_pendente)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function DashboardFinanceiroClient({ data: initialData }: Props) {
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/financeiro/reports/dashboard-summary")
            if (res.ok) {
                const result = await res.json()
                setData(result)
                toast.success("Dashboard atualizado")
            }
        } catch {
            toast.error("Erro ao atualizar dashboard")
        } finally {
            setLoading(false)
        }
    }, [])

    const chartData = data.entradas_saidas_12m.map((m) => ({
        name: formatMonthLabel(m.month),
        Receitas: m.receitas,
        Despesas: m.despesas,
    }))

    const kpiCards = [
        {
            label: "Saldo Total",
            value: formatCurrency(data.saldo_total),
            icon: Landmark,
        },
        {
            label: "A Receber (30d)",
            value: formatCurrency(data.a_receber_30d),
            icon: TrendingUp,
        },
        {
            label: "A Pagar (30d)",
            value: formatCurrency(data.a_pagar_30d),
            icon: TrendingDown,
        },
        {
            label: "Projeção 30d",
            value: formatCurrency(data.projecao_30d),
            icon: Target,
        },
    ]

    return (
        <PageLayout title="Dashboard Financeiro">
            <div className="space-y-6">
                {/* Refresh button */}
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiCards.map((card) => (
                        <Card key={card.label} className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <card.icon className="w-5 h-5 text-primary-foreground" style={{ color: "#2c201b" }} />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-foreground">
                                    {card.value}
                                </p>
                                <p className="text-sm font-medium text-muted-foreground mt-1">
                                    {card.label}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Operational Result Widget */}
                {data.operational_result && (
                    <Card className="bg-card border-border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Target className="size-4 text-primary" />
                                Resultado Operacional (Mês Atual)
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" asChild>
                                <a href="/relatorios/resultado-operacional">Ver Detalhes</a>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Resultado</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-foreground">
                                            {formatCurrency(data.operational_result.resultado_operacional)}
                                        </span>
                                        {data.operational_result.previous?.variacao_resultado != null && (
                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${data.operational_result.previous.variacao_resultado >= 0
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                }`}>
                                                {data.operational_result.previous.variacao_resultado > 0 ? "+" : ""}
                                                {data.operational_result.previous.variacao_resultado.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        vs mês anterior
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Margem</p>
                                    <span className="text-2xl font-bold text-foreground">
                                        {data.operational_result.margem_operacional?.toFixed(1) ?? "-"}%
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Receitas</p>
                                    <span className="text-lg font-semibold text-foreground">
                                        {formatCurrency(data.operational_result.receitas_totais)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Despesas</p>
                                    <span className="text-lg font-semibold text-foreground">
                                        {formatCurrency(data.operational_result.custos_despesas_totais)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Chart + Top Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 12-month bar chart */}
                    <Card className="lg:col-span-2 bg-card border-border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Receitas vs Despesas — Últimos 12 Meses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,32,27,0.08)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12, fill: "#2c201b" }}
                                            tickLine={false}
                                            axisLine={{ stroke: "rgba(44,32,27,0.1)" }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#2c201b" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip content={<CustomTooltipContent />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                        <Bar dataKey="Receitas" fill="#2c201b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                        <Bar dataKey="Despesas" fill="#f5d193" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top 5 Categories */}
                    <Card className="bg-card border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Top Categorias do Mês
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.top_categorias_mes.length === 0 ? (
                                <p className="text-sm py-6 text-center text-muted-foreground">
                                    Sem lançamentos este mês
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {data.top_categorias_mes.map((cat, i) => {
                                        const maxVal = data.top_categorias_mes[0]?.total || 1
                                        const pct = (cat.total / maxVal) * 100
                                        return (
                                            <div key={cat.nome + i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="size-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: cat.cor || "#f5d193" }}
                                                        />
                                                        <span className="text-sm font-medium truncate max-w-[140px] text-foreground">
                                                            {cat.nome}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {formatCurrency(cat.total)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden bg-muted/30">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: cat.cor || "#f5d193",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming & Overdue */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UpcomingTable
                        items={data.proximos_vencimentos}
                        title="Próximos Vencimentos (7 dias)"
                        icon={CalendarClock}
                        emptyMessage="Nenhum vencimento nos próximos 7 dias"
                    />
                    <UpcomingTable
                        items={data.vencidas}
                        title="Contas Vencidas"
                        icon={AlertTriangle}
                        emptyMessage="Nenhuma conta vencida 🎉"
                        isOverdue
                    />
                </div>
            </div>
        </PageLayout>
    )
}
