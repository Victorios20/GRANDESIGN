"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Loader2, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateOnlyPtBr } from "@/lib/date-only"
import { formatCurrency } from "@/lib/utils"
import type { OrcadoRealizadoDTO } from "@/services/financial/orcado-realizado.service"

type TransactionItem = {
    id: number
    data: string
    descricao: string
    conta: string
    valor: number
    fornecedor: string
    categoriaOriginal: string
    contaPagarId: number | null
    contaReceberId: number | null
}

export default function OrcadoRealizadoDashboard() {
    const params = useParams()
    const obraId = Number(params?.id)

    const [data, setData] = useState<OrcadoRealizadoDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [recalculating, setRecalculating] = useState(false)
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})
    const [transactions, setTransactions] = useState<Record<string, TransactionItem[]>>({})
    const [loadingCats, setLoadingCats] = useState<Record<string, boolean>>({})

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/financeiro/reports/orcado-realizado?obraId=${obraId}`)
            if (!res.ok) throw new Error("Falha ao carregar relatório")
            setData(await res.json())
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar dados do relatório.")
        } finally {
            setLoading(false)
        }
    }, [obraId])

    async function toggleCategory(catKey: string) {
        const isExpanded = expandedCats[catKey]
        if (isExpanded) {
            setExpandedCats((prev) => ({ ...prev, [catKey]: false }))
            return
        }

        setExpandedCats((prev) => ({ ...prev, [catKey]: true }))
        if (transactions[catKey]) return

        try {
            setLoadingCats((prev) => ({ ...prev, [catKey]: true }))
            const res = await fetch(`/api/financeiro/reports/orcado-realizado/lancamentos?obraId=${obraId}&categoryKey=${catKey}`)
            if (!res.ok) throw new Error("Erro ao buscar detalhes")
            const json = await res.json()
            setTransactions((prev) => ({ ...prev, [catKey]: json.items }))
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar detalhes da categoria")
        } finally {
            setLoadingCats((prev) => ({ ...prev, [catKey]: false }))
        }
    }

    async function handleRecalculate() {
        if (!confirm("Isso vai resetar o baseline e sobrescrever os valores previstos editados manualmente. Deseja continuar?")) return

        try {
            setRecalculating(true)
            const res = await fetch(`/api/obras/${obraId}/recalcular-orcado`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: true }),
            })
            if (!res.ok) throw new Error("Falha ao recalcular")
            toast.success("Orçamento base atualizado com sucesso.")
            fetchReport()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao recalcular orçamento.")
        } finally {
            setRecalculating(false)
        }
    }

    useEffect(() => {
        if (obraId) fetchReport()
    }, [fetchReport, obraId])

    if (loading) return <div className="p-8 text-center">Carregando relatório financeiro...</div>
    if (!data) return <div className="p-8 text-center text-red-500">Erro ao carregar dados.</div>

    const { receita, rows, totais, warnings, realized_source } = data
    const LucroIcon = totais.lucroBrutoReal >= 0 ? ArrowUp : ArrowDown
    const MargemIcon = totais.margemReal >= 0 ? ArrowUp : ArrowDown

    return (
        <div className="container mx-auto space-y-6 py-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orçado vs Realizado</h1>
                    <p className="text-muted-foreground">{data.nomeObra}</p>
                </div>

                <div className="flex items-center gap-2">
                    {warnings.length > 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atenção
                        </Badge>
                    ) : null}
                    <Badge variant="outline">Fonte Realizado: {realized_source === "lancamentos" ? "Financeiro" : "Pedidos"}</Badge>
                    <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
                        Atualizar
                    </Button>
                    <Button onClick={handleRecalculate} disabled={recalculating} size="sm">
                        <RefreshCcw className={`mr-2 h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
                        Recalcular Baseline
                    </Button>
                </div>
            </div>

            {warnings.length > 0 ? (
                <div className="rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <div>
                            <h3 className="text-sm font-medium text-yellow-800">Avisos do Sistema</h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-yellow-700">
                                {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <span className="text-xs text-muted-foreground">Orçado: {formatCurrency(receita.orcada)}</span>
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
                            <span className="text-xs text-muted-foreground">Prev: {formatCurrency(totais.custoPrevisto)}</span>
                            <span className="text-xs font-semibold text-red-500">+ Extra: {formatCurrency(totais.custoExtra)}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totais.custoRealizado > totais.custoPrevisto ? "text-red-500" : ""}`}>
                            {formatCurrency(totais.custoRealizado)}
                        </div>
                        <p className="text-xs text-muted-foreground">vs Total Orçado: {formatCurrency(totais.custoPrevisto)}</p>
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
                        <p className="text-xs text-muted-foreground">Projetado: {formatCurrency(totais.lucroBrutoProjetado)}</p>
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
                        <p className="text-xs text-muted-foreground">Projetada: {totais.margemProjetada.toFixed(1)}%</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento de Custos</CardTitle>
                    <CardDescription>Comparativo: Orçado vs Realizado (Financeiro)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]" />
                                <TableHead>Categoria</TableHead>
                                <TableHead className="text-right">Orçado</TableHead>
                                <TableHead className="text-right">Realizado</TableHead>
                                <TableHead className="text-right">Desvio</TableHead>
                                <TableHead className="text-right">% Exec.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const isExpanded = expandedCats[row.key]
                                const isLoading = loadingCats[row.key]
                                const items = transactions[row.key] || []

                                return (
                                    <Fragment key={row.key}>
                                        <TableRow className={isExpanded ? "bg-muted/30" : ""}>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" onClick={() => toggleCategory(row.key)}>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{row.label}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(row.total_orcado)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
                                            <TableCell className={`text-right ${row.diferenca > row.total_orcado * 0.1 ? "text-red-600" : row.diferenca < 0 ? "text-green-600" : ""}`}>
                                                {formatCurrency(row.diferenca)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs font-medium">{row.percentual.toFixed(0)}%</span>
                                                    <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                                                        <div
                                                            className={`h-full ${row.percentual > 100 ? "bg-red-500" : "bg-primary"}`}
                                                            style={{ width: `${Math.min(row.percentual, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/10 p-0">
                                                    <div className="ml-4 border-l-2 border-primary p-4">
                                                        <h4 className="mb-2 text-sm font-semibold">Lançamentos: {row.label}</h4>
                                                        {isLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando transações...
                                                            </div>
                                                        ) : items.length === 0 ? (
                                                            <div className="text-sm italic text-muted-foreground">Nenhum lançamento encontrado nesta categoria.</div>
                                                        ) : (
                                                            <div className="rounded-md border bg-background">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="h-8">
                                                                            <TableHead className="h-8 text-xs">ID</TableHead>
                                                                            <TableHead className="h-8 text-xs">Data</TableHead>
                                                                            <TableHead className="h-8 text-xs">Fornecedor/Cliente</TableHead>
                                                                            <TableHead className="h-8 text-xs">Descrição</TableHead>
                                                                            <TableHead className="h-8 text-xs">Conta</TableHead>
                                                                            <TableHead className="h-8 text-right text-xs">Valor</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {items.map((transaction) => {
                                                                            const contaHref = transaction.contaPagarId
                                                                                ? `/contas-pagar?highlight=${transaction.contaPagarId}`
                                                                                : transaction.contaReceberId
                                                                                    ? `/contas-receber?highlight=${transaction.contaReceberId}`
                                                                                    : `/lancamentos?transaction_id=${transaction.id}`

                                                                            return (
                                                                                <TableRow key={transaction.id} className="h-8 hover:bg-muted/50">
                                                                                    <TableCell className="py-1 text-xs font-semibold">
                                                                                        <Link href={contaHref} className="underline-offset-2 hover:underline">
                                                                                            #{transaction.id}
                                                                                        </Link>
                                                                                    </TableCell>
                                                                                    <TableCell className="py-1 text-xs">{formatDateOnlyPtBr(transaction.data)}</TableCell>
                                                                                    <TableCell className="py-1 text-xs">{transaction.fornecedor}</TableCell>
                                                                                    <TableCell className="py-1 text-xs text-muted-foreground">
                                                                                        {transaction.descricao} <span className="opacity-50">({transaction.categoriaOriginal})</span>
                                                                                    </TableCell>
                                                                                    <TableCell className="py-1 text-xs text-muted-foreground">{transaction.conta}</TableCell>
                                                                                    <TableCell className="py-1 text-right text-xs font-medium">{formatCurrency(transaction.valor)}</TableCell>
                                                                                </TableRow>
                                                                            )
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </Fragment>
                                )
                            })}

                            <TableRow className="border-t-2 bg-muted/50 font-bold">
                                <TableCell />
                                <TableCell>TOTAL</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoPrevisto)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoRealizado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totais.custoRealizado - totais.custoPrevisto)}</TableCell>
                                <TableCell className="text-right">
                                    {totais.custoPrevisto > 0 ? ((totais.custoRealizado / totais.custoPrevisto) * 100).toFixed(0) : "0"}%
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
