"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { CashFlowProjectionItem } from "../../../../types/financeiro"
import { format, addDays, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts"

interface Option {
    id: number
    nome: string
}

interface Props {
    costCenters: Option[]
    bankAccounts: Option[]
}

export default function FluxoCaixaClient({ costCenters, bankAccounts }: Props) {
    const [data, setData] = useState<CashFlowProjectionItem[]>([])
    const [loading, setLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [days, setDays] = useState("30")
    const [costCenterId, setCostCenterId] = useState<string>("all")
    const [bankAccountId, setBankAccountId] = useState<string>("all")

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                days: days,
            })

            if (costCenterId && costCenterId !== "all") params.append("centro_custo_id", costCenterId)
            if (bankAccountId && bankAccountId !== "all") params.append("conta_bancaria_id", bankAccountId)

            const res = await fetch(`/api/financeiro/reports/cash-flow-projection?${params.toString()}`)
            if (res.ok) {
                const result = await res.json()
                setData(result)
            } else {
                toast.error("Erro ao carregar projeção")
            }
        } catch {
            toast.error("Erro de conexão")
        } finally {
            setLoading(false)
        }
    }, [startDate, days, costCenterId, bankAccountId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Summary Calculations
    const lowPoint = useMemo(() => data.reduce((min, item) => item.saldo_final < min ? item.saldo_final : min, Infinity), [data])
    const highPoint = useMemo(() => data.reduce((max, item) => item.saldo_final > max ? item.saldo_final : max, -Infinity), [data])
    const finalBalance = data.length > 0 ? data[data.length - 1].saldo_final : 0

    return (
        <PageLayout title="Fluxo de Caixa Projetado">
            <div className="space-y-6 max-w-[1400px] mx-auto pb-20">

                {/* Filters */}
                <Card className="bg-card border-none shadow-sm ring-1 ring-marromClaro/20">
                    <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Início</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="h-9 w-[140px] text-xs"
                            />
                        </div>
                        <div className="space-y-1 w-[100px]">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Dias</Label>
                            <Select value={days} onValueChange={setDays}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 Dias</SelectItem>
                                    <SelectItem value="30">30 Dias</SelectItem>
                                    <SelectItem value="60">60 Dias</SelectItem>
                                    <SelectItem value="90">90 Dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 w-[200px]">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Centro de Custo</Label>
                            <Select value={costCenterId} onValueChange={setCostCenterId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {costCenters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 w-[200px]">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Conta Bancária</Label>
                            <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {bankAccounts.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="mb-0.5">
                            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Final (Projetado)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${finalBalance < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                {formatCurrency(finalBalance)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ponto Crítico (Mínimo)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {lowPoint === Infinity ? "-" : formatCurrency(lowPoint)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pico de Caixa (Máximo)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                                {highPoint === -Infinity ? "-" : formatCurrency(highPoint)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart */}
                <Card className="p-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => format(parseDate(val), "dd/MM")}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(val: number) => formatCurrency(val)}
                                    labelFormatter={(label) => format(parseDate(label as string), "dd 'de' MMMM", { locale: ptBR })}
                                />
                                <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />

                                <Line
                                    type="monotone"
                                    dataKey="saldo_final"
                                    stroke="#2563EB"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Saldo Inicial</TableHead>
                                <TableHead className="text-right text-emerald-600">Entradas Previstas</TableHead>
                                <TableHead className="text-right text-red-600">Saídas Previstas</TableHead>
                                <TableHead className="text-right font-bold">Saldo Final</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.date} className="hover:bg-muted/50">
                                    <TableCell className="font-medium text-xs">
                                        {format(parseDate(item.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                        {formatCurrency(item.saldo_inicial)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-mono text-emerald-600">
                                        {item.entradas_previstas > 0 ? `+ ${formatCurrency(item.entradas_previstas)}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-mono text-red-600">
                                        {item.saidas_previstas > 0 ? `- ${formatCurrency(item.saidas_previstas)}` : "-"}
                                    </TableCell>
                                    <TableCell className={`text-right text-xs font-mono font-bold ${item.saldo_final < 0 ? "text-red-600" : "text-blue-600"}`}>
                                        {formatCurrency(item.saldo_final)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={item.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </PageLayout>
    )
}

function parseDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
}

function StatusBadge({ status }: { status: "OK" | "ALERTA" | "CRITICO" }) {
    if (status === "OK") {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">OK</span>
    }
    if (status === "ALERTA") {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Alerta</span>
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Crítico</span>
}
