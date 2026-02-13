import { ssrJSON } from "@/lib/ssrFetch"
import ContasPagarPageClient from "./_components/ContasPagarPageClient"
import type { PaginatedResponse, PayableListItem, FinancialSummary, BankOption, CategoryOption, CentroCustoOption } from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ContasPagarPage() {
    const [listData, summary, banks, categories, centrosCusto] = await Promise.all([
        ssrJSON<PaginatedResponse<PayableListItem>>("/api/financeiro/payables?page=1&limit=50"),
        ssrJSON<FinancialSummary>("/api/financeiro/payables/summary"),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
    ])

    return (
        <ContasPagarPageClient
            initialData={listData}
            initialSummary={summary}
            banks={banks}
            categories={categories.filter(c => c.tipo === "DESPESA")}
            centrosCusto={centrosCusto}
        />
    )
}
