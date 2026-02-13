"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Search,
    TrendingUp,
    TrendingDown,
    Scale,
    CheckCircle2,
    RefreshCw,
    Download,
    CheckCheck,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowLeftRight,
    FileText,
    Receipt,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { formatCurrency, formatDateBR } from "@/lib/financeiro-utils"
import type { PaginatedResponse, TransactionListItem, BankOption, CategoryOption, CentroCustoOption } from "@/types/financeiro"

interface Props {
    initialData: PaginatedResponse<TransactionListItem>
    banks: BankOption[]
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
}

function getOriginInfo(item: TransactionListItem) {
    if (item.conta_pagar) return { label: item.conta_pagar.fornecedor?.nome ?? "Conta a Pagar", icon: FileText, color: "#dc2626" }
    if (item.conta_receber) return { label: item.conta_receber.cliente?.nome ?? "Conta a Receber", icon: Receipt, color: "#16a34a" }
    if (item.transferencia) return { label: `Transferência #${item.transferencia.id}`, icon: ArrowLeftRight, color: "#2563eb" }
    return { label: "Manual", icon: FileText, color: "var(--brand-primary)" }
}

export default function LancamentosPageClient({ initialData, banks, categories, centrosCusto }: Props) {
    const [data, setData] = useState(initialData.data)
    const [meta, setMeta] = useState(initialData.meta)
    const [loading, setLoading] = useState(false)

    // Filters
    const [search, setSearch] = useState("")
    const [contaBancariaId, setContaBancariaId] = useState<string>("all")
    const [categoriaId, setCategoriaId] = useState<string>("all")
    const [centroCustoId, setCentroCustoId] = useState<string>("all")
    const [tipoFilter, setTipoFilter] = useState<string>("all")
    const [conciliadoFilter, setConciliadoFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [page, setPage] = useState(1)

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [reconciling, setReconciling] = useState(false)

    const searchTimeout = useRef<NodeJS.Timeout | null>(null)

    const buildParams = useCallback((p: number) => {
        const params = new URLSearchParams()
        params.set("page", String(p))
        params.set("limit", "50")
        if (search) params.set("search", search)
        if (contaBancariaId && contaBancariaId !== "all") params.set("conta_bancaria_id", contaBancariaId)
        if (categoriaId && categoriaId !== "all") params.set("categoria_id", categoriaId)
        if (centroCustoId && centroCustoId !== "all") params.set("centro_custo_id", centroCustoId)
        if (tipoFilter && tipoFilter !== "all") params.set("tipo", tipoFilter)
        if (conciliadoFilter === "true") params.set("conciliado", "true")
        if (conciliadoFilter === "false") params.set("conciliado", "false")
        if (dateRange?.from) params.set("startDate", dateRange.from.toISOString())
        if (dateRange?.to) params.set("endDate", dateRange.to.toISOString())
        return params
    }, [search, contaBancariaId, categoriaId, centroCustoId, tipoFilter, conciliadoFilter, dateRange])

    const fetchData = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const params = buildParams(p)
            const res = await fetch(`/api/financeiro/transactions?${params}`)
            if (res.ok) {
                const result = await res.json()
                setData(result.data)
                setMeta(result.meta)
                setSelectedIds(new Set())
            }
        } catch {
            toast.error("Erro ao carregar transações")
        } finally {
            setLoading(false)
        }
    }, [buildParams, page])

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setPage(1)
            fetchData(1)
        }, 400)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [search, contaBancariaId, categoriaId, centroCustoId, tipoFilter, conciliadoFilter, dateRange])

    // Bulk reconcile
    async function handleBulkReconcile() {
        if (selectedIds.size === 0) return
        setReconciling(true)
        try {
            const res = await fetch("/api/financeiro/transactions/reconcile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            })
            if (res.ok) {
                const result = await res.json()
                toast.success(`${result.updated} transação(ões) conciliada(s)`)
                await fetchData(page)
            } else {
                toast.error("Erro ao conciliar transações")
            }
        } catch {
            toast.error("Erro ao conciliar transações")
        } finally {
            setReconciling(false)
        }
    }

    // CSV Export
    function handleExport() {
        const params = buildParams(1)
        params.delete("page")
        params.delete("limit")
        const url = `/api/financeiro/transactions/export?${params}`
        window.open(url, "_blank")
    }

    // Selection helpers
    const allOnPageSelected = data.length > 0 && data.every(item => selectedIds.has(item.id))
    function toggleAll() {
        if (allOnPageSelected) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(data.map(item => item.id)))
        }
    }
    function toggleItem(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Summary calculations from current data
    const totalReceitas = data.filter(i => i.tipo === "RECEITA").reduce((sum, i) => sum + Number(i.valor), 0)
    const totalDespesas = data.filter(i => i.tipo === "DESPESA").reduce((sum, i) => sum + Number(i.valor), 0)
    const saldo = totalReceitas - totalDespesas
    const conciliadoCount = data.filter(i => i.conciliado).length

    const summaryCards = [
        { label: "Receitas", value: formatCurrency(totalReceitas), icon: TrendingUp, color: "#16a34a" },
        { label: "Despesas", value: formatCurrency(totalDespesas), icon: TrendingDown, color: "#dc2626" },
        { label: "Saldo", value: formatCurrency(saldo), icon: Scale, color: saldo >= 0 ? "#16a34a" : "#dc2626" },
        { label: "Conciliados", value: `${conciliadoCount}/${data.length}`, icon: CheckCircle2, color: "#2563eb" },
    ]

    return (
        <PageLayout title="Transações">
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summaryCards.map((card) => (
                        <Card key={card.label} className="border border-[var(--brand-primary)]/10" style={{ backgroundColor: "var(--brand-bg)" }}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium" style={{ color: "var(--brand-primary)", opacity: 0.7 }}>{card.label}</span>
                                    <card.icon className="size-5" style={{ color: card.color }} />
                                </div>
                                <p className="text-xl font-bold" style={{ color: card.color }}>{card.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter Bar */}
                <Card className="border border-[var(--brand-primary)]/10" style={{ backgroundColor: "var(--brand-bg)" }}>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Busca</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--brand-primary)", opacity: 0.4 }} />
                                    <Input placeholder="Buscar por descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                                </div>
                            </div>

                            <div className="min-w-[180px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Período</label>
                                <SmartDateRangePicker range={dateRange} onChange={(range) => setDateRange(range ?? undefined)} />
                            </div>

                            <div className="min-w-[150px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Conta</label>
                                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {banks.filter(b => b.ativo).map(b => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[150px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Categoria</label>
                                <Select value={categoriaId} onValueChange={setCategoriaId}>
                                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[150px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Centro de Custo</label>
                                <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {centrosCusto.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[120px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Tipo</label>
                                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="RECEITA">Receita</SelectItem>
                                        <SelectItem value="DESPESA">Despesa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[120px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Conciliado</label>
                                <Select value={conciliadoFilter} onValueChange={setConciliadoFilter}>
                                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="true">Sim</SelectItem>
                                        <SelectItem value="false">Não</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" onClick={() => fetchData(page)} disabled={loading} title="Atualizar">
                                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleExport} title="Exportar CSV">
                                    <Download className="size-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Bulk actions */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                                <span className="text-sm font-medium" style={{ color: "var(--brand-primary)" }}>
                                    {selectedIds.size} selecionada(s)
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkReconcile}
                                    disabled={reconciling}
                                    className="gap-1.5"
                                >
                                    <CheckCheck className="size-4" />
                                    Marcar como Conciliado
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border border-[var(--brand-primary)]/10 overflow-hidden" style={{ backgroundColor: "var(--brand-bg)" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                                    <th className="px-4 py-3 w-10">
                                        <Checkbox
                                            checked={allOnPageSelected}
                                            onCheckedChange={toggleAll}
                                        />
                                    </th>
                                    {["Data", "Tipo", "Categoria", "Descrição", "Conta", "Centro Custo", "Valor", "Conciliado", "Origem"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--brand-primary)", opacity: 0.6 }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
                                            Nenhuma transação encontrada
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item) => {
                                        const origin = getOriginInfo(item)
                                        const isReceita = item.tipo === "RECEITA"
                                        return (
                                            <tr
                                                key={item.id}
                                                className="border-b transition-colors hover:bg-black/[0.02]"
                                                style={{ borderColor: "rgba(44,32,27,0.06)" }}
                                            >
                                                <td className="px-4 py-3">
                                                    <Checkbox
                                                        checked={selectedIds.has(item.id)}
                                                        onCheckedChange={() => toggleItem(item.id)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--brand-primary)" }}>
                                                    {formatDateBR(item.data_lancamento)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                        {isReceita ? (
                                                            <ArrowUpCircle className="size-3.5" style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <ArrowDownCircle className="size-3.5" style={{ color: "#dc2626" }} />
                                                        )}
                                                        <span style={{ color: isReceita ? "#16a34a" : "#dc2626" }}>
                                                            {isReceita ? "Receita" : "Despesa"}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.categoria ? (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{
                                                                backgroundColor: item.categoria.cor ? `${item.categoria.cor}20` : "rgba(44,32,27,0.08)",
                                                                color: item.categoria.cor || "var(--brand-primary)",
                                                            }}
                                                        >
                                                            {item.categoria.cor && <span className="size-2 rounded-full" style={{ backgroundColor: item.categoria.cor }} />}
                                                            {item.categoria.nome}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: "var(--brand-primary)" }} title={item.descricao}>
                                                    {item.descricao}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--brand-primary)", opacity: 0.8 }}>
                                                    {item.conta_bancaria?.nome ?? "—"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--brand-primary)", opacity: 0.7 }}>
                                                    {item.centro_custo?.nome ?? "—"}
                                                </td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: isReceita ? "#16a34a" : "#dc2626" }}>
                                                    {isReceita ? "+" : "−"} {formatCurrency(Number(item.valor))}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.conciliado ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                            <CheckCircle2 className="size-3" /> Sim
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                            Não
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: origin.color }}>
                                                        <origin.icon className="size-3.5" />
                                                        <span className="truncate max-w-[120px]" title={origin.label}>{origin.label}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                            <span className="text-xs" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
                                {meta.total} registros — Página {meta.page} de {meta.totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); fetchData(page - 1) }}>Anterior</Button>
                                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => { setPage(p => p + 1); fetchData(page + 1) }}>Próxima</Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </PageLayout>
    )
}
