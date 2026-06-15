import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ssrJSON } from "@/lib/ssrFetch"
import { isOperationalFinancialCategory } from "@/lib/financial/fixed-category-taxonomy"
import LancamentosPageClient from "./_components/LancamentosPageClient"
import type {
    BankOption,
    CashFlowSettings,
    CategoryOption,
    CentroCustoOption,
    PaginatedResponse,
    TransactionListItem,
} from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

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

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

function parseCsvParam(value?: string) {
    if (!value) return []

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

function parsePositiveIntegerParam(value?: string) {
    if (!value) return undefined

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function buildInitialQuery(params: Record<string, string | string[] | undefined>) {
    const query = new URLSearchParams()
    query.set("page", getParam(params, "page") ?? "1")
    query.set("limit", getParam(params, "limit") ?? "50")

    const search = getParam(params, "search")
    const startDate = getParam(params, "startDate")
    const endDate = getParam(params, "endDate")
    const dateType = getParam(params, "dateType")
    const contaBancariaId = getParam(params, "conta_bancaria_id")
    const contaBancariaIds = getParam(params, "conta_bancaria_ids")
    const categoriaId = getParam(params, "categoria_id")
    const centroCustoId = getParam(params, "centro_custo_id")
    const transactionId = getParam(params, "transaction_id")
    const costScope = getParam(params, "cost_scope")
    const tipo = getParam(params, "tipo")
    const conciliado = getParam(params, "conciliado")
    const orderBy = getParam(params, "orderBy")
    const orderDir = getParam(params, "orderDir")

    if (search) query.set("search", search)
    if (startDate) query.set("startDate", startDate)
    if (endDate) query.set("endDate", endDate)
    if (dateType) query.set("dateType", dateType)
    if (contaBancariaId) query.set("conta_bancaria_id", contaBancariaId)
    if (contaBancariaIds) query.set("conta_bancaria_ids", contaBancariaIds)
    if (categoriaId) query.set("categoria_id", categoriaId)
    if (centroCustoId) query.set("centro_custo_id", centroCustoId)
    if (transactionId) query.set("transaction_id", transactionId)
    if (costScope) query.set("cost_scope", costScope)
    if (tipo) query.set("tipo", tipo)
    if (conciliado) query.set("conciliado", conciliado)
    if (orderBy) query.set("orderBy", orderBy)
    if (orderDir) query.set("orderDir", orderDir)

    return query
}

function parseOrderBy(value?: string): TransactionSortBy | undefined {
    const allowed = new Set(["data_lancamento", "tipo", "categoria", "descricao", "conta_bancaria", "centro_custo", "valor", "status_conferencia", "created_at"])
    return value && allowed.has(value) ? value as TransactionSortBy : undefined
}

export default async function LancamentosPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const initialQuery = buildInitialQuery(resolvedSearchParams)
    const singleBankId = getParam(resolvedSearchParams, "conta_bancaria_id")
    const csvBankIds = parseCsvParam(getParam(resolvedSearchParams, "conta_bancaria_ids"))
    const initialBankIds = csvBankIds.length > 0 ? csvBankIds : singleBankId ? [singleBankId] : []
    const dateType = getParam(resolvedSearchParams, "dateType") === "competencia" ? "competencia" : "lancamento"
    const initialTransactionId = parsePositiveIntegerParam(getParam(resolvedSearchParams, "transaction_id"))

    const [listData, banks, categories, centrosCusto, cashFlowSettings] = await Promise.all([
        ssrJSON<PaginatedResponse<TransactionListItem>>(`/api/financeiro/transactions?${initialQuery}`),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
        ssrJSON<CashFlowSettings>("/api/financeiro/settings/cash-flow"),
    ])

    const session = await getServerSession(authOptions)
    const isAdmin = Boolean(session?.user?.roles?.includes("ADMIN"))

    return (
        <LancamentosPageClient
            isAdmin={isAdmin}
            initialData={listData}
            banks={banks}
            categories={categories.filter(isOperationalFinancialCategory)}
            centrosCusto={centrosCusto}
            closingDate={cashFlowSettings.closing_date}
            initialTransactionId={initialTransactionId}
            initialFilters={{
                search: getParam(resolvedSearchParams, "search") ?? "",
                contaBancariaId: initialBankIds.length === 1 ? initialBankIds[0] : "all",
                contaBancariaIds: initialBankIds,
                categoriaId: getParam(resolvedSearchParams, "categoria_id") ?? "all",
                centroCustoId: getParam(resolvedSearchParams, "centro_custo_id") ?? "all",
                costScope: getParam(resolvedSearchParams, "cost_scope") === "cost" ? "cost" : getParam(resolvedSearchParams, "cost_scope") === "expense" ? "expense" : "all",
                tipo: getParam(resolvedSearchParams, "tipo") ?? "all",
                conciliado: getParam(resolvedSearchParams, "conciliado") ?? "all",
                dateType,
                startDate: getParam(resolvedSearchParams, "startDate") ?? "",
                endDate: getParam(resolvedSearchParams, "endDate") ?? "",
                orderBy: parseOrderBy(getParam(resolvedSearchParams, "orderBy")),
                orderDir: getParam(resolvedSearchParams, "orderDir") === "asc" ? "asc" : "desc",
            }}
        />
    )
}



