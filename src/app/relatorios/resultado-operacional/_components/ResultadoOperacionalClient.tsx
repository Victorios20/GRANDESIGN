"use client"

import { useState, useCallback, useEffect } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Landmark,
    TrendingUp,
    TrendingDown,
    Target,
    RefreshCw,
    Calendar,
    ArrowUp,
    ArrowDown,
    Minus,
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { OperationalResult } from "@/types/financeiro"
import { format, subMonths, addMonths, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CostCenterOption {
    id: number
    nome: string
}

interface Props {
    initialData: OperationalResult
    costCenters: CostCenterOption[]
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

function VariationBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-xs text-muted-foreground">-</span>

    const isPositive = value > 0
    const isNegative = value < 0
    const isZero = value === 0

    // For expenses, positive variation is usually "bad" (spending more), 
    // but colloquially "variation" is just math. We'll keep color logic neutral or context-aware?
    // Let's stick to Green = Up, Red = Down for now, users interpret meaning.
    // Actually, for consistency: 
    // Up arrow = Green, Down arrow = Red

    // wait, usually Red = Negative growth.

    const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus
    const colorClass = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-muted-foreground"

    return (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${colorClass} bg-muted/30 px-1.5 py-0.5 rounded-md`}>
            <Icon className="size-3" />
            {Math.abs(value).toFixed(1)}%
        </div>
    )
}

export default function ResultadoOperacionalClient({ initialData, costCenters }: Props) {
    const [data, setData] = useState<OperationalResult>(initialData)
    const [loading, setLoading] = useState(false)

    // State
    const [month, setMonth] = useState(new Date()) // Current selected month
    const [costCenterId, setCostCenterId] = useState<string>("all")
    const [comparePrevious, setComparePrevious] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const start = format(startOfMonth(month), "yyyy-MM-dd")
            const end = format(endOfMonth(month), "yyyy-MM-dd")

            const params = new URLSearchParams({
                period_start: start,
                period_end: end,
                compare_previous: String(comparePrevious),
            })

            if (costCenterId && costCenterId !== "all") {
                params.append("cost_center_id", costCenterId)
            }

            const res = await fetch(`/api/financeiro/reports/operational-result?${params.toString()}`)
            if (res.ok) {
                const result = await res.json()
                setData(result)
            } else {
                toast.error("Erro ao carregar relatório")
            }
        } catch {
            toast.error("Erro de conexão")
        } finally {
            setLoading(false)
        }
    }, [month, costCenterId, comparePrevious])

    // Effect to refetch when filters change (skip initial mount as we have initialData)
    // Actually, initialData corresponds to the default state (current month). 
    // If user changes state, we fetch.
    const [isFirstMount, setIsFirstMount] = useState(true)
    useEffect(() => {
        if (isFirstMount) {
            setIsFirstMount(false)
            return
        }
        fetchData()
    }, [fetchData]) // eslint-disable-line

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
    }

    const currentMonthLabel = format(month, "MMMM yyyy", { locale: ptBR })
    const prevMonthLabel = comparePrevious
        ? format(subMonths(month, 1), "MMMM", { locale: ptBR })
        : null

    const chartData = data.trend_6m.map(item => ({
        name: formatMonthLabel(item.month),
        Receitas: item.receitas,
        Despesas: item.despesas,
        Resultado: item.resultado,
    }))

    const kpiCards = [
        {
            label: "Receitas Totais",
            value: data.receitas_totais,
            variation: data.previous?.variacao_receitas ?? null,
            prevValue: data.previous?.receitas_totais,
            icon: TrendingUp,
            color: "#16a34a", // text-green-600
        },
        {
            label: "Custos e Despesas",
            value: data.custos_despesas_totais,
            variation: data.previous?.variacao_despesas ?? null,
            prevValue: data.previous?.custos_despesas_totais,
            icon: TrendingDown,
            color: "#dc2626", // text-red-600
        },
        {
            label: "Resultado Operacional",
            value: data.resultado_operacional,
            variation: data.previous?.variacao_resultado ?? null,
            prevValue: data.previous?.resultado_operacional,
            icon: Landmark,
            color: data.resultado_operacional >= 0 ? "#16a34a" : "#dc2626",
        },
        {
            label: "Margem Operacional",
            value: data.margem_operacional, // percentage
            isPercent: true,
            variation: null, // We didn't calculate margin variation in backend, simplistic for now
            prevValue: data.previous?.margem_operacional,
            icon: Target,
            color: "#2563eb", // text-blue-600
        },
    ]

    return (
        <PageLayout title="Resultado Operacional (DRE)">
            <div className="space-y-6">

                {/* Filters */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center w-full">

                            {/* Month Selector */}
                            <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-lg border border-border">
                                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')} disabled={loading}>
                                    <ArrowDown className="size-4 rotate-90" />
                                </Button>
                                <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center font-medium">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    <span className="capitalize">{currentMonthLabel}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')} disabled={loading}>
                                    <ArrowDown className="size-4 -rotate-90" />
                                </Button>
                            </div>

                            {/* Cost Center */}
                            <div className="w-full sm:w-[250px]">
                                <Select value={costCenterId} onValueChange={setCostCenterId} disabled={loading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Centro de Custo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Centros</SelectItem>
                                        {costCenters.map(cc => (
                                            <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Compare Toggle */}
                            <div className="flex items-center gap-2">
                                <Switch checked={comparePrevious} onCheckedChange={setComparePrevious} id="compare" />
                                <Label htmlFor="compare" className="text-sm cursor-pointer">Comparar mês anterior</Label>
                            </div>
                        </div>

                        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiCards.map((card, i) => (
                        <Card key={i} className="bg-card border-border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                                    <div className="p-2 rounded-lg bg-primary/5">
                                        <card.icon className="size-4 text-primary" />
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-foreground">
                                        {card.isPercent
                                            ? (card.value ? `${card.value.toFixed(1)}%` : "-")
                                            : formatCurrency(card.value ?? 0)
                                        }
                                    </span>
                                </div>

                                {comparePrevious && (
                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            vs {prevMonthLabel}:
                                            <span className="font-medium text-foreground">
                                                {card.isPercent
                                                    ? (card.prevValue ? `${card.prevValue.toFixed(1)}%` : "-")
                                                    : formatCurrency(card.prevValue ?? 0)}
                                            </span>
                                        </span>
                                        {card.variation !== null && !card.isPercent && (
                                            <VariationBadge value={card.variation} />
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts */}
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-foreground">Evolução do Resultado (6 meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2c201b" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2c201b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "#2c201b" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                                        tick={{ fontSize: 12, fill: "#2c201b" }}
                                    />
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                    <Tooltip content={<CustomTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="Resultado"
                                        stroke="#2c201b"
                                        fillOpacity={1}
                                        fill="url(#colorResultado)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Receitas"
                                        stroke="#16a34a"
                                        fill="none"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Despesas"
                                        stroke="#dc2626"
                                        fill="none"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageLayout>
    )
}
