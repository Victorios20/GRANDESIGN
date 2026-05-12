"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import {
    CheckCheck,
    ChevronDown,
    ChevronsLeft,
    ChevronsRight,
    ExternalLink,
    History,
    MoreHorizontal,
    Plus,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react"
import { toast } from "sonner"

import { AccountBalanceStrip } from "@/components/financeiro/AccountBalanceStrip"
import { SortableHeader } from "@/components/financeiro/SortableHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { PageLayout } from "@/components/ui/pageLayout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"
import { Textarea } from "@/components/ui/textarea"
import { parseDateOnlyInput, toDateOnlyValue } from "@/lib/date-only"
import {
    operationalListChipClass,
    operationalListChipRemoveButtonClass,
    operationalListControlClass,
    operationalListGhostButtonClass,
    operationalListIconButtonClass,
    operationalListMutedButtonClass,
    operationalListPageBackgroundClass,
    operationalListPaginationInfoClass,
    operationalListPaginationNavButtonClass,
    operationalListPaginationNumberButtonActiveClass,
    operationalListPaginationNumberButtonClass,
    operationalListPrimaryButtonClass,
    operationalListSearchInputClass,
    operationalListSelectionToolbarClass,
    operationalListShellClass,
    operationalListSubtleButtonClass,
    operationalListSubtlePanelClass,
    operationalListTableHeadCellClass,
    operationalListTableHeadClass,
    operationalListTableHeadRowClass,
    operationalListTableRowClass,
} from "@/components/ui/operational-list-styles"
import { formatCurrency, formatDateBR } from "@/lib/financeiro-utils"
import { cn } from "@/lib/utils"
import type {
    BankOption,
    CashFlowSettings,
    CategoryOption,
    CentroCustoOption,
    ConferenceAccountContext,
    PaginatedResponse,
    TransactionListItem,
} from "@/types/financeiro"

import ConferenceHistorySheet from "./ConferenceHistorySheet"
import TransactionEditorDialog from "./TransactionEditorDialog"

interface Props {
    initialData: PaginatedResponse<TransactionListItem>
    banks: BankOption[]
    categories: CategoryOption[]
    centrosCusto: CentroCustoOption[]
    closingDate?: CashFlowSettings["closing_date"]
    initialTransactionId?: number
    initialFilters?: {
        search: string
        contaBancariaId: string
        contaBancariaIds?: string[]
        categoriaId: string
        centroCustoId: string
        costScope?: "all" | "expense" | "cost"
        tipo: string
        conciliado: string
        dateType?: "lancamento" | "competencia"
        startDate: string
        endDate: string
        orderBy?: TransactionSortBy
        orderDir?: SortDirection
    }
    isAdmin?: boolean
}

const PAGE_SIZE_OPTIONS = ["25", "50", "100"] as const
type SortDirection = "asc" | "desc"
type TransactionSortBy =
    | "data_lancamento"
    | "tipo"
    | "categoria"
    | "descricao"
    | "conta_bancaria"
    | "centro_custo"
    | "valor"
    | "status_conferencia"
    | "created_at"

const DEFAULT_SORT_DIRECTIONS: Record<TransactionSortBy, SortDirection> = {
    data_lancamento: "desc",
    tipo: "asc",
    categoria: "asc",
    descricao: "asc",
    conta_bancaria: "asc",
    centro_custo: "asc",
    valor: "desc",
    status_conferencia: "asc",
    created_at: "desc",
}

function getOriginMeta(item: TransactionListItem) {
    if (item.conta_pagar) {
        return {
            kind: "linked" as const,
            label: "Conta a Pagar",
            href: `/contas-pagar?search=${encodeURIComponent(item.conta_pagar.descricao)}`,
            helper: "Este lançamento deve ser editado na origem",
        }
    }

    if (item.conta_receber) {
        return {
            kind: "linked" as const,
            label: "Conta a Receber",
            href: `/contas-receber?search=${encodeURIComponent(item.conta_receber.descricao)}`,
            helper: "Este lançamento deve ser editado na origem",
        }
    }

    if (item.transferencia) {
        return {
            label: `Transferência #${item.transferencia.id}`,
            href: null,
        }
    }

    return {
        label: "Manual",
        href: null,
    }
}

function getConferenceStatusLabel(item: TransactionListItem) {
    if (item.status_conferencia === "CONFERIDO") return "Conferido"
    if (item.status_conferencia === "PENDENCIA") return "Com pendência"
    return "Pendente"
}

function getVisiblePages(currentPage: number, totalPages: number) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

    const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
    return Array.from(pages)
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((left, right) => left - right)
}

function ReviewMetric({
    label,
    value,
    compact = false,
}: {
    label: string
    value: string
    compact?: boolean
}) {
    return (
        <div className={compact ? "space-y-1" : "space-y-1.5"}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b705f]">
                {label}
            </p>
            <p className="text-sm font-semibold text-[#2c201b]">{value}</p>
        </div>
    )
}

export default function LancamentosPageClient({
    initialData,
    banks,
    categories,
    centrosCusto,
    closingDate = null,
    initialTransactionId,
    initialFilters,
    isAdmin = false,
}: Props) {
    const inheritedBankFilterIds =
        initialFilters?.contaBancariaIds?.filter((value) => value && value !== "all") ??
        (initialFilters?.contaBancariaId && initialFilters.contaBancariaId !== "all"
            ? [initialFilters.contaBancariaId]
            : [])

    const [data, setData] = useState(initialData.data)
    const [meta, setMeta] = useState(initialData.meta)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [search, setSearch] = useState(initialFilters?.search ?? "")
    const [contaBancariaId, setContaBancariaId] = useState<string>(
        inheritedBankFilterIds.length === 1 ? inheritedBankFilterIds[0] : "all"
    )
    const [bankFilterIds, setBankFilterIds] = useState<string[]>(inheritedBankFilterIds)
    const [categoriaId, setCategoriaId] = useState<string>(initialFilters?.categoriaId ?? "all")
    const [centroCustoId, setCentroCustoId] = useState<string>(initialFilters?.centroCustoId ?? "all")
    const [costScope, setCostScope] = useState<"all" | "expense" | "cost">(initialFilters?.costScope ?? "all")
    const [tipoFilter, setTipoFilter] = useState<string>(initialFilters?.tipo ?? "all")
    const [conciliadoFilter, setConciliadoFilter] = useState<string>(initialFilters?.conciliado ?? "all")
    const [dateType, setDateType] = useState<"lancamento" | "competencia">(
        initialFilters?.dateType === "competencia" ? "competencia" : "lancamento"
    )
    const initialStartDate = initialFilters?.startDate ? parseDateOnlyInput(initialFilters.startDate) : null
    const initialEndDate = initialFilters?.endDate ? parseDateOnlyInput(initialFilters.endDate) : null
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        initialStartDate
            ? {
                from: initialStartDate,
                to: initialEndDate ?? initialStartDate,
            }
            : undefined
    )
    const [page, setPage] = useState(initialData.meta.page)
    const [limit, setLimit] = useState(initialData.meta.limit)
    const [sortBy, setSortBy] = useState<TransactionSortBy>(initialFilters?.orderBy ?? "data_lancamento")
    const [sortOrder, setSortOrder] = useState<SortDirection>(initialFilters?.orderDir ?? "desc")
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [reconciling, setReconciling] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<TransactionListItem | null>(null)
    const [balancesCollapsed, setBalancesCollapsed] = useState(contaBancariaId === "all")
    const [conciliationPickerOpen, setConciliationPickerOpen] = useState(false)
    const [conciliationPickerMode, setConciliationPickerMode] = useState<"start" | "history">("start")
    const [conciliationBankId, setConciliationBankId] = useState<string>(
        inheritedBankFilterIds[0] ?? String(banks.find((bank) => bank.ativo)?.id ?? "")
    )

    const [reviewContext, setReviewContext] = useState<ConferenceAccountContext | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [historyBankId, setHistoryBankId] = useState("")
    const [historyBankName, setHistoryBankName] = useState("Conta")
    const [closeDialogOpen, setCloseDialogOpen] = useState(false)
    const [closeNote, setCloseNote] = useState("")
    const [sessionSubmitting, setSessionSubmitting] = useState(false)

    const searchTimeout = useRef<NodeJS.Timeout | null>(null)
    const reviewBarRef = useRef<HTMLDivElement | null>(null)
    const skippedTransactionInitialRefresh = useRef(false)
    const openedInitialTransaction = useRef(false)

    const buildParams = useCallback(
        (targetPage: number, targetLimit: number, options?: { bankIds?: string[] }) => {
            const params = new URLSearchParams()
            const effectiveBankFilterIds = options?.bankIds ?? bankFilterIds
            params.set("page", String(targetPage))
            params.set("limit", String(targetLimit))
            if (search.trim()) params.set("search", search.trim())
            if (effectiveBankFilterIds.length > 1) params.set("conta_bancaria_ids", effectiveBankFilterIds.join(","))
            if (effectiveBankFilterIds.length === 1) params.set("conta_bancaria_id", effectiveBankFilterIds[0])
            if (categoriaId !== "all") params.set("categoria_id", categoriaId)
            if (centroCustoId !== "all") params.set("centro_custo_id", centroCustoId)
            if (costScope !== "all") params.set("cost_scope", costScope)
            if (tipoFilter !== "all") params.set("tipo", tipoFilter)
            if (conciliadoFilter === "true") params.set("conciliado", "true")
            if (conciliadoFilter === "false") params.set("conciliado", "false")
            if (dateType !== "lancamento") params.set("dateType", dateType)
            if (dateRange?.from) {
                const startDate = toDateOnlyValue(dateRange.from)
                if (startDate) params.set("startDate", startDate)
            }
            if (dateRange?.to) {
                const endDate = toDateOnlyValue(dateRange.to)
                if (endDate) params.set("endDate", endDate)
            }
            params.set("orderBy", sortBy)
            params.set("orderDir", sortOrder)
            return params
        },
        [search, bankFilterIds, categoriaId, centroCustoId, costScope, tipoFilter, conciliadoFilter, dateType, dateRange, sortBy, sortOrder]
    )

    const refreshCurrentView = useCallback(
        async (
            targetPage = page,
            targetLimit = limit,
            options?: {
                bankIds?: string[]
                reviewBankId?: string
            }
        ) => {
            setLoading(true)
            setError("")

            try {
                const effectiveBankIds = options?.bankIds ?? bankFilterIds
                const reviewBankId =
                    options?.reviewBankId ??
                    (effectiveBankIds.length === 1 ? effectiveBankIds[0] : contaBancariaId)

                const listPromise = fetch(`/api/financeiro/transactions?${buildParams(targetPage, targetLimit, { bankIds: effectiveBankIds })}`, {
                    cache: "no-store",
                })

                const reviewPromise =
                    reviewBankId !== "all" && reviewBankId
                        ? fetch(
                            `/api/financeiro/transactions/sessions?conta_bancaria_id=${reviewBankId}`,
                            { cache: "no-store" }
                        )
                        : Promise.resolve(null)

                const [listResponse, reviewResponse] = await Promise.all([listPromise, reviewPromise])

                if (!listResponse.ok) {
                    const payload = (await listResponse.json().catch(() => null)) as { error?: string } | null
                    throw new Error(payload?.error ?? "Falha ao carregar transações")
                }

                const listPayload = (await listResponse.json()) as PaginatedResponse<TransactionListItem>
                setData(listPayload.data)
                setMeta(listPayload.meta)
                setSelectedIds(new Set())

                if (reviewResponse) {
                    if (!reviewResponse.ok) {
                        const payload = (await reviewResponse.json().catch(() => null)) as { error?: string } | null
                        throw new Error(payload?.error ?? "Falha ao carregar conferência")
                    }

                    const reviewPayload = (await reviewResponse.json()) as ConferenceAccountContext
                    setReviewContext(reviewPayload)
                } else {
                    setReviewContext(null)
                }
            } catch (requestError) {
                setError((requestError as Error).message || "Falha ao carregar transações")
            } finally {
                setLoading(false)
            }
        },
        [bankFilterIds, buildParams, contaBancariaId, limit, page]
    )

    useEffect(() => {
        if (contaBancariaId !== "all") {
            setBalancesCollapsed(false)
        }
    }, [contaBancariaId])

    useEffect(() => {
        if (initialTransactionId && !skippedTransactionInitialRefresh.current) {
            skippedTransactionInitialRefresh.current = true
            return
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setPage(1)
            void refreshCurrentView(1, limit)
        }, 250)

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current)
        }
    }, [initialTransactionId, search, bankFilterIds, categoriaId, centroCustoId, costScope, tipoFilter, conciliadoFilter, dateType, dateRange, limit, refreshCurrentView])

    useEffect(() => {
        if (!initialTransactionId || openedInitialTransaction.current) return

        const initialItem = data.find((item) => item.id === initialTransactionId)
        if (!initialItem) return

        openedInitialTransaction.current = true
        setSelectedItem(initialItem)
        setEditorOpen(true)
    }, [data, initialTransactionId])

    const activeSession = reviewContext?.active_session ?? null
    const latestClosedSession = reviewContext?.latest_closed_session ?? null
    const selectedBank = contaBancariaId === "all" ? null : banks.find((bank) => String(bank.id) === contaBancariaId) ?? null
    const activeConferenceBankName = activeSession?.conta_bancaria_nome ?? selectedBank?.nome ?? "Conta"
    const reviewStateLabel = activeSession
        ? activeSession.status === "REOPENED"
            ? "Revisão reaberta"
            : "Conferência em andamento"
        : latestClosedSession
            ? "Última revisão encerrada"
            : "Sem revisão"

    const selectedBankReview =
        contaBancariaId === "all" || !selectedBank
            ? null
            : {
                pendingCount: reviewContext?.account_backlog_total ?? 0,
                reviewStateLabel,
            }

    const sortedData = useMemo(() => {
        if (!activeSession || contaBancariaId === "all") return data

        const selectedBankId = Number(contaBancariaId)
        const openedAt = new Date(activeSession.criada_em).getTime()

        return [...data]
            .map((item, index) => {
                const isSessionItem = item.conferencia_sessao_id === activeSession.id
                const isNewAfterOpen =
                    item.conta_bancaria?.id === selectedBankId &&
                    item.status_conferencia !== "CONFERIDO" &&
                    item.conferencia_sessao_id !== activeSession.id &&
                    new Date(item.created_at).getTime() > openedAt

                const rank = isSessionItem ? 0 : isNewAfterOpen ? 1 : 2
                return { item, index, rank }
            })
            .sort((left, right) => (left.rank === right.rank ? left.index - right.index : left.rank - right.rank))
            .map(({ item }) => item)
    }, [activeSession, contaBancariaId, data])

    const visiblePages = useMemo(() => getVisiblePages(meta.page, meta.totalPages), [meta.page, meta.totalPages])
    const advancedFilterCount = [
        tipoFilter !== "all",
        conciliadoFilter !== "all",
        categoriaId !== "all",
        centroCustoId !== "all",
    ].filter(Boolean).length

    const activeFilterChips = useMemo(() => {
        const chips: Array<{ key: string; label: string }> = []

        if (search.trim()) chips.push({ key: "search", label: `Busca: ${search.trim()}` })
        if (dateRange?.from) {
            const rangeLabel = dateRange.to
                ? `${formatDateBR(dateRange.from)} - ${formatDateBR(dateRange.to)}`
                : formatDateBR(dateRange.from)
            chips.push({ key: "period", label: `Período: ${rangeLabel}` })
        }
        if (dateType === "competencia") chips.push({ key: "date-type", label: "Base: Competência" })
        if (tipoFilter !== "all") chips.push({ key: "type", label: `Tipo: ${tipoFilter === "RECEITA" ? "Receita" : "Despesa"}` })
        if (conciliadoFilter !== "all") chips.push({ key: "reconciled", label: `Conciliação: ${conciliadoFilter === "true" ? "Conferidos" : "Não conferidos"}` })
        if (bankFilterIds.length > 0) {
            const bankLabels = bankFilterIds
                .map((value) => banks.find((bank) => String(bank.id) === value)?.nome)
                .filter(Boolean) as string[]
            const summary =
                bankLabels.length > 2 ? `${bankLabels.slice(0, 2).join(", ")} +${bankLabels.length - 2}` : bankLabels.join(", ")

            chips.push({
                key: "accounts",
                label: `${bankFilterIds.length > 1 ? "Contas" : "Conta"}: ${summary || "Selecionadas"}`,
            })
        }
        if (costScope !== "all") {
            chips.push({
                key: "cost-scope",
                label: `Escopo: ${costScope === "cost" ? "Custos" : "Despesas"}`,
            })
        }
        if (categoriaId !== "all") {
            const category = categories.find((item) => String(item.id) === categoriaId)
            chips.push({ key: "category", label: `Categoria: ${category?.nome ?? "Categoria"}` })
        }
        if (centroCustoId !== "all") {
            const centro = centrosCusto.find((item) => String(item.id) === centroCustoId)
            chips.push({ key: "cost-center", label: `Centro: ${centro?.nome ?? "Centro de custo"}` })
        }

        return chips
    }, [banks, bankFilterIds, categories, categoriaId, centroCustoId, centrosCusto, conciliadoFilter, costScope, dateRange, dateType, search, tipoFilter])

    const selectableRows = useMemo(() => {
        if (!activeSession) return sortedData.filter((item) => item.status_conferencia !== "CONFERIDO")
        return sortedData.filter((item) => item.conferencia_sessao_id === activeSession.id)
    }, [activeSession, sortedData])

    const allOnPageSelected =
        selectableRows.length > 0 && selectableRows.every((item) => selectedIds.has(item.id))

    const selectedCount = selectedIds.size
    const selectedTotal = useMemo(
        () =>
            sortedData
                .filter((item) => selectedIds.has(item.id))
                .reduce((total, item) => total + Number(item.valor), 0),
        [selectedIds, sortedData]
    )

    function openConciliationPicker(mode: "start" | "history") {
        setConciliationPickerMode(mode)
        setConciliationBankId(
            contaBancariaId !== "all"
                ? contaBancariaId
                : String(banks.find((bank) => bank.ativo)?.id ?? "")
        )
        setConciliationPickerOpen(true)
    }

    async function handleStartConference(bankId: string) {
        if (!bankId || bankId === "all") return

        setSessionSubmitting(true)
        try {
            const response = await fetch("/api/financeiro/transactions/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conta_bancaria_id: Number(bankId) }),
            })

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null
                throw new Error(payload?.error ?? "Falha ao iniciar conferência")
            }

            toast.success("Conciliação em andamento")
            setConciliationPickerOpen(false)
            setContaBancariaId(bankId)
            setBankFilterIds([bankId])
            setPage(1)
            await refreshCurrentView(1, limit, { bankIds: [bankId], reviewBankId: bankId })
            setTimeout(() => {
                reviewBarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }, 80)
        } catch (requestError) {
            toast.error((requestError as Error).message)
        } finally {
            setSessionSubmitting(false)
        }
    }

    function handleOpenHistory(bankId: string, bankName: string) {
        if (!bankId || bankId === "all") return

        setHistoryBankId(bankId)
        setHistoryBankName(bankName)
        setHistoryOpen(true)
        setConciliationPickerOpen(false)
    }

    async function handleCloseConference() {
        if (!activeSession) return

        setSessionSubmitting(true)
        try {
            const response = await fetch(`/api/financeiro/transactions/sessions/${activeSession.id}/close`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nota: closeNote.trim() || null }),
            })

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null
                throw new Error(payload?.error ?? "Falha ao encerrar revisão")
            }

            toast.success("Conciliação encerrada")
            setCloseDialogOpen(false)
            setCloseNote("")
            await refreshCurrentView(page, limit)
        } catch (requestError) {
            toast.error((requestError as Error).message)
        } finally {
            setSessionSubmitting(false)
        }
    }

    async function handleConferenceStatus(item: TransactionListItem, status: "CONFERIDO" | "PENDENCIA") {
        if (!activeSession || item.conferencia_sessao_id !== activeSession.id) return

        const pendenciaMotivo =
            status === "PENDENCIA"
                ? window.prompt("Descreva a pendência deste lançamento:")?.trim() ?? ""
                : null

        if (status === "PENDENCIA" && !pendenciaMotivo) return

        try {
            const response = await fetch(`/api/financeiro/transactions/${item.id}/conference`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    pendencia_motivo: pendenciaMotivo || null,
                }),
            })

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null
                throw new Error(payload?.error ?? "Falha ao atualizar conferência")
            }

            toast.success(status === "CONFERIDO" ? "Lançamento conferido" : "Pendência registrada")
            await refreshCurrentView(page, limit)
        } catch (requestError) {
            toast.error((requestError as Error).message)
        }
    }

    async function handleBulkConfirm() {
        if (selectedIds.size === 0) return

        setReconciling(true)
        try {
            const response = await fetch("/api/financeiro/transactions/reconcile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            })

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null
                throw new Error(payload?.error ?? "Falha ao marcar lançamentos")
            }

            toast.success("Lançamentos marcados como conferidos")
            await refreshCurrentView(page, limit)
        } catch (requestError) {
            toast.error((requestError as Error).message)
        } finally {
            setReconciling(false)
        }
    }

    function handleSelectAll() {
        if (allOnPageSelected) {
            setSelectedIds(new Set())
            return
        }

        setSelectedIds(new Set(selectableRows.map((item) => item.id)))
    }

    function handleToggleItem(id: number) {
        setSelectedIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function handleSort(column: TransactionSortBy) {
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

    function clearAllFilters() {
        setSearch("")
        setContaBancariaId("all")
        setBankFilterIds([])
        setDateRange(undefined)
        setCategoriaId("all")
        setCentroCustoId("all")
        setCostScope("all")
        setTipoFilter("all")
        setConciliadoFilter("all")
        setDateType("lancamento")
    }

    function removeFilterChip(key: string) {
        if (key === "search") setSearch("")
        if (key === "period") setDateRange(undefined)
        if (key === "date-type") setDateType("lancamento")
        if (key === "type") setTipoFilter("all")
        if (key === "reconciled") setConciliadoFilter("all")
        if (key === "accounts") {
            setContaBancariaId("all")
            setBankFilterIds([])
        }
        if (key === "cost-scope") setCostScope("all")
        if (key === "category") setCategoriaId("all")
        if (key === "cost-center") setCentroCustoId("all")
    }

    function handleOpenDetails(item: TransactionListItem) {
        setSelectedItem(item)
        setEditorOpen(true)
    }

    function handleCreateTransaction() {
        setSelectedItem(null)
        setEditorOpen(true)
    }

    const startRow = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
    const endRow = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total)

    return (
        <PageLayout title="Transações" links={[{ label: "Home", href: "/" }]} pageBackground={operationalListPageBackgroundClass}>
            <div className="space-y-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Transações</h1>
                        <p className="text-sm text-[#6f6556]">
                            {meta.total} transaç{meta.total === 1 ? "ão" : "ões"} na visualização atual
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            onClick={handleCreateTransaction}
                            className={cn(operationalListPrimaryButtonClass, "h-10 rounded-lg px-4 text-sm")}
                        >
                            <Plus className="mr-2 size-4" />
                            Incluir transação
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" className={cn(operationalListMutedButtonClass, "h-10 px-3")}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[220px]">
                                <DropdownMenuItem onClick={() => openConciliationPicker("start")}>
                                    Iniciar conciliação
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (selectedBank) {
                                            handleOpenHistory(String(selectedBank.id), selectedBank.nome)
                                            return
                                        }

                                        openConciliationPicker("history")
                                    }}
                                >
                                    Ver histórico
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </section>

                <AccountBalanceStrip
                    banks={banks.filter((bank) => bank.ativo)}
                    selectedBankId={contaBancariaId}
                    onSelectBank={(value) => {
                        setContaBancariaId(value)
                        setBankFilterIds(value === "all" ? [] : [value])
                        setPage(1)
                    }}
                    collapsed={balancesCollapsed}
                    onToggle={() => setBalancesCollapsed((current) => !current)}
                    selectedBankReview={selectedBankReview}
                />

                {activeSession ? (
                    <section ref={reviewBarRef} className={cn(operationalListShellClass, "border-[#d9e2d1] bg-[#fbfdf9] px-4 py-3")}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-[#2c201b]">Conciliação em andamento</p>
                                <p className="text-sm text-[#6f6556]">{activeSession.conta_bancaria_nome}</p>
                                <p className="text-xs text-[#7b705f]">
                                    Clique nos lançamentos para abrir detalhes, marcar como conferido ou registrar pendência.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                        handleOpenHistory(
                                            String(activeSession.conta_bancaria_id ?? contaBancariaId),
                                            activeConferenceBankName
                                        )
                                    }
                                    className={cn(operationalListGhostButtonClass, "gap-2")}
                                >
                                    <History className="size-4" />
                                    Ver histórico
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCloseDialogOpen(true)}
                                    className={operationalListSubtleButtonClass}
                                >
                                    Encerrar conciliação
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className={cn(operationalListShellClass, "space-y-3 px-4 py-4 md:px-5")}>
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7d69]" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar por descrição, categoria ou centro de custo"
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
                                    <SlidersHorizontal className="size-4" />
                                    Mais filtros
                                    {advancedFilterCount > 0 ? (
                                        <span
                                            className={cn(
                                                "inline-flex min-w-4 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                                showAdvancedFilters ? "bg-white text-[#2c201b]" : "bg-[#ebe4d4] text-[#6f6556]"
                                            )}
                                        >
                                            {advancedFilterCount}
                                        </span>
                                    ) : (
                                        <ChevronDown className={cn("size-4 opacity-50 transition-transform", showAdvancedFilters && "rotate-180")} />
                                    )}
                                </Button>

                                {activeFilterChips.length > 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={clearAllFilters}
                                        className={cn("px-3 text-sm", operationalListGhostButtonClass)}
                                    >
                                        <X className="mr-1 size-4" />
                                        Limpar filtros
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {activeFilterChips.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {activeFilterChips.map((chip) => (
                                    <Badge key={chip.key} variant="outline" className={cn(operationalListChipClass, "h-6")}>
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
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Tipo</label>
                                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                                        <SelectTrigger className={operationalListControlClass}>
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="RECEITA">Receita</SelectItem>
                                            <SelectItem value="DESPESA">Despesa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Conciliação</label>
                                    <Select value={conciliadoFilter} onValueChange={setConciliadoFilter}>
                                        <SelectTrigger className={operationalListControlClass}>
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="true">Conferidos</SelectItem>
                                            <SelectItem value="false">Não conferidos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Categoria financeira</label>
                                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                                        <SelectTrigger className={cn(operationalListControlClass, "w-full")}>
                                            <SelectValue placeholder="Todas as categorias" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as categorias</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={String(category.id)}>
                                                    {category.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Centro de custo</label>
                                    <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                                        <SelectTrigger className={cn(operationalListControlClass, "w-full")}>
                                            <SelectValue placeholder="Todos os centros" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os centros</SelectItem>
                                            {centrosCusto.map((centro) => (
                                                <SelectItem key={centro.id} value={String(centro.id)}>
                                                    {centro.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : null}

                        {selectedCount > 0 ? (
                            <div className={cn(operationalListSelectionToolbarClass, "flex flex-wrap items-center justify-between gap-3")}>
                                <div>
                                    <p className="text-sm font-medium text-[#2C201B]">Ação em lote</p>
                                    <p className="text-sm text-[#6F6556]">
                                        Use para concluir rapidamente os lançamentos já revisados.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm text-[#6F6556]">{selectedCount} selecionados</p>
                                        <p className="text-sm font-semibold text-[#2C201B]">
                                            Total selecionado: {formatCurrency(selectedTotal)}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBulkConfirm}
                                        disabled={reconciling}
                                        className={cn(operationalListMutedButtonClass, "gap-2")}
                                    >
                                        <CheckCheck className="size-4" />
                                        Marcar como conferido
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                </section>

                <section className={cn(operationalListShellClass, "overflow-hidden")}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-sm">
                            <thead className={operationalListTableHeadClass}>
                                <tr className={operationalListTableHeadRowClass}>
                                    <th className="w-12 px-4 py-3 text-left">
                                        <Checkbox
                                            checked={allOnPageSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Selecionar lançamentos"
                                        />
                                    </th>
                                    <SortableHeader column="data_lancamento" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Data
                                    </SortableHeader>
                                    <SortableHeader column="tipo" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Tipo
                                    </SortableHeader>
                                    <SortableHeader column="categoria" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Categoria
                                    </SortableHeader>
                                    <SortableHeader column="descricao" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Descrição
                                    </SortableHeader>
                                    <SortableHeader column="conta_bancaria" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Conta
                                    </SortableHeader>
                                    <SortableHeader column="centro_custo" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Centro de custo
                                    </SortableHeader>
                                    <SortableHeader column="valor" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Valor
                                    </SortableHeader>
                                    <SortableHeader column="status_conferencia" activeColumn={sortBy} direction={sortOrder} onSort={handleSort}>
                                        Conferência
                                    </SortableHeader>
                                    <th className={operationalListTableHeadCellClass}>Origem</th>
                                    <th className={operationalListTableHeadCellClass}>Opções</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-[#6f6556]">
                                            Carregando transações...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-[#B42318]">
                                            {error}
                                        </td>
                                    </tr>
                                ) : sortedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-[#6f6556]">
                                            Nenhuma transação encontrada para este recorte.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedData.map((item) => {
                                        const isReceita = item.tipo === "RECEITA"
                                        const originMeta = getOriginMeta(item)
                                        const isSessionItem = activeSession ? item.conferencia_sessao_id === activeSession.id : false
                                        const isNewAfterOpen =
                                            Boolean(activeSession) &&
                                            item.conta_bancaria?.id === Number(contaBancariaId) &&
                                            item.status_conferencia !== "CONFERIDO" &&
                                            item.conferencia_sessao_id !== activeSession?.id &&
                                            new Date(item.created_at).getTime() > new Date(activeSession!.criada_em).getTime()
                                        const selectable = activeSession ? isSessionItem : item.status_conferencia !== "CONFERIDO"

                                        return (
                                            <tr
                                                key={item.id}
                                                className={cn(
                                                    operationalListTableRowClass,
                                                    isSessionItem && "bg-[#fcfaf6]",
                                                    isNewAfterOpen && "bg-[#fffdf8]"
                                                )}
                                                onClick={() => handleOpenDetails(item)}
                                            >
                                                <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(item.id)}
                                                        disabled={!selectable}
                                                        onCheckedChange={() => handleToggleItem(item.id)}
                                                    />
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap text-[#2c201b]">
                                                    {formatDateBR(item.data_lancamento)}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <span className={cn("text-sm font-medium", isReceita ? "text-[#027A48]" : "text-[#B42318]")}>
                                                        {isReceita ? "Receita" : "Despesa"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    {item.categoria ? (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: item.categoria.cor ? `${item.categoria.cor}18` : "#f6f4ef",
                                                                color: item.categoria.cor || "#5f584c",
                                                            }}
                                                        >
                                                            {item.categoria.nome}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#6f6556]">â€”</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3.5 text-[#2c201b]">
                                                    <p className="max-w-[280px] truncate font-medium" title={item.descricao}>
                                                        {item.descricao}
                                                    </p>
                                                    {isSessionItem ? (
                                                        <p className="mt-1 text-xs text-[#6f6556]">Sessão atual</p>
                                                    ) : null}
                                                    {isNewAfterOpen ? (
                                                        <p className="mt-1 text-xs text-[#8a5b12]">
                                                            Nova movimentação após abertura da conferência
                                                        </p>
                                                    ) : null}
                                                    {item.pendencia_motivo ? (
                                                        <p className="mt-1 text-xs text-[#8a5b12]">
                                                            Pendência: {item.pendencia_motivo}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap text-[#6f6556]">
                                                    {item.conta_bancaria?.nome ?? "Não definida"}
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap text-[#6f6556]">
                                                    {item.centro_custo?.nome ?? "—"}
                                                </td>
                                                <td className={cn("px-3 py-3.5 whitespace-nowrap font-semibold", isReceita ? "text-[#027A48]" : "text-[#B42318]")}>
                                                    {isReceita ? "+" : "-"} {formatCurrency(item.valor)}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                                            item.status_conferencia === "CONFERIDO" && "bg-[#E8F5EE] text-[#027A48]",
                                                            item.status_conferencia === "PENDENCIA" && "bg-[#FFF3E8] text-[#B54708]",
                                                            item.status_conferencia === "PENDENTE" && "bg-[#F6F4EF] text-[#6F6556]"
                                                        )}
                                                    >
                                                        {getConferenceStatusLabel(item)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5 text-[#6f6556]">
                                                    {originMeta.href || originMeta.label.startsWith("Transferência") ? (
                                                        <span className="inline-flex items-center rounded-full border border-[#e4ddd0] bg-[#faf8f3] px-2 py-0.5 text-xs font-medium text-[#5f584c]">
                                                            {originMeta.label}
                                                        </span>
                                                    ) : originMeta.label === "Manual" ? (
                                                        <span className="text-xs text-[#9a8f7c]">Manual</span>
                                                    ) : null}
                                                </td>
                                                <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className={operationalListIconButtonClass}>
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="min-w-[240px]">
                                                            <DropdownMenuItem onClick={() => handleOpenDetails(item)}>
                                                                Abrir detalhes
                                                            </DropdownMenuItem>
                                                            {isSessionItem ? (
                                                                <DropdownMenuItem onClick={() => void handleConferenceStatus(item, "CONFERIDO")}>
                                                                    Marcar como conferido
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            {isSessionItem ? (
                                                                <DropdownMenuItem onClick={() => void handleConferenceStatus(item, "PENDENCIA")}>
                                                                    Registrar pendência
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            {originMeta.href ? (
                                                                <>
                                                                    <DropdownMenuItem disabled>
                                                                        Este lançamento deve ser editado na origem
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={originMeta.href}>
                                                                            <span className="inline-flex items-center gap-2">
                                                                                <ExternalLink className="size-4" />
                                                                                Abrir origem
                                                                            </span>
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                </>
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

                    <div className="flex flex-col gap-3 border-t border-[#e7e0d4] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <p className={operationalListPaginationInfoClass}>
                            Exibindo {startRow}-{endRow} de {meta.total} transações
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-[#6f6556]">Linhas por página</span>
                                <Select
                                    value={String(limit)}
                                    onValueChange={(value) => {
                                        const nextLimit = Number(value)
                                        setLimit(nextLimit)
                                        setPage(1)
                                    }}
                                >
                                    <SelectTrigger className={cn(operationalListControlClass, "h-8 w-[88px]")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZE_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-[#6f6556]">
                                    Página {meta.page} de {meta.totalPages || 1}
                                </span>

                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={meta.page <= 1 || loading}
                                        onClick={() => {
                                            setPage(1)
                                            void refreshCurrentView(1, limit)
                                        }}
                                        className={operationalListPaginationNavButtonClass}
                                    >
                                        <ChevronsLeft className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={meta.page <= 1 || loading}
                                        onClick={() => {
                                            const nextPage = meta.page - 1
                                            setPage(nextPage)
                                            void refreshCurrentView(nextPage, limit)
                                        }}
                                        className={operationalListPaginationNavButtonClass}
                                    >
                                        Anterior
                                    </Button>

                                    {visiblePages.map((pageNumber, index) => {
                                        const previousPage = visiblePages[index - 1]
                                        const showGap = previousPage && pageNumber - previousPage > 1

                                        return (
                                            <div key={pageNumber} className="flex items-center gap-1">
                                                {showGap ? <span className="px-1 text-sm text-[#7b705f]">â€¦</span> : null}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPage(pageNumber)
                                                        void refreshCurrentView(pageNumber, limit)
                                                    }}
                                                    className={cn(
                                                        operationalListPaginationNumberButtonClass,
                                                        pageNumber === meta.page && operationalListPaginationNumberButtonActiveClass
                                                    )}
                                                >
                                                    {pageNumber}
                                                </Button>
                                            </div>
                                        )
                                    })}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={meta.page >= meta.totalPages || loading}
                                        onClick={() => {
                                            const nextPage = meta.page + 1
                                            setPage(nextPage)
                                            void refreshCurrentView(nextPage, limit)
                                        }}
                                        className={operationalListPaginationNavButtonClass}
                                    >
                                        Próxima
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={meta.page >= meta.totalPages || loading}
                                        onClick={() => {
                                            setPage(meta.totalPages)
                                            void refreshCurrentView(meta.totalPages, limit)
                                        }}
                                        className={operationalListPaginationNavButtonClass}
                                    >
                                        <ChevronsRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <TransactionEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                item={selectedItem}
                banks={banks}
                categories={categories}
                centrosCusto={centrosCusto}
                conferenceMode={Boolean(activeSession)}
                closingDate={closingDate}
                isAdmin={isAdmin}
                reopenPeriodHref="/configuracoes/parametrizacoes"
                onSuccess={() => refreshCurrentView(page, limit)}
            />

            <ConferenceHistorySheet
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                bankId={historyBankId}
                bankName={historyBankName}
            />

            <Dialog open={conciliationPickerOpen} onOpenChange={setConciliationPickerOpen}>
                <DialogContent className="border-[#e8e1d6] bg-white sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#2c201b]">
                            {conciliationPickerMode === "start" ? "Iniciar conciliação" : "Ver histórico"}
                        </DialogTitle>
                        <DialogDescription className="text-[#6f6556]">
                            Escolha a conta para {conciliationPickerMode === "start" ? "iniciar a conciliação" : "abrir o histórico"}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#2c201b]">Conta bancária</label>
                        <Select value={conciliationBankId} onValueChange={setConciliationBankId}>
                            <SelectTrigger className={cn(operationalListControlClass, "w-full")}>
                                <SelectValue placeholder="Selecione uma conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {banks.filter((bank) => bank.ativo).map((bank) => (
                                    <SelectItem key={bank.id} value={String(bank.id)}>
                                        {bank.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setConciliationPickerOpen(false)}
                            className={operationalListGhostButtonClass}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                const chosenBank = banks.find((bank) => String(bank.id) === conciliationBankId)
                                if (!chosenBank) return

                                if (conciliationPickerMode === "history") {
                                    handleOpenHistory(String(chosenBank.id), chosenBank.nome)
                                    return
                                }

                                void handleStartConference(String(chosenBank.id))
                            }}
                            disabled={!conciliationBankId || sessionSubmitting}
                            className={operationalListSubtleButtonClass}
                        >
                            {conciliationPickerMode === "start" ? "Iniciar conciliação" : "Ver histórico"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                <DialogContent className="border-[#e8e1d6] bg-white sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#2c201b]">Encerrar conciliação</DialogTitle>
                        <DialogDescription className="text-[#6f6556]">
                            Revise o resumo antes de encerrar esta conciliação.
                        </DialogDescription>
                    </DialogHeader>

                    {activeSession ? (
                        <div className="space-y-4">
                            <div className={cn(operationalListSubtlePanelClass, "grid gap-3 px-3 py-3 sm:grid-cols-3")}>
                                <ReviewMetric label="Conferidos" value={String(activeSession.reviewed_count)} compact />
                                <ReviewMetric label="Com pendência" value={String(activeSession.pending_issue_count)} compact />
                                <ReviewMetric label="Não revisados" value={String(activeSession.not_reviewed_count)} compact />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[#2c201b]">Nota geral</label>
                                <Textarea
                                    value={closeNote}
                                    onChange={(event) => setCloseNote(event.target.value)}
                                    placeholder="Registre uma nota breve desta conciliação, se necessário."
                                    className="min-h-[96px] border-[#d9d3c8] bg-white text-[#2c201b] focus-visible:ring-[#393316]/15"
                                />
                            </div>

                            <div className="rounded-lg border border-[#ece6db] bg-[#faf8f3] px-3 py-3 text-sm text-[#6f6556]">
                                <p className="font-medium text-[#2c201b]">Impacto do encerramento</p>
                                <p className="mt-1">
                                    Os itens não revisados permanecem no backlog da conta e poderão entrar em uma nova conferência depois.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCloseDialogOpen(false)}
                            className={operationalListGhostButtonClass}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleCloseConference()}
                            disabled={!activeSession || sessionSubmitting}
                            className={operationalListSubtleButtonClass}
                        >
                            Encerrar conciliação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLayout>
    )
}







