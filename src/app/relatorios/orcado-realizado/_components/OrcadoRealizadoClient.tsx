"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import {
    ArrowUp,
    ArrowDown,
    RefreshCcw,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Loader2,
    Building2
} from "lucide-react"
import { toast } from "sonner"
import type { OrcadoRealizadoDTO } from "@/services/financial/orcado-realizado.service"
import { PageLayout } from "@/components/ui/pageLayout"
import { cn } from "@/lib/utils"

type ObraOption = {
    id: number
    titulo: string
}

const OBRA_OPTIONS_LIMIT = 15

type TransactionItem = {
    id: number
    data: string
    descricao: string
    conta: string
    valor: number
    fornecedor: string
    categoriaOriginal: string
}

interface OrcadoRealizadoClientProps {
    obras: ObraOption[]
}

export function OrcadoRealizadoClient({ obras }: OrcadoRealizadoClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [selectedObraId, setSelectedObraId] = useState<string>(searchParams.get("obraId") || "")
    const [obraOptions, setObraOptions] = useState<ObraOption[]>(obras)
    const [selectedObraOption, setSelectedObraOption] = useState<ObraOption | null>(
        () => obras.find((obra) => String(obra.id) === (searchParams.get("obraId") || "")) ?? null
    )
    const [obraSearch, setObraSearch] = useState("")
    const [obrasLoading, setObrasLoading] = useState(false)
    const [data, setData] = useState<OrcadoRealizadoDTO | null>(null)
    const [loading, setLoading] = useState(false)
    const [recalculating, setRecalculating] = useState(false)
    const obraSearchTimeout = useRef<NodeJS.Timeout | null>(null)

    // Expansion State
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})
    const [transactions, setTransactions] = useState<Record<string, TransactionItem[]>>({})
    const [loadingCats, setLoadingCats] = useState<Record<string, boolean>>({})

    const obraSelectItems = useMemo(() => {
        const options = selectedObraOption ? [selectedObraOption, ...obraOptions] : obraOptions
        const unique = new Map<string, { value: string; label: string }>()

        for (const obra of options) {
            const value = String(obra.id)
            if (!unique.has(value)) {
                unique.set(value, { value, label: obra.titulo || `Obra #${obra.id}` })
            }
        }

        return Array.from(unique.values())
    }, [obraOptions, selectedObraOption])

    const fetchObraOptions = useCallback(async (search: string, signal?: AbortSignal) => {
        const params = new URLSearchParams()
        params.set("limit", String(OBRA_OPTIONS_LIMIT))
        if (search.trim()) params.set("search", search.trim())

        const response = await fetch(`/api/financeiro/reports/orcado-realizado/obras?${params.toString()}`, { signal })
        if (!response.ok) throw new Error("Falha ao carregar obras")
        const result = await response.json()
        return Array.isArray(result.data) ? result.data as ObraOption[] : []
    }, [])

    // Update URL when selection changes
    const handleObraChange = (val: string) => {
        const selected = obraOptions.find((obra) => String(obra.id) === val)
        if (selected) setSelectedObraOption(selected)
        setObraSearch("")
        setSelectedObraId(val)
        const params = new URLSearchParams(searchParams)
        params.set("obraId", val)
        router.replace(`?${params.toString()}`)
    }

    // Fetch Report
    async function fetchReport() {
        if (!selectedObraId) return

        try {
            setLoading(true)
            const res = await fetch(`/api/financeiro/reports/orcado-realizado?obraId=${selectedObraId}`)
            if (!res.ok) throw new Error("Falha ao carregar relatório")
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao buscar dados do relatório.")
        } finally {
            setLoading(false)
        }
    }

    // Initial Fetch & Refetch on Obra Change
    useEffect(() => {
        if (selectedObraId) {
            fetchReport()
            // Reset expansion state on obra change
            setExpandedCats({})
            setTransactions({})
        } else {
            setData(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedObraId])

    useEffect(() => {
        const controller = new AbortController()
        let active = true

        if (obraSearchTimeout.current) clearTimeout(obraSearchTimeout.current)
        obraSearchTimeout.current = setTimeout(async () => {
            try {
                setObrasLoading(true)
                const options = await fetchObraOptions(obraSearch, controller.signal)
                if (active) setObraOptions(options)
            } catch (error) {
                if (active && (error as Error).name !== "AbortError") {
                    console.error(error)
                    toast.error("Erro ao buscar obras.")
                }
            } finally {
                if (active) setObrasLoading(false)
            }
        }, 250)

        return () => {
            active = false
            controller.abort()
            if (obraSearchTimeout.current) clearTimeout(obraSearchTimeout.current)
        }
    }, [fetchObraOptions, obraSearch])

    useEffect(() => {
        if (!selectedObraId) {
            setSelectedObraOption(null)
            return
        }

        const current = obraOptions.find((obra) => String(obra.id) === selectedObraId)
        if (current) {
            setSelectedObraOption(current)
            return
        }

        if (selectedObraOption && String(selectedObraOption.id) === selectedObraId) return

        let active = true

        fetchObraOptions(selectedObraId)
            .then((options) => {
                if (!active) return
                const selected = options.find((obra) => String(obra.id) === selectedObraId)
                if (selected) setSelectedObraOption(selected)
            })
            .catch((error) => {
                console.error(error)
            })

        return () => {
            active = false
        }
    }, [fetchObraOptions, obraOptions, selectedObraId, selectedObraOption])

    // Recalculate Logic
    async function handleRecalculate() {
        if (!selectedObraId) return
        if (!confirm("Isso vai resetar o baseline e sobrescrever os valores previstos editados manualmente. Deseja continuar?")) return

        try {
            setRecalculating(true)
            const res = await fetch(`/api/obras/${selectedObraId}/recalcular-orcado`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: true }),
            })
            if (!res.ok) throw new Error("Falha ao recalcular")

            toast.success("Baseline atualizada com sucesso!")
            fetchReport()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao recalcular baseline.")
        } finally {
            setRecalculating(false)
        }
    }

    // Expand Category Logic
    async function toggleCategory(catKey: string) {
        const isExpanded = expandedCats[catKey]

        if (isExpanded) {
            setExpandedCats(prev => ({ ...prev, [catKey]: false }))
            return
        }

        setExpandedCats(prev => ({ ...prev, [catKey]: true }))

        // Check cache
        if (transactions[catKey]) return

        try {
            setLoadingCats(prev => ({ ...prev, [catKey]: true }))
            const res = await fetch(`/api/financeiro/reports/orcado-realizado/lancamentos?obraId=${selectedObraId}&categoryKey=${catKey}`)
            if (!res.ok) throw new Error("Erro ao buscar detalhes")
            const json = await res.json()
            setTransactions(prev => ({ ...prev, [catKey]: json.items }))
        } catch (err) {
            console.error(err)
            toast.error("Erro ao carregar lançamentos.")
        } finally {
            setLoadingCats(prev => ({ ...prev, [catKey]: false }))
        }
    }

    // --- RENDER HELPERS ---

    // Header Actions (Obra Selector + Logic)
    const HeaderActions = (
        <div className="flex items-center gap-2">
            <div className="w-[220px] md:w-[300px]">
                <SearchableSelect
                    value={selectedObraId}
                    onValueChange={handleObraChange}
                    items={obraSelectItems}
                    placeholder="Selecione uma obra"
                    searchPlaceholder="Buscar obra"
                    emptyMessage="Nenhuma obra encontrada."
                    searchValue={obraSearch}
                    onSearchValueChange={setObraSearch}
                    shouldFilter={false}
                    loading={obrasLoading}
                    loadingMessage="Carregando obras..."
                    className="bg-white"
                />
            </div>

            <Button variant="outline" size="icon" onClick={() => handleRecalculate()} disabled={recalculating || !selectedObraId} title="Recalcular Baseline">
                <RefreshCcw className={`h-4 w-4 text-marromEscuro ${recalculating ? "animate-spin" : ""}`} />
            </Button>
        </div>
    )

    const EmptyState = (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
            <div className="bg-marromClaro/10 p-6 rounded-full">
                <Building2 className="w-16 h-16 text-marromEscuro" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-marromEscuro">Selecione uma Obra</h2>
                <p className="text-muted-foreground max-w-[450px]">
                    Para visualizar a análise de Orçado vs Realizado, selecione uma obra no seletor acima.
                </p>
            </div>
        </div>
    )

    const LoadingState = (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-marromEscuro" />
            <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
    )

    // Main Content Calculation
    let content = null

    if (!selectedObraId) {
        content = EmptyState
    } else if (loading && !data) {
        content = LoadingState
    } else if (data) {
        const { receita, totais, custos, warnings } = data
        const rows = [
            { key: "MAO_DE_OBRA", label: "Mão de Obra", ...custos.maoDeObra },
            { key: "MADEIRA", label: "Madeira", ...custos.madeira },
            { key: "TELHA", label: "Telha", ...custos.telha },
            { key: "ANDAIME", label: "Andaime", ...custos.andaime },
            { key: "MATERIAIS", label: "Materiais (Geral)", ...custos.materiais },
        ]

        const LucroIcon = totais.lucroBrutoReal >= 0 ? ArrowUp : ArrowDown
        const MargemIcon = totais.margemReal >= 0 ? ArrowUp : ArrowDown

        content = (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* CARDS */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {/* RECEITA */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
                            <span className="text-xs text-muted-foreground">Orçado: {formatCurrency(receita.orcada)}</span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-marromEscuro">{formatCurrency(receita.realizada)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {receita.orcada > 0 ? ((receita.realizada / receita.orcada) * 100).toFixed(1) : 0}% Recebido
                            </p>
                        </CardContent>
                    </Card>

                    {/* CUSTO TOTAL */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
                            <span className="text-xs text-muted-foreground">Orç: {formatCurrency(totais.custoPrevisto)}</span>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", totais.custoRealizado > totais.custoPrevisto ? "text-red-600" : "text-marromEscuro")}>
                                {formatCurrency(totais.custoRealizado)}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                    {totais.custoPrevisto > 0 ? ((totais.custoRealizado / totais.custoPrevisto) * 100).toFixed(1) : 0}% Exec.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* LUCRO BRUTO */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Bruto</CardTitle>
                            <LucroIcon className={cn("h-4 w-4", totais.lucroBrutoReal >= 0 ? "text-emerald-500" : "text-red-500")} />
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", totais.lucroBrutoReal >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatCurrency(totais.lucroBrutoReal)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Proj: {formatCurrency(totais.lucroBrutoProjetado)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* MARGEM */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
                            <MargemIcon className={cn("h-4 w-4", totais.margemReal >= 0 ? "text-emerald-500" : "text-red-500")} />
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", totais.margemReal >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {totais.margemReal.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Proj: {totais.margemProjetada.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>

                    {/* EXECUÇÃO FINANCEIRA */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Execução</CardTitle>
                            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-marromEscuro">
                                {totais.custoPrevisto > 0 ? ((totais.custoRealizado / totais.custoPrevisto) * 100).toFixed(1) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                do orçamento total
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* WARNINGS */}
                {warnings.length > 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-amber-800">Avisos do Sistema</h4>
                            <ul className="mt-1 list-disc list-inside text-sm text-amber-700">
                                {warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <Card className="overflow-hidden border-marromClaro/20 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="text-lg text-marromEscuro">Detalhamento de Custos</CardTitle>
                        <CardDescription>
                            Comparativo por categoria de custo. Clique na seta para ver os lançamentos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[50px]"></TableHead>
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
                                    const desvio = row.realizado - row.total_orcado

                                    return (
                                        <>
                                            <TableRow key={row.key} className={cn("transition-colors", isExpanded && "bg-muted/30")}>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-black/5" onClick={() => toggleCategory(row.key)}>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-medium">{row.label}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatCurrency(row.total_orcado)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(row.realizado)}</TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-medium",
                                                    desvio > 0 && desvio > (row.total_orcado * 0.1) ? "text-red-600" :
                                                        desvio < 0 ? "text-emerald-600" : "text-muted-foreground"
                                                )}>
                                                    {desvio > 0 ? "+" : ""}{formatCurrency(desvio)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-xs w-8 text-right">{row.percentual.toFixed(0)}%</span>
                                                        <div className="h-1.5 w-16 bg-zinc-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-500", row.percentual > 100 ? "bg-red-500" : "bg-primary")}
                                                                style={{ width: `${Math.min(row.percentual, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* EXPANDED ROW */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/10">
                                                    <TableCell colSpan={6} className="p-0">
                                                        <div className="px-6 py-4 bg-muted/20 border-l-4 border-primary/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                                                Lançamentos: {row.label}
                                                            </h4>

                                                            {isLoading ? (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 pl-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos...
                                                                </div>
                                                            ) : items.length === 0 ? (
                                                                <div className="text-sm text-muted-foreground italic py-2 pl-2">
                                                                    Nenhum lançamento encontrado nesta categoria.
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-md border bg-background overflow-hidden">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="h-8 bg-muted/40 hover:bg-muted/40">
                                                                                <TableHead className="h-8 text-[10px] font-bold uppercase text-muted-foreground">Data</TableHead>
                                                                                <TableHead className="h-8 text-[10px] font-bold uppercase text-muted-foreground">Fornecedor</TableHead>
                                                                                <TableHead className="h-8 text-[10px] font-bold uppercase text-muted-foreground">Descrição</TableHead>
                                                                                <TableHead className="h-8 text-[10px] font-bold uppercase text-muted-foreground">Conta</TableHead>
                                                                                <TableHead className="h-8 text-[10px] font-bold uppercase text-muted-foreground text-right">Valor</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {items.map(t => (
                                                                                <TableRow key={t.id} className="h-8 border-b hover:bg-muted/30 text-xs">
                                                                                    <TableCell className="py-2 text-muted-foreground">
                                                                                        {format(new Date(t.data), "dd/MM/yyyy")}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2 font-medium truncate max-w-[150px]" title={t.fornecedor}>
                                                                                        {t.fornecedor}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2 text-muted-foreground truncate max-w-[200px]" title={t.descricao}>
                                                                                        {t.descricao}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2 text-muted-foreground">
                                                                                        {t.conta}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2 text-right font-medium">
                                                                                        {formatCurrency(t.valor)}
                                                                                    </TableCell>
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

                                {/* TOTAL ROW */}
                                <TableRow className="bg-muted/30 border-t-2 border-marromClaro/20">
                                    <TableCell></TableCell>
                                    <TableCell className="font-bold text-marromEscuro">TOTAL GERAL</TableCell>
                                    <TableCell className="text-right font-bold text-muted-foreground border-t border-marromClaro/20">{formatCurrency(totais.custoPrevisto)}</TableCell>
                                    <TableCell className="text-right font-bold text-marromEscuro border-t border-marromClaro/20">{formatCurrency(totais.custoRealizado)}</TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold border-t border-marromClaro/20",
                                        totais.custoRealizado > totais.custoPrevisto ? "text-red-600" : "text-emerald-600"
                                    )}>
                                        {formatCurrency(totais.custoRealizado - totais.custoPrevisto)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold border-t border-marromClaro/20">
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

    return (
        <PageLayout
            title="Orçado vs Realizado"
            headerActions={HeaderActions}
            isTitulo={false}
        >
            {content}
        </PageLayout>
    )
}
