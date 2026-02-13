"use client"

import { useState, useCallback, useEffect } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent } from "@/components/ui/card"
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
import {
    ChevronRight,
    ChevronDown,
    RefreshCw,
    Download,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { BalanceteItem } from "../../../../types/financeiro"
import { startOfMonth, endOfMonth, format } from "date-fns"

interface CostCenterOption {
    id: number
    nome: string
}

interface Props {
    initialData: BalanceteItem[]
    costCenters: CostCenterOption[]
}

export default function BalanceteClient({ initialData, costCenters }: Props) {
    const [data, setData] = useState<BalanceteItem[]>(initialData)
    const [loading, setLoading] = useState(false)

    // Filters
    const now = new Date()
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
    const [costCenterId, setCostCenterId] = useState<string>("all")

    // UI State
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

    const toggleExpand = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                period_start: startDate,
                period_end: endDate,
            })

            if (costCenterId && costCenterId !== "all") {
                params.append("cost_center_id", costCenterId)
            }

            const res = await fetch(`/api/financeiro/reports/balancete?${params.toString()}`)
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
    }, [startDate, endDate, costCenterId])

    const handleExportCSV = () => {
        // Flatten data for CSV
        const rows: any[] = []

        data.forEach(root => {
            rows.push({
                Categoria: root.nome.toUpperCase(), // Parent uppercase
                "Saldo Anterior": root.saldo_anterior,
                "Débitos": root.debitos,
                "Créditos": root.creditos,
                "Saldo Final": root.saldo_final,
            })

            root.subcontas.forEach(child => {
                rows.push({
                    Categoria: `  ${child.nome}`, // Indent
                    "Saldo Anterior": child.saldo_anterior,
                    "Débitos": child.debitos,
                    "Créditos": child.creditos,
                    "Saldo Final": child.saldo_final,
                })
            })
        })

        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Categoria", "Saldo Anterior", "Débitos", "Créditos", "Saldo Final"].join(";") + "\n"
            + rows.map(r => [
                r.Categoria,
                r["Saldo Anterior"].toFixed(2).replace(".", ","),
                r["Débitos"].toFixed(2).replace(".", ","),
                r["Créditos"].toFixed(2).replace(".", ","),
                r["Saldo Final"].toFixed(2).replace(".", ","),
            ].join(";")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `balancete_${startDate}_${endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <PageLayout title="Balancete Financeiro">
            <div className="space-y-6">

                {/* Filters */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center w-full">

                            {/* Date Range */}
                            <div className="flex items-center gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Início</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="h-9 w-[130px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Fim</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="h-9 w-[130px]"
                                    />
                                </div>
                            </div>

                            {/* Cost Center */}
                            <div className="w-full sm:w-[250px] space-y-1">
                                <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                                <Select value={costCenterId} onValueChange={setCostCenterId} disabled={loading}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Todos os Centros" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Centros</SelectItem>
                                        {costCenters.map(cc => (
                                            <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="secondary" size="icon" onClick={fetchData} disabled={loading} className="mb-0.5">
                                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                            <Download className="size-4" />
                            Exportar CSV
                        </Button>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-card border-border shadow-sm">
                    <div className="rounded-md border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[40%]">Categoria</TableHead>
                                    <TableHead className="text-right">Saldo Anterior</TableHead>
                                    <TableHead className="text-right text-red-600 dark:text-red-400">Débitos</TableHead>
                                    <TableHead className="text-right text-green-600 dark:text-green-400">Créditos</TableHead>
                                    <TableHead className="text-right font-bold">Saldo Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nenhum dado encontrado para o período.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((root) => {
                                        const isExpanded = expandedRows[root.categoria_id]
                                        const hasChildren = root.subcontas.length > 0

                                        return (
                                            <>
                                                {/* Parent Row */}
                                                <TableRow
                                                    key={root.categoria_id}
                                                    className="font-medium bg-muted/10 hover:bg-muted/20 cursor-pointer"
                                                    onClick={() => hasChildren && toggleExpand(root.categoria_id)}
                                                >
                                                    <TableCell className="flex items-center gap-2 py-3">
                                                        {hasChildren ? (
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground">
                                                                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                                            </Button>
                                                        ) : <span className="w-5" />}
                                                        <span className="uppercase text-xs tracking-wider text-foreground">{root.nome}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(root.saldo_anterior)}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm text-red-600 dark:text-red-400">{formatCurrency(root.debitos)}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">{formatCurrency(root.creditos)}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm font-bold text-foreground">{formatCurrency(root.saldo_final)}</TableCell>
                                                </TableRow>

                                                {/* Children Rows */}
                                                {isExpanded && root.subcontas.map(child => (
                                                    <TableRow key={child.categoria_id} className="hover:bg-muted/5">
                                                        <TableCell className="pl-12 text-sm text-foreground">
                                                            {child.nome}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(child.saldo_anterior)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-red-600/80">{formatCurrency(child.debitos)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-green-600/80">{formatCurrency(child.creditos)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-foreground">{formatCurrency(child.saldo_final)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </PageLayout>
    )
}
