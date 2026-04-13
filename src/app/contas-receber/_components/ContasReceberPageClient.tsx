"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import { addDays, startOfDay } from "date-fns"
import { ChevronDown, MoreHorizontal, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { toast } from "sonner"
import { PageLayout } from "@/components/ui/pageLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"
import { StatusSelect } from "@/components/ui/StatusSelect"
import ReceiveModal from "./ReceiveModal"
import ReceivableEditorDialog from "./ReceivableEditorDialog"
import BulkReceiveDialog from "./BulkReceiveDialog"
import BulkRescheduleDialog from "@/components/financeiro/BulkRescheduleDialog"
import BulkDeleteDialog from "@/components/financeiro/BulkDeleteDialog"
import { ListSummaryBar } from "@/components/financeiro/ListSummaryBar"
import { SortableHeader } from "@/components/financeiro/SortableHeader"
import { StatusTabs } from "@/components/financeiro/StatusTabs"
import { canPay, FINANCIAL_STATUS_OPTIONS, formatCurrency, formatDateBR, remaining } from "@/lib/financeiro-utils"
import type {
    BankOption,
    CategoryOption,
    CentroCustoOption,
    ClientOption,
    FinancialSummary,
    PaginatedResponse,
    ReceivableListItem,
} from "@/types/financeiro"
import { cn } from "@/lib/utils"
import {
    operationalListChipClass,
    operationalListChipRemoveButtonClass,
    operationalListControlClass,
    operationalListGhostButtonClass,
    operationalListMutedButtonClass,
    operationalListPaginationInfoClass,
    operationalListPaginationNavButtonClass,
    operationalListPrimaryButtonClass,
    operationalListSearchInputClass,
    operationalListShellClass,
    operationalListSubtleButtonClass,
    operationalListSubtlePanelClass,
    operationalListTableHeadCellClass,
    operationalListTableHeadClass,
    operationalListTableHeadRowClass,
    operationalListTableRowClass,
    operationalListSelectedRowClass,
} from "@/components/ui/operational-list-styles"

type ReceivableSortBy = "data_vencimento" | "cliente" | "descricao" | "categoria" | "valor_total" | "status" | "created_at"
type SortDirection = "asc" | "desc"
type FinancialStatusFilter = "todos" | "PENDENTE" | "PARCIAL" | "ATRASADO" | "PAGO" | "CANCELADO"

const STATUS_TABS: Array<{ value: FinancialStatusFilter; label: string }> = [
    { value: "todos", label: "Todos" },
    { value: "PENDENTE", label: "Pendente" },
    { value: "PARCIAL", label: "Parcial" },
    { value: "ATRASADO", label: "Atrasadas" },
    { value: "PAGO", label: "Recebidas" },
    { value: "CANCELADO", label: "Canceladas" },
]

const DEFAULT_SORT_DIRECTIONS: Record<ReceivableSortBy, SortDirection> = {
    data_vencimento: "desc",
    cliente: "asc",
    descricao: "asc",
    categoria: "asc",
    valor_total: "desc",
    status: "asc",
    created_at: "desc",
}

function isFinancialStatus(value: string): value is Exclude<FinancialStatusFilter, "todos"> {
    return ["PENDENTE", "PARCIAL", "ATRASADO", "PAGO", "CANCELADO"].includes(value)
}

interface InitialFilters {
    search: string
    status: string
    categoriaId: string
    centroCustoId: string
    scope: string
    compose: boolean
}

interface Props {
    initialData: PaginatedResponse<ReceivableListItem>
    initialSummary: FinancialSummary
    banks: BankOption[]
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
    clients: ClientOption[]
    initialFilters: InitialFilters
}

function getInitialDateRange(scope: string): DateRange | undefined {
    const today = startOfDay(new Date())
    if (scope === "today") return { from: today, to: today }
    if (scope === "next7") return { from: today, to: addDays(today, 7) }
    return undefined
}

export default function ContasReceberPageClient({
    initialData,
    initialSummary,
    banks,
    categories,
    centrosCusto,
    clients,
    initialFilters,
}: Props) {
    const [data, setData] = useState(initialData.data)
    const [meta, setMeta] = useState(initialData.meta)
    const [summary, setSummary] = useState(initialSummary)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [search, setSearch] = useState(initialFilters.search)
    const [statusFilter, setStatusFilter] = useState<FinancialStatusFilter>(
        initialFilters.status && isFinancialStatus(initialFilters.status) ? initialFilters.status : "todos"
    )
    const [categoriaId, setCategoriaId] = useState<string>(initialFilters.categoriaId)
    const [centroCustoId, setCentroCustoId] = useState<string>(initialFilters.centroCustoId)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(getInitialDateRange(initialFilters.scope))
    const [page, setPage] = useState(1)
    const [sortBy, setSortBy] = useState<ReceivableSortBy>("data_vencimento")
    const [sortOrder, setSortOrder] = useState<SortDirection>("desc")
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(
        initialFilters.categoriaId !== "all" || initialFilters.centroCustoId !== "all"
    )

    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [editorOpen, setEditorOpen] = useState(false)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [receiveModalOpen, setReceiveModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<ReceivableListItem | null>(null)
    const [highlightedId, setHighlightedId] = useState<number | null>(null)
    const composeHandled = useRef(false)
    const searchTimeout = useRef<NodeJS.Timeout | null>(null)

    const fetchData = useCallback(async (targetPage = page) => {
        setLoading(true)
        setError("")

        try {
            const params = new URLSearchParams()
            params.set("page", String(targetPage))
            params.set("limit", "50")
            if (search) params.set("search", search)
            if (statusFilter !== "todos") params.set("status", statusFilter)
            if (categoriaId !== "all") params.set("categoria_id", categoriaId)
            if (centroCustoId !== "all") params.set("centro_custo_id", centroCustoId)
            if (dateRange?.from) params.set("startDate", dateRange.from.toISOString())
            if (dateRange?.to) params.set("endDate", dateRange.to.toISOString())
            params.set("orderBy", sortBy)
            params.set("orderDir", sortOrder)

            const [listResponse, summaryResponse] = await Promise.all([
                fetch(`/api/financeiro/receivables?${params}`),
                fetch(`/api/financeiro/receivables/summary?${params}`),
            ])

            if (!listResponse.ok || !summaryResponse.ok) throw new Error("Falha ao carregar contas a receber")

            const listResult = await listResponse.json()
            const summaryResult = await summaryResponse.json()
            setData(listResult.data)
            setMeta(listResult.meta)
            setSummary(summaryResult)
            setSelectedIds([])
        } catch (requestError) {
            const message = (requestError as Error).message || "Falha ao carregar contas a receber"
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [categoriaId, centroCustoId, dateRange, page, search, sortBy, sortOrder, statusFilter])

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setPage(1)
            fetchData(1)
        }, 250)
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current)
        }
    }, [fetchData])

    useEffect(() => {
        if (!initialFilters.compose || composeHandled.current) return
        composeHandled.current = true
        setSelectedItem(null)
        setEditorOpen(true)
    }, [initialFilters.compose])

    function openCreateDialog() {
        setSelectedItem(null)
        setEditorOpen(true)
    }

    function openEditDialog(item: ReceivableListItem) {
        setSelectedItem(item)
        setEditorOpen(true)
    }

    function openReceiveModal(item: ReceivableListItem) {
        setSelectedItem(item)
        setReceiveModalOpen(true)
    }

    async function handleMutationSuccess(successMessage?: string) {
        if (selectedItem) {
            setHighlightedId(selectedItem.id)
            setTimeout(() => setHighlightedId(null), 2500)
        }
        if (successMessage) toast.success(successMessage)
        await fetchData(page)
    }

    async function handleReceiveSuccess() {
        setReceiveModalOpen(false)
        setEditorOpen(false)
        await handleMutationSuccess("Recebimento registrado")
    }

    function toggleRowSelection(id: number, checked: boolean) {
        setSelectedIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((itemId) => itemId !== id))
    }

    const receivableRows = useMemo(() => data.filter((item) => canPay(item.status)), [data])
    const allSelected = receivableRows.length > 0 && receivableRows.every((item) => selectedIds.includes(item.id))
    const selectedItems = useMemo(() => data.filter((item) => selectedIds.includes(item.id) && canPay(item.status)), [data, selectedIds])
    const selectedTotal = useMemo(
        () => selectedItems.reduce((total, item) => total + remaining(item.valor_total, item.valor_recebido), 0),
        [selectedItems]
    )
    const hasAdvancedFilters = categoriaId !== "all" || centroCustoId !== "all"
    const hasActiveFilters = hasAdvancedFilters || Boolean(search.trim()) || statusFilter !== "todos" || Boolean(dateRange?.from)
    const advancedFilterCount = [
        categoriaId !== "all",
        centroCustoId !== "all",
    ].filter(Boolean).length

    const activeFilterChips = useMemo(() => {
        const chips: Array<{ key: string; label: string }> = []

        if (search.trim()) chips.push({ key: "search", label: `Busca: ${search.trim()}` })

        if (statusFilter !== "todos") {
            const statusLabel = FINANCIAL_STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? statusFilter
            chips.push({ key: "status", label: `Status: ${statusLabel}` })
        }

        if (dateRange?.from) {
            const rangeLabel = dateRange.to
                ? `${formatDateBR(dateRange.from)} - ${formatDateBR(dateRange.to)}`
                : formatDateBR(dateRange.from)
            chips.push({ key: "period", label: `Período: ${rangeLabel}` })
        }

        if (categoriaId !== "all") {
            const categoryLabel = categories.find((category) => String(category.id) === categoriaId)?.nome ?? "Categoria"
            chips.push({ key: "category", label: `Categoria: ${categoryLabel}` })
        }

        if (centroCustoId !== "all") {
            const centroLabel = centrosCusto.find((centro) => String(centro.id) === centroCustoId)?.nome ?? "Centro de custo"
            chips.push({ key: "cost-center", label: `Centro: ${centroLabel}` })
        }

        return chips
    }, [categories, categoriaId, centroCustoId, centrosCusto, dateRange, search, statusFilter])

    function clearAllFilters() {
        setSearch("")
        setStatusFilter("todos")
        setDateRange(undefined)
        setCategoriaId("all")
        setCentroCustoId("all")
    }

    function removeFilterChip(key: string) {
        if (key === "search") setSearch("")
        if (key === "status") setStatusFilter("todos")
        if (key === "period") setDateRange(undefined)
        if (key === "category") setCategoriaId("all")
        if (key === "cost-center") setCentroCustoId("all")
    }

    function handleSort(column: ReceivableSortBy) {
        setPage(1)
        setSortBy((current) => {
            if (current === column) {
                setSortOrder((direction) => direction === "asc" ? "desc" : "asc")
                return current
            }
            setSortOrder(DEFAULT_SORT_DIRECTIONS[column])
            return column
        })
    }

    const statusTabItems = STATUS_TABS.map((item) => ({
        ...item,
        count: summary.statusCounts?.[item.value] ?? 0,
    }))

    return (
        <PageLayout title="Contas a Receber" links={[{ label: "Home", href: "/" }]} pageBackground="bg-[#F7F4EE]">
            <div className="space-y-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Contas a Receber</h1>
                        <p className="text-sm text-[#6f6556]">
                            {meta.total} conta{meta.total === 1 ? "" : "s"} na visualização atual
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                            type="button"
                            className={cn(operationalListPrimaryButtonClass, "h-10 rounded-lg px-4 text-sm")}
                            onClick={openCreateDialog}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Conta
                        </Button>
                    </div>
                </section>

                <section className={cn(operationalListShellClass, "space-y-3 px-4 py-4 md:px-5")}>
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por número, descrição ou cliente"
                                className={operationalListSearchInputClass}
                            />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
                            <div className="min-w-[200px] h-10">
                                <SmartDateRangePicker
                                    range={dateRange}
                                    onChange={(range) => setDateRange(range ?? undefined)}
                                    variant="operational"
                                    className="h-full w-full"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAdvancedFilters((current) => !current)}
                                className={cn(
                                    "gap-2 px-3 text-sm",
                                    operationalListSubtleButtonClass,
                                    "h-10",
                                    showAdvancedFilters && "border-[#c9bea4] bg-[#f2ead8] text-[#2c201b]"
                                )}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                Mais filtros
                                {advancedFilterCount > 0 ? (
                                    <span className={cn(
                                        "inline-flex min-w-4 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                        showAdvancedFilters ? "bg-white text-[#2c201b]" : "bg-[#ebe4d4] text-[#6f6556]"
                                    )}>
                                        {advancedFilterCount}
                                    </span>
                                ) : (
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                )}
                            </Button>

                            {hasActiveFilters ? (
                                <Button type="button" variant="ghost" onClick={clearAllFilters} className={cn("px-3 text-sm", operationalListGhostButtonClass)}>
                                    <X className="mr-1 size-4" />
                                    Limpar filtros
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {activeFilterChips.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {activeFilterChips.map((chip) => (
                                <Badge
                                    key={chip.key}
                                    variant="outline"
                                    className={cn(operationalListChipClass, "h-6")}
                                >
                                    {chip.label}
                                    <button
                                        type="button"
                                        onClick={() => removeFilterChip(chip.key)}
                                        className={operationalListChipRemoveButtonClass}
                                        aria-label={`Remover filtro ${chip.label}`}
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : null}

                    {showAdvancedFilters ? (
                        <div className={cn(operationalListSubtlePanelClass, "grid gap-3 px-3 py-3 lg:grid-cols-2 lg:items-end")}>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Categoria financeira</label>
                                <Select value={categoriaId} onValueChange={setCategoriaId}>
                                    <SelectTrigger className={operationalListControlClass}>
                                        <SelectValue placeholder="Todas as categorias" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as categorias</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>{category.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Centro de custo</label>
                                <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                                    <SelectTrigger className={operationalListControlClass}>
                                        <SelectValue placeholder="Todos os centros" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os centros</SelectItem>
                                        {centrosCusto.map((centro) => (
                                            <SelectItem key={centro.id} value={String(centro.id)}>{centro.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : null}
                </section>

                <StatusTabs value={statusFilter} items={statusTabItems} onValueChange={setStatusFilter} />

                <ListSummaryBar
                    countLabel={`${meta.total} conta${meta.total === 1 ? "" : "s"} na listagem atual`}
                    totalLabel={`Total do filtro: ${formatCurrency(summary.filterOpenAmount ?? 0)}`}
                    selectedCountLabel={selectedItems.length > 0 ? `${selectedItems.length} selecionada${selectedItems.length === 1 ? "" : "s"}` : undefined}
                    selectedTotalLabel={selectedItems.length > 0 ? `Total selecionado: ${formatCurrency(selectedTotal)}` : undefined}
                    actions={selectedItems.length > 0 ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" className={cn("gap-2", operationalListMutedButtonClass)}>
                                    Ações em lote
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[220px]">
                                <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                                    Receber selecionadas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkRescheduleOpen(true)}>
                                    Alterar vencimento
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setBulkDeleteOpen(true)}
                                    className="text-[#8F3F37] focus:text-[#8F3F37]"
                                >
                                    Excluir selecionadas
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : undefined}
                />

                <section className={cn(operationalListShellClass, "overflow-hidden")}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className={operationalListTableHeadClass}>
                                <tr className={operationalListTableHeadRowClass}>
                                    <th className={cn(operationalListTableHeadCellClass, "w-12")}>
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={(checked) => setSelectedIds(checked ? receivableRows.map((item) => item.id) : [])}
                                            aria-label="Selecionar contas"
                                        />
                                    </th>
                                    <SortableHeader column="data_vencimento" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Vencimento
                                    </SortableHeader>
                                    <SortableHeader column="cliente" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Cliente
                                    </SortableHeader>
                                    <SortableHeader column="descricao" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Descrição
                                    </SortableHeader>
                                    <SortableHeader column="categoria" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Categoria
                                    </SortableHeader>
                                    <SortableHeader column="valor_total" activeColumn={sortBy} direction={sortOrder} onSort={handleSort} align="right">
                                        Valor total
                                    </SortableHeader>
                                    <SortableHeader column="status" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Status
                                    </SortableHeader>
                                    <th className={operationalListTableHeadCellClass}>Opções</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-[#2C201B]/55">Carregando contas...</td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-[#B42318]">{error}</td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-[#2C201B]/55">Nenhuma conta para este recorte.</td>
                                    </tr>
                                ) : (
                                    data.map((item) => {
                                        const saldo = remaining(item.valor_total, item.valor_recebido)
                                        const isSelected = selectedIds.includes(item.id)
                                        const isHighlighted = highlightedId === item.id
                                        const isSelectable = canPay(item.status)
                                        return (
                                            <tr
                                                key={item.id}
                                                className={cn(
                                                    operationalListTableRowClass,
                                                    "cursor-pointer",
                                                    (isSelected || isHighlighted) && operationalListSelectedRowClass
                                                )}
                                                onClick={() => openEditDialog(item)}
                                            >
                                                <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        disabled={!isSelectable}
                                                        onCheckedChange={(checked) => toggleRowSelection(item.id, checked === true)}
                                                    />
                                                </td>
                                                <td className="px-3 py-3.5 text-[#2C201B]">
                                                    <p className="font-medium">{formatDateBR(item.data_vencimento)}</p>
                                                    <p className="text-xs text-[#2C201B]/50">{item.parcela_atual}/{item.total_parcelas}</p>
                                                </td>
                                                <td className="px-3 py-3.5 text-[#2C201B]/78">{item.cliente?.nome ?? "Sem cliente"}</td>
                                                <td className="px-3 py-3.5 text-[#2C201B]">
                                                    <p className="font-medium">{item.descricao}</p>
                                                    <p className="text-xs text-[#2C201B]/50">Saldo {formatCurrency(saldo)}</p>
                                                </td>
                                                <td className="px-3 py-3.5 text-[#2C201B]/78">{item.categoria?.nome ?? "Sem categoria"}</td>
                                                <td className="px-3 py-3.5 text-[#2C201B]">
                                                    <p className="font-semibold">{formatCurrency(item.valor_total)}</p>
                                                    {item.valor_recebido > 0 ? <p className="text-xs text-[#2C201B]/50">Recebido {formatCurrency(item.valor_recebido)}</p> : null}
                                                </td>
                                                <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                    <StatusSelect options={FINANCIAL_STATUS_OPTIONS} value={item.status} mode="static" staticVariant="pill" />
                                                </td>
                                                <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className="size-8">
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEditDialog(item)}>Abrir detalhes</DropdownMenuItem>
                                                            {canPay(item.status) ? (
                                                                <DropdownMenuItem onClick={() => openReceiveModal(item)}>Registrar recebimento</DropdownMenuItem>
                                                            ) : null}
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

                    {meta.totalPages > 1 ? (
                        <div className="flex items-center justify-between border-t border-[#e7e0d4] px-4 py-3">
                            <span className={operationalListPaginationInfoClass}>
                                {meta.total} registros - página {meta.page} de {meta.totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className={operationalListPaginationNavButtonClass} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
                                <Button type="button" variant="outline" size="sm" className={operationalListPaginationNavButtonClass} disabled={page >= meta.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>

            <ReceivableEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                item={selectedItem}
                categories={categories}
                centrosCusto={centrosCusto}
                clients={clients}
                onSuccess={() => handleMutationSuccess()}
                onRequestReceive={openReceiveModal}
            />

            {selectedItem ? (
                <ReceiveModal
                    open={receiveModalOpen}
                    onOpenChange={setReceiveModalOpen}
                    item={selectedItem}
                    banks={banks}
                    onSuccess={handleReceiveSuccess}
                />
            ) : null}

            <BulkReceiveDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                banks={banks}
                selectedIds={selectedItems.map((item) => item.id)}
                selectedTotal={selectedTotal}
                onSuccess={() => handleMutationSuccess()}
            />

            <BulkRescheduleDialog
                open={bulkRescheduleOpen}
                onOpenChange={setBulkRescheduleOpen}
                endpoint="/api/financeiro/receivables/bulk-reschedule"
                selectedIds={selectedItems.map((item) => item.id)}
                selectedCount={selectedItems.length}
                title="Alterar vencimento em lote"
                description="Atualize a data de vencimento das contas selecionadas em uma única operação."
                dateLabel="Novo vencimento"
                confirmLabel="Salvar vencimento"
                successMessage="Vencimento atualizado em lote"
                onSuccess={() => handleMutationSuccess()}
            />

            <BulkDeleteDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                endpoint="/api/financeiro/receivables/bulk-delete"
                selectedIds={selectedItems.map((item) => item.id)}
                selectedCount={selectedItems.length}
                title="Excluir contas selecionadas"
                description="Use essa ação apenas para lançamentos abertos sem recebimento parcial nem vínculo operacional."
                confirmLabel="Excluir contas"
                successMessage="Contas excluídas em lote"
                onSuccess={() => handleMutationSuccess()}
            />
        </PageLayout>
    )
}
