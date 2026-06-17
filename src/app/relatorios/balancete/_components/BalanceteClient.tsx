"use client"

import { useState, useCallback, useMemo } from "react"
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
import {
    ChevronRight,
    ChevronDown,
    RefreshCw,
    Download,
    TrendingUp,
    TrendingDown,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/financeiro-utils"
import type { BalanceteItem } from "../../../../types/financeiro"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { cn } from "@/lib/utils"
// Animation
import { motion, AnimatePresence } from "framer-motion"

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

        // Helper to process list
        const processList = (list: BalanceteItem[]) => {
            list.forEach(root => {
                rows.push({
                    Categoria: root.nome.toUpperCase(),
                    "Tipo": root.tipo,
                    "Saldo Anterior": root.saldo_anterior,
                    "Débitos": root.debitos,
                    "Créditos": root.creditos,
                    "Saldo Final": root.saldo_final,
                })

                root.subcontas.forEach(child => {
                    rows.push({
                        Categoria: `  ${child.nome}`,
                        "Tipo": child.tipo,
                        "Saldo Anterior": child.saldo_anterior,
                        "Débitos": child.debitos,
                        "Créditos": child.creditos,
                        "Saldo Final": child.saldo_final,
                    })
                })
            })
        }

        processList(data)

        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Categoria", "Tipo", "Saldo Anterior", "Débitos", "Créditos", "Saldo Final"].join(";") + "\n"
            + rows.map(r => [
                r.Categoria,
                r.Tipo,
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

    // Split data
    const { receitas, despesas } = useMemo(() => {
        const r: BalanceteItem[] = []
        const d: BalanceteItem[] = []
        data.forEach(item => {
            if (item.tipo === 'Receita') r.push(item)
            else d.push(item)
        })
        return { receitas: r, despesas: d }
    }, [data])

    // Calculate Totals
    const totalReceitas = useMemo(() => receitas.reduce((acc, curr) => acc + curr.saldo_final, 0), [receitas])
    const totalDespesas = useMemo(() => despesas.reduce((acc, curr) => acc + curr.saldo_final, 0), [despesas])

    // Logic: Resultado = Receitas + Despesas (assuming negative expenses)
    const resultadoPeriodo = totalReceitas + totalDespesas

    // Variants for animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    // Render helper
    const renderTableSection = (title: string, items: BalanceteItem[], total: number, isExpense: boolean) => {
        const headerBg = isExpense ? "bg-red-50 dark:bg-red-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"
        const iconColor = isExpense ? "text-red-600" : "text-emerald-600"

        return (
            <motion.div variants={itemVariants} className="mb-8">
                <Card className={cn("bg-card shadow-sm overflow-hidden border border-marromClaro/20")}>
                    <CardHeader className={cn("py-3 px-4 border-b border-marromClaro/20", headerBg)}>
                        <div className="flex justify-between items-center">
                            <CardTitle className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", iconColor)}>
                                {isExpense ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
                                {title}
                            </CardTitle>
                            <div className={cn("text-sm font-mono font-bold", iconColor)}>
                                {formatCurrency(total)}
                            </div>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto rounded-none border-0">
                        <Table className="min-w-[640px]">
                            <TableHeader>
                                <TableRow className="bg-marromClaro/10 hover:bg-marromClaro/20 border-b-marromClaro/20">
                                    <TableHead className="w-[40%] text-marromEscuro font-semibold text-xs uppercase tracking-wide">Categoria</TableHead>
                                    <TableHead className="text-right text-xs text-marromEscuro/60 font-medium tracking-wide">Saldo Ant.</TableHead>
                                    <TableHead className="text-right text-xs text-red-600/80 font-medium tracking-wide">Débitos</TableHead>
                                    <TableHead className="text-right text-xs text-emerald-600/80 font-medium tracking-wide">Créditos</TableHead>
                                    <TableHead className="text-right text-xs font-bold text-marromEscuro tracking-wide">Saldo Atual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                                            Nenhum registro encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((root) => {
                                        const isExpanded = expandedRows[root.categoria_id]
                                        const hasChildren = root.subcontas.length > 0

                                        return (
                                            <>
                                                <TableRow
                                                    key={root.categoria_id}
                                                    className="group border-b-marromClaro/10 transition-colors hover:bg-marromClaro/10 cursor-pointer"
                                                    onClick={() => hasChildren && toggleExpand(root.categoria_id)}
                                                >
                                                    <TableCell className="flex items-center gap-2 py-3">
                                                        {hasChildren ? (
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-marromEscuro group-hover:text-marromEscuro/80 hover:bg-transparent">
                                                                <motion.div
                                                                    initial={false}
                                                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                >
                                                                    <ChevronRight className="size-3.5" />
                                                                </motion.div>
                                                            </Button>
                                                        ) : <span className="w-5" />}
                                                        <span className="uppercase text-xs tracking-wide text-marromEscuro font-bold">{root.nome}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(root.saldo_anterior)}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-red-600/80">{formatCurrency(root.debitos)}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-emerald-600/80">{formatCurrency(root.creditos)}</TableCell>
                                                    <TableCell className={cn("text-right font-mono text-sm font-bold", root.saldo_final < 0 ? "text-red-600" : "text-emerald-600")}>
                                                        {formatCurrency(root.saldo_final)}
                                                    </TableCell>
                                                </TableRow>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <>
                                                            {root.subcontas.map(child => (
                                                                <motion.tr
                                                                    key={child.categoria_id}
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="bg-marromClaro/5 border-l-2 border-l-marromClaro/20 border-b-marromClaro/5 hover:bg-marromClaro/10"
                                                                >
                                                                    <TableCell className="pl-12 text-xs text-marromEscuro/80 py-2 font-medium">
                                                                        {child.nome}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">{formatCurrency(child.saldo_anterior)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-xs text-red-600/60 py-2">{formatCurrency(child.debitos)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-xs text-emerald-600/60 py-2">{formatCurrency(child.creditos)}</TableCell>
                                                                    <TableCell className={cn("text-right font-mono text-xs font-medium py-2", child.saldo_final < 0 ? "text-red-500" : "text-marromEscuro/90")}>
                                                                        {formatCurrency(child.saldo_final)}
                                                                    </TableCell>
                                                                </motion.tr>
                                                            ))}
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </motion.div>
        )
    }

    return (
        <PageLayout title="Balancete Gerencial">
            <motion.div
                className="space-y-6 max-w-[1200px] mx-auto pb-20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Filters */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-card border-none shadow-sm ring-1 ring-marromClaro/20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-marromEscuro" />
                        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center w-full">
                                {/* Date Range */}
                                <div className="flex items-center gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider text-marromEscuro/60 font-bold">Início</Label>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="h-9 w-[135px] border-marromClaro/30 focus-visible:ring-marromEscuro/20 bg-marromClaro/5 text-xs font-mono text-marromEscuro"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider text-marromEscuro/60 font-bold">Fim</Label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="h-9 w-[135px] border-marromClaro/30 focus-visible:ring-marromEscuro/20 bg-marromClaro/5 text-xs font-mono text-marromEscuro"
                                        />
                                    </div>
                                </div>

                                {/* Cost Center */}
                                <div className="w-full sm:w-[250px] space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-marromEscuro/60 font-bold">Centro de Custo</Label>
                                    <Select value={costCenterId} onValueChange={setCostCenterId} disabled={loading}>
                                        <SelectTrigger className="h-9 border-marromClaro/30 focus:ring-marromEscuro/20 bg-marromClaro/5 text-xs text-marromEscuro">
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

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="mb-0.5 border-marromClaro/30 text-marromEscuro hover:bg-marromClaro/10 hover:text-marromEscuro hover:border-marromClaro/60 transition-all"
                                >
                                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                className="gap-2 border-marromClaro/30 text-marromEscuro hover:bg-marromClaro/10 hover:text-marromEscuro text-xs font-medium uppercase tracking-wide"
                            >
                                <Download className="size-3.5" />
                                CSV
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* RECEITAS */}
                {renderTableSection("Receitas", receitas, totalReceitas, false)}

                {/* DESPESAS */}
                {renderTableSection("Despesas", despesas, totalDespesas, true)}

                {/* RESULTADO (Final Card) */}
                <motion.div variants={itemVariants}>
                    <Card className={cn(
                        "border shadow-lg overflow-hidden relative",
                        resultadoPeriodo >= 0
                            ? "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-200"
                            : "bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-200"
                    )}>
                        {/* Decorative Background Element */}
                        <div className={cn(
                            "absolute md:-right-10 md:-top-10 -right-20 -top-20 w-40 h-40 rounded-full opacity-10 blur-3xl",
                            resultadoPeriodo >= 0 ? "bg-emerald-500" : "bg-red-500"
                        )} />

                        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-sm ring-1 ring-inset",
                                    resultadoPeriodo >= 0
                                        ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                        : "bg-red-100 text-red-700 ring-red-200"
                                )}>
                                    {resultadoPeriodo >= 0 ? <TrendingUp className="size-8" /> : <TrendingDown className="size-8" />}
                                </div>
                                <div>
                                    <h3 className={cn("text-lg font-black uppercase tracking-widest", resultadoPeriodo >= 0 ? "text-emerald-900" : "text-red-900")}>
                                        Resultado do Período
                                    </h3>
                                    <p className={cn("text-sm font-medium opacity-70", resultadoPeriodo >= 0 ? "text-emerald-800" : "text-red-800")}>
                                        Consolidado (Receitas - Despesas)
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "text-4xl sm:text-5xl font-bold font-mono tracking-tighter",
                                resultadoPeriodo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {formatCurrency(resultadoPeriodo)}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

            </motion.div>
        </PageLayout>
    )
}
