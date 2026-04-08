import { ssrJSON } from "@/lib/ssrFetch"
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
    const costScope = getParam(params, "cost_scope")
    const tipo = getParam(params, "tipo")
    const conciliado = getParam(params, "conciliado")

    if (search) query.set("search", search)
    if (startDate) query.set("startDate", startDate)
    if (endDate) query.set("endDate", endDate)
    if (dateType) query.set("dateType", dateType)
    if (contaBancariaId) query.set("conta_bancaria_id", contaBancariaId)
    if (contaBancariaIds) query.set("conta_bancaria_ids", contaBancariaIds)
    if (categoriaId) query.set("categoria_id", categoriaId)
    if (centroCustoId) query.set("centro_custo_id", centroCustoId)
    if (costScope) query.set("cost_scope", costScope)
    if (tipo) query.set("tipo", tipo)
    if (conciliado) query.set("conciliado", conciliado)

    return query
}

export default async function LancamentosPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const initialQuery = buildInitialQuery(resolvedSearchParams)
    const singleBankId = getParam(resolvedSearchParams, "conta_bancaria_id")
    const csvBankIds = parseCsvParam(getParam(resolvedSearchParams, "conta_bancaria_ids"))
    const initialBankIds = csvBankIds.length > 0 ? csvBankIds : singleBankId ? [singleBankId] : []
    const dateType = getParam(resolvedSearchParams, "dateType") === "competencia" ? "competencia" : "lancamento"

    const [listData, banks, categories, centrosCusto, cashFlowSettings] = await Promise.all([
        ssrJSON<PaginatedResponse<TransactionListItem>>(`/api/financeiro/transactions?${initialQuery}`),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
        ssrJSON<CashFlowSettings>("/api/financeiro/settings/cash-flow"),
    ])

    return (
        <LancamentosPageClient
            initialData={listData}
            banks={banks}
            categories={categories}
            centrosCusto={centrosCusto}
            closingDate={cashFlowSettings.closing_date}
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
            }}
        />
    )
}
