import { addDays, startOfDay } from "date-fns"
import { ssrJSON } from "@/lib/ssrFetch"
import ContasReceberPageClient from "./_components/ContasReceberPageClient"
import type {
    BankOption,
    CategoryOption,
    CentroCustoOption,
    ClientOption,
    FinancialSummary,
    PaginatedResponse,
    ReceivableListItem,
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

    if (search) query.set("search", search)
    if (status) query.set("status", status)
    if (categoriaId) query.set("categoria_id", categoriaId)
    if (centroCustoId) query.set("centro_custo_id", centroCustoId)

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

export default async function ContasReceberPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const initialQuery = buildInitialQuery(resolvedSearchParams)

    const [listData, summary, banks, categories, centrosCusto, clients] = await Promise.all([
        ssrJSON<PaginatedResponse<ReceivableListItem>>(`/api/financeiro/receivables?${initialQuery}`),
        ssrJSON<FinancialSummary>(`/api/financeiro/receivables/summary?${initialQuery}`),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
        ssrJSON<{ dados: ClientOption[] }>("/api/clientes?perPage=200&ordem=nome_asc"),
    ])

    return (
        <ContasReceberPageClient
            initialData={listData}
            initialSummary={summary}
            banks={banks}
            categories={categories.filter((category) => category.tipo === "RECEITA")}
            centrosCusto={centrosCusto}
            clients={clients.dados}
            initialFilters={{
                search: getParam(resolvedSearchParams, "search") ?? "",
                status: getParam(resolvedSearchParams, "status") ?? (getParam(resolvedSearchParams, "scope") === "overdue" ? "ATRASADO" : ""),
                categoriaId: getParam(resolvedSearchParams, "categoria_id") ?? "all",
                centroCustoId: getParam(resolvedSearchParams, "centro_custo_id") ?? "all",
                scope: getParam(resolvedSearchParams, "scope") ?? "",
                compose: getParam(resolvedSearchParams, "compose") === "1",
            }}
        />
    )
}
