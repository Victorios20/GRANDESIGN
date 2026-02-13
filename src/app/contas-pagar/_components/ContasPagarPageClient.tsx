"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { PageLayout } from "@/components/ui/pageLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"
import { StatusSelect } from "@/components/ui/StatusSelect"
import { Search, MoreHorizontal, DollarSign, Eye, Pencil, XCircle, AlertTriangle, Clock, CalendarCheck, TrendingDown, RefreshCw } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { formatCurrency, formatDateBR, FINANCIAL_STATUS_OPTIONS, canPay, canEdit, canCancel, remaining } from "@/lib/financeiro-utils"
import type { PaginatedResponse, PayableListItem, FinancialSummary, BankOption, CategoryOption, CentroCustoOption } from "@/types/financeiro"
import PaymentModal from "./PaymentModal"

interface Props {
    initialData: PaginatedResponse<PayableListItem>
    initialSummary: FinancialSummary
    banks: BankOption[]
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
}

export default function ContasPagarPageClient({ initialData, initialSummary, banks, categories, centrosCusto }: Props) {
    const [data, setData] = useState(initialData.data)
    const [meta, setMeta] = useState(initialData.meta)
    const [summary, setSummary] = useState(initialSummary)
    const [loading, setLoading] = useState(false)

    // Filters
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [categoriaId, setCategoriaId] = useState<string>("all")
    const [centroCustoId, setCentroCustoId] = useState<string>("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [page, setPage] = useState(1)

    // Modal
    const [payModalOpen, setPayModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<PayableListItem | null>(null)

    // Row highlight
    const [highlightedId, setHighlightedId] = useState<number | null>(null)

    const searchTimeout = useRef<NodeJS.Timeout | null>(null)

    const fetchData = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set("page", String(p))
            params.set("limit", "50")
            if (search) params.set("search", search)
            if (statusFilter.length > 0) params.set("status", statusFilter.join(","))
            if (categoriaId && categoriaId !== "all") params.set("categoria_id", categoriaId)
            if (centroCustoId && centroCustoId !== "all") params.set("centro_custo_id", centroCustoId)
            if (dateRange?.from) params.set("startDate", dateRange.from.toISOString())
            if (dateRange?.to) params.set("endDate", dateRange.to.toISOString())

            const [listRes, summaryRes] = await Promise.all([
                fetch(`/api/financeiro/payables?${params}`),
                fetch(`/api/financeiro/payables/summary?${params}`),
            ])

            if (listRes.ok) {
                const result = await listRes.json()
                setData(result.data)
                setMeta(result.meta)
            }
            if (summaryRes.ok) {
                setSummary(await summaryRes.json())
            }
        } catch {
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter, categoriaId, centroCustoId, dateRange, page])

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setPage(1)
            fetchData(1)
        }, 400)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [search, statusFilter, categoriaId, centroCustoId, dateRange])

    function handlePayClick(item: PayableListItem) {
        setSelectedItem(item)
        setPayModalOpen(true)
    }

    async function handlePaySuccess() {
        setPayModalOpen(false)
        if (selectedItem) {
            setHighlightedId(selectedItem.id)
            setTimeout(() => setHighlightedId(null), 2500)
        }
        toast.success("Pagamento registrado com sucesso!")
        await fetchData(page)
    }

    const summaryCards = [
        { label: "Total a Pagar", value: formatCurrency(summary.totalAmount), count: summary.totalPending, icon: TrendingDown, color: "var(--brand-primary)" },
        { label: "Vencidas", value: formatCurrency(summary.overdueAmount), count: summary.overdueCount, icon: AlertTriangle, color: "#b91c1c" },
        { label: "Vence Hoje", value: formatCurrency(summary.dueTodayAmount), count: summary.dueTodayCount, icon: Clock, color: "#d97706" },
        { label: "Próximos 7 dias", value: formatCurrency(summary.dueNext7Amount), count: summary.dueNext7Count, icon: CalendarCheck, color: "#2563eb" },
    ]

    return (
        <PageLayout title="Contas a Pagar">
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
                                <p className="text-xl font-bold" style={{ color: "var(--brand-primary)" }}>{card.value}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>{card.count} {card.count === 1 ? "conta" : "contas"}</p>
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
                                    <Input
                                        placeholder="Buscar por descrição..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="min-w-[180px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Status</label>
                                <StatusSelect
                                    options={FINANCIAL_STATUS_OPTIONS}
                                    value={statusFilter[0] || ""}
                                    onChange={(val) => setStatusFilter(val ? [val] : [])}
                                    staticVariant="pill"
                                    placeholder="Todos"
                                />
                            </div>

                            <div className="min-w-[180px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Vencimento</label>
                                <SmartDateRangePicker
                                    range={dateRange}
                                    onChange={(range) => setDateRange(range ?? undefined)}
                                />
                            </div>

                            <div className="min-w-[160px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Categoria</label>
                                <Select value={categoriaId} onValueChange={setCategoriaId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[160px]">
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--brand-primary)" }}>Centro de Custo</label>
                                <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {centrosCusto.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" size="icon" onClick={() => fetchData(page)} disabled={loading} title="Atualizar">
                                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border border-[var(--brand-primary)]/10 overflow-hidden" style={{ backgroundColor: "var(--brand-bg)" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                                    {["Descrição", "Fornecedor", "Categoria", "Vencimento", "Total", "Pago", "Saldo", "Status", "Parcela", "Ações"].map(h => (
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
                                            Nenhuma conta a pagar encontrada
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item) => {
                                        const saldo = remaining(item.valor_total, item.valor_pago)
                                        const isHighlighted = highlightedId === item.id
                                        return (
                                            <tr
                                                key={item.id}
                                                className="border-b transition-colors duration-500"
                                                style={{
                                                    borderColor: "rgba(44,32,27,0.06)",
                                                    backgroundColor: isHighlighted ? "rgba(34,197,94,0.12)" : "transparent",
                                                }}
                                            >
                                                <td className="px-4 py-3 font-medium" style={{ color: "var(--brand-primary)" }}>
                                                    {item.descricao}
                                                </td>
                                                <td className="px-4 py-3" style={{ color: "var(--brand-primary)", opacity: 0.8 }}>
                                                    {item.fornecedor?.nome ?? "—"}
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
                                                <td className="px-4 py-3" style={{ color: "var(--brand-primary)" }}>
                                                    {formatDateBR(item.data_vencimento)}
                                                </td>
                                                <td className="px-4 py-3 font-medium" style={{ color: "var(--brand-primary)" }}>
                                                    {formatCurrency(item.valor_total)}
                                                </td>
                                                <td className="px-4 py-3" style={{ color: "var(--brand-primary)", opacity: 0.7 }}>
                                                    {formatCurrency(item.valor_pago)}
                                                </td>
                                                <td className="px-4 py-3 font-semibold" style={{ color: saldo > 0 ? "#b91c1c" : "#16a34a" }}>
                                                    {formatCurrency(saldo)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusSelect
                                                        options={FINANCIAL_STATUS_OPTIONS}
                                                        value={item.status}
                                                        mode="static"
                                                        staticVariant="pill"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center" style={{ color: "var(--brand-primary)", opacity: 0.6 }}>
                                                    {item.parcela_atual}/{item.total_parcelas}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="size-8">
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {canPay(item.status) && (
                                                                <DropdownMenuItem onClick={() => handlePayClick(item)}>
                                                                    <DollarSign className="size-4 mr-2" /> Pagar
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem disabled>
                                                                <Eye className="size-4 mr-2" /> Ver Detalhes
                                                            </DropdownMenuItem>
                                                            {canEdit(item.status) && (
                                                                <DropdownMenuItem disabled>
                                                                    <Pencil className="size-4 mr-2" /> Editar
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canCancel(item.status) && (
                                                                <DropdownMenuItem className="text-red-600" disabled>
                                                                    <XCircle className="size-4 mr-2" /> Cancelar
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "rgba(44,32,27,0.1)" }}>
                            <span className="text-xs" style={{ color: "var(--brand-primary)", opacity: 0.5 }}>
                                {meta.total} registros — Página {meta.page} de {meta.totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); fetchData(page - 1) }}>
                                    Anterior
                                </Button>
                                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => { setPage(p => p + 1); fetchData(page + 1) }}>
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Payment Modal */}
            {selectedItem && (
                <PaymentModal
                    open={payModalOpen}
                    onOpenChange={setPayModalOpen}
                    item={selectedItem}
                    banks={banks}
                    onSuccess={handlePaySuccess}
                />
            )}
        </PageLayout>
    )
}
