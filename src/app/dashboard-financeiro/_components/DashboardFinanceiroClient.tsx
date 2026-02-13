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
        <div className="rounded-lg border bg-white p-3 shadow-md text-sm" style={{ borderColor: "rgba(44,32,27,0.15)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--brand-primary)" }}>{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}: {formatCurrency(entry.value)}</span>
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
        <Card className="border border-[var(--brand-primary)]/10" style={{ backgroundColor: "var(--brand-bg)" }}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold" style={{ color: "var(--brand-primary)" }}>
                    <Icon className="size-5" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }} />
                    {title}
                    {items.length > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                            backgroundColor: isOverdue ? "#fef2f2" : "#fffbeb",
                            color: isOverdue ? "#dc2626" : "#d97706",
                        }}>
                            {items.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {items.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>{emptyMessage}</p>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={`${item.tipo}-${item.id}`}
                                className="flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-black/[0.02]"
                                style={{ border: "1px solid rgba(44,32,27,0.06)" }}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex-shrink-0">
                                        {item.tipo === "pagar" ? (
                                            <ArrowDownCircle className="size-4" style={{ color: "#dc2626" }} />
                                        ) : (
                                            <ArrowUpCircle className="size-4" style={{ color: "#16a34a" }} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--brand-primary)" }}>
                                            {item.descricao}
                                        </p>
                                        <p className="text-xs" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
                                            {item.entidade ?? item.categoria} · {formatDateBR(item.data_vencimento)}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold whitespace-nowrap ml-3" style={{
                                    color: item.tipo === "pagar" ? "#dc2626" : "#16a34a",
                                }}>
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
            color: "#2563eb",
            bgColor: "#eff6ff",
        },
        {
            label: "A Receber (30d)",
            value: formatCurrency(data.a_receber_30d),
            icon: TrendingUp,
            color: "#16a34a",
            bgColor: "#f0fdf4",
        },
        {
            label: "A Pagar (30d)",
            value: formatCurrency(data.a_pagar_30d),
            icon: TrendingDown,
            color: "#dc2626",
            bgColor: "#fef2f2",
        },
        {
            label: "Projeção 30d",
            value: formatCurrency(data.projecao_30d),
            icon: Target,
            color: data.projecao_30d >= 0 ? "#16a34a" : "#dc2626",
            bgColor: data.projecao_30d >= 0 ? "#f0fdf4" : "#fef2f2",
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
                        <Card key={card.label} className="border border-[var(--brand-primary)]/10 overflow-hidden" style={{ backgroundColor: "var(--brand-bg)" }}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--brand-primary)", opacity: 0.6 }}>
                                            {card.label}
                                        </p>
                                        <p className="text-2xl font-bold" style={{ color: card.color }}>
                                            {card.value}
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: card.bgColor }}>
                                        <card.icon className="size-5" style={{ color: card.color }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Chart + Top Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 12-month bar chart */}
                    <Card className="lg:col-span-2 border border-[var(--brand-primary)]/10" style={{ backgroundColor: "var(--brand-bg)" }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold" style={{ color: "var(--brand-primary)" }}>
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
                                            tick={{ fontSize: 12, fill: "var(--brand-primary)" }}
                                            tickLine={false}
                                            axisLine={{ stroke: "rgba(44,32,27,0.1)" }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "var(--brand-primary)" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip content={<CustomTooltipContent />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12, color: "var(--brand-primary)" }}
                                        />
                                        <Bar dataKey="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                        <Bar dataKey="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top 5 Categories */}
                    <Card className="border border-[var(--brand-primary)]/10" style={{ backgroundColor: "var(--brand-bg)" }}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold" style={{ color: "var(--brand-primary)" }}>
                                Top Categorias do Mês
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {data.top_categorias_mes.length === 0 ? (
                                <p className="text-sm py-6 text-center" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
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
                                                            style={{ backgroundColor: cat.cor || "var(--brand-primary)" }}
                                                        />
                                                        <span className="text-sm font-medium truncate max-w-[140px]" style={{ color: "var(--brand-primary)" }}>
                                                            {cat.nome}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold" style={{
                                                        color: cat.tipo === "Receita" ? "#16a34a" : "#dc2626",
                                                    }}>
                                                        {formatCurrency(cat.total)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(44,32,27,0.06)" }}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: cat.cor || (cat.tipo === "Receita" ? "#16a34a" : "#dc2626"),
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
