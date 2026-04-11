import { addDays, startOfDay } from "date-fns"
import { ssrJSON } from "@/lib/ssrFetch"
import ContasPagarPageClient from "./_components/ContasPagarPageClient"
import type {
    BankOption,
    CategoryOption,
    CentroCustoOption,
    FinancialSummary,
    PaginatedResponse,
    PayableListItem,
    SupplierOption,
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

function buildInitialQuery(params: Record<string, string | string[] | undefined>) {
    const query = new URLSearchParams()
    query.set("page", "1")
    query.set("limit", "50")

    const search = getParam(params, "search")
    const status = getParam(params, "status")
    const categoriaId = getParam(params, "categoria_id")
    const centroCustoId = getParam(params, "centro_custo_id")
    const scope = getParam(params, "scope")
    const highlight = getParam(params, "highlight")

    if (search) query.set("search", search)
    if (status) query.set("status", status)
    if (categoriaId) query.set("categoria_id", categoriaId)
    if (centroCustoId) query.set("centro_custo_id", centroCustoId)
    if (highlight) query.set("highlight", highlight)

    const today = startOfDay(new Date())
    if (scope === "overdue" && !status) query.set("status", "ATRASADO")
    if (scope === "today") {
        query.set("startDate", today.toISOString())
        query.set("endDate", addDays(today, 1).toISOString())
    }
    if (scope === "next7") {
        query.set("startDate", today.toISOString())
        query.set("endDate", addDays(today, 7).toISOString())
    }

    return query
}

export default async function ContasPagarPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const initialQuery = buildInitialQuery(resolvedSearchParams)

    const [listData, summary, banks, categories, centrosCusto, suppliers] = await Promise.all([
        ssrJSON<PaginatedResponse<PayableListItem>>(`/api/financeiro/payables?${initialQuery}`),
        ssrJSON<FinancialSummary>(`/api/financeiro/payables/summary?${initialQuery}`),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
        ssrJSON<SupplierOption[]>("/api/fornecedores"),
    ])

    return (
        <ContasPagarPageClient
            initialData={listData}
            initialSummary={summary}
            banks={banks}
            categories={categories.filter((category) => category.tipo === "DESPESA")}
            centrosCusto={centrosCusto}
            suppliers={suppliers}
            initialFilters={{
                search: getParam(resolvedSearchParams, "search") ?? "",
                status: getParam(resolvedSearchParams, "status") ?? (getParam(resolvedSearchParams, "scope") === "overdue" ? "ATRASADO" : ""),
                categoriaId: getParam(resolvedSearchParams, "categoria_id") ?? "all",
                centroCustoId: getParam(resolvedSearchParams, "centro_custo_id") ?? "all",
                scope: getParam(resolvedSearchParams, "scope") ?? "",
                compose: getParam(resolvedSearchParams, "compose") === "1",
                highlight: getParam(resolvedSearchParams, "highlight") ?? null,
            }}
        />
    )
}
