"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RefreshCcw, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

import type { OrcadoRealizadoDTO } from "@/services/financial/orcado-realizado.service"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"

// ... imports

type TransactionItem = {
    id: number
    data: string
    descricao: string
    conta: string
    valor: number
    fornecedor: string
    categoriaOriginal: string
}

export default function OrcadoRealizadoDashboard() {
    const params = useParams()
    const obraId = Number(params?.id)

    const [data, setData] = useState<OrcadoRealizadoDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [recalculating, setRecalculating] = useState(false)

    // Expansion State
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})
    const [transactions, setTransactions] = useState<Record<string, TransactionItem[]>>({})
    const [loadingCats, setLoadingCats] = useState<Record<string, boolean>>({})

    async function fetchReport() {
        try {
            setLoading(true)
            const res = await fetch(`/api/financeiro/reports/orcado-realizado?obraId=${obraId}`)
            if (!res.ok) throw new Error("Falha ao carregar relatório")
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar dados do relatório.")
        } finally {
            setLoading(false)
        }
    }

    async function toggleCategory(catKey: string, label: string) {
        // Toggle Expand
        const isExpanded = expandedCats[catKey]
        if (isExpanded) {
            setExpandedCats(prev => ({ ...prev, [catKey]: false }))
            return
        }

        setExpandedCats(prev => ({ ...prev, [catKey]: true }))

        // Check Cache
        if (transactions[catKey]) return

        // Fetch
        try {
            setLoadingCats(prev => ({ ...prev, [catKey]: true }))
            const res = await fetch(`/api/financeiro/reports/orcado-realizado/lancamentos?obraId=${obraId}&categoryKey=${catKey}`)
            if (!res.ok) throw new Error("Erro ao buscar detalhes")
            const json = await res.json()
            setTransactions(prev => ({ ...prev, [catKey]: json.items }))
        } catch (err) {
            console.error(err)
            toast.error("Erro ao carregar detalhes da categoria")
        } finally {
            setLoadingCats(prev => ({ ...prev, [catKey]: false }))
        }
    }

    async function handleRecalculate() {
        if (!confirm("Isso vai resetar o baseline e sobrescrever os valores previstos editados manualmente. Deseja continuar?")) {
            return
        }

        try {
            setRecalculating(true)
            const res = await fetch(`/api/obras/${obraId}/recalcular-orcado`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: true }),
            })
            if (!res.ok) throw new Error("Falha ao recalcular")

            toast.success("Orçamento base (Snapshot) atualizado com sucesso!")
            fetchReport() // Refresh data
        } catch (error) {
            console.error(error)
            toast.error("Erro ao recalcular orçamento.")
        } finally {
            setRecalculating(false)
        }
    }

    useEffect(() => {
        if (obraId) fetchReport()
    }, [obraId])

    if (loading) {
        return <div className="p-8 text-center">Carregando relatório financeiro...</div>
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Erro ao carregar dados.</div>
    }

    const { receita, totais, custos, warnings, realized_source } = data

    const LucroIcon = totais.lucroBrutoReal >= 0 ? ArrowUp : ArrowDown
    const MargemIcon = totais.margemReal >= 0 ? ArrowUp : ArrowDown

    // Helper rows array with keys
    const rows = [
        { key: "MAO_DE_OBRA", label: "Mão de Obra", ...custos.maoDeObra },
        { key: "MADEIRA", label: "Madeira", ...custos.madeira },
        { key: "TELHA", label: "Telha", ...custos.telha },
        { key: "ANDAIME", label: "Andaime", ...custos.andaime },
        { key: "MATERIAIS", label: "Materiais (Geral)", ...custos.materiais },
    ]

    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orçado vs Realizado</h1>
                    <p className="text-muted-foreground">{data.nomeObra}</p>
                </div>

                <div className="flex items-center gap-2">
                    {warnings.length > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atenção
                        </Badge>
                    )}
                    <Badge variant="outline">Fonte Realizado: {realized_source === "lancamentos" ? "Financeiro" : "Pedidos"}</Badge>

                    <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
                        Atualizar
                    </Button>
                    <Button onClick={handleRecalculate} disabled={recalculating} size="sm">
                        {recalculating ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Recalcular Baseline
                    </Button>
                </div>
            </div>

            {/* Warnings Section */}
            {warnings.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Avisos do Sistema</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <span className="text-muted-foreground text-xs">Orçado: {formatCurrency(receita.orcada)}</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(receita.realizada)}</div>
                        <p className="text-xs text-muted-foreground">
                            {receita.orcada > 0 ? ((receita.realizada / receita.orcada) * 100).toFixed(1) : 0}% do previsto
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                        <div className="flex flex-col text-right">
                            <span className="text-muted-foreground text-xs">Prev: {formatCurrency(totais.custoPrevisto)}</span>
                            <span className="text-red-500 text-xs font-semibold">+ Extra: {formatCurrency(totais.custoExtra)}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totais.custoRealizado > (totais.custoPrevisto + totais.custoExtra) ? "text-red-500" : ""}`}>
                            {formatCurrency(totais.custoRealizado)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            vs Total Orçado: {formatCurrency(totais.custoPrevisto + totais.custoExtra)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
                        <LucroIcon className={`h-4 w-4 ${totais.lucroBrutoReal >= 0 ? "text-green-500" : "text-red-500"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totais.lucroBrutoReal >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(totais.lucroBrutoReal)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Projetado: {formatCurrency(totais.lucroBrutoProjetado)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margem</CardTitle>
                        <MargemIcon className={`h-4 w-4 ${totais.margemReal >= 0 ? "text-green-500" : "text-red-500"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totais.margemReal >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {totais.margemReal.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Projetada: {totais.margemProjetada.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento de Custos</CardTitle>
                    <CardDescription>Comparativo: Orçado (Base + Extras) vs Realizado (Financeiro)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead className="text-right">Orçado</TableHead>
                                <TableHead className="text-right">Realizado</TableHead>
                                <TableHead className="text-right">Desvio</TableHead>
                                <TableHead className="text-right">% Exec.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, i) => {
                                const isExpanded = expandedCats[row.key]
                                const isLoading = loadingCats[row.key]
                                const items = transactions[row.key] || []

                                return (
                                    <>
                                        <TableRow key={row.key} className={isExpanded ? "bg-muted/30" : ""}>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" onClick={() => toggleCategory(row.key, row.label)}>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{row.label}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(row.total_orcado)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
                                            <TableCell className={`text-right ${row.realizado - row.total_orcado > (row.total_orcado * 0.1) ? "text-red-600" : row.realizado - row.total_orcado < 0 ? "text-green-600" : ""}`}>
                                                {formatCurrency(row.realizado - row.total_orcado)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs font-medium">{row.percentual.toFixed(0)}%</span>
                                                    <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${row.percentual > 100 ? "bg-red-500" : "bg-primary"}`}
                                                            style={{ width: `${Math.min(row.percentual, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Detail Row */}
                                        {isExpanded && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="p-0 bg-muted/10">
                                                    <div className="p-4 border-l-2 border-primary ml-4">
                                                        <h4 className="text-sm font-semibold mb-2">Lançamentos: {row.label}</h4>

                                                        {isLoading ? (
                                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando transações...
                                                            </div>
                                                        ) : items.length === 0 ? (
                                                            <div className="text-sm text-muted-foreground italic">Nenhum lançamento encontrado nesta categoria.</div>
                                                        ) : (
                                                            <div className="rounded-md border bg-background">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="h-8">
                                                                            <TableHead className="h-8 text-xs">Data</TableHead>
                                                                            <TableHead className="h-8 text-xs">Fornecedor</TableHead>
                                                                            <TableHead className="h-8 text-xs">Descrição</TableHead>
                                                                            <TableHead className="h-8 text-xs">Conta</TableHead>
                                                                            <TableHead className="h-8 text-xs text-right">Valor</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {items.map(t => (
                                                                            <TableRow key={t.id} className="h-8 hover:bg-muted/50">
                                                                                <TableCell className="py-1 text-xs">{format(new Date(t.data), "dd/MM/yyyy")}</TableCell>
                                                                                <TableCell className="py-1 text-xs">{t.fornecedor}</TableCell>
                                                                                <TableCell className="py-1 text-xs text-muted-foreground">{t.descricao} <span className="opacity-50">({t.categoriaOriginal})</span></TableCell>
                                                                                <TableCell className="py-1 text-xs text-muted-foreground">{t.conta}</TableCell>
                                                                                <TableCell className="py-1 text-xs text-right font-medium">{formatCurrency(t.valor)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )
                            })}

                            {/* Linha de Totais */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell></TableCell>
                                <TableCell>TOTAL</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoPrevisto + totais.custoExtra)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoRealizado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoRealizado - (totais.custoPrevisto + totais.custoExtra))}</TableCell>
                                <TableCell className="text-right">
                                    {(totais.custoPrevisto + totais.custoExtra) > 0 ? ((totais.custoRealizado / (totais.custoPrevisto + totais.custoExtra)) * 100).toFixed(0) : "0"}%
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
