import { ssrJSON } from "@/lib/ssrFetch"
import ContasReceberPageClient from "./_components/ContasReceberPageClient"
import type { PaginatedResponse, ReceivableListItem, FinancialSummary, BankOption, CategoryOption, CentroCustoOption } from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ContasReceberPage() {
    const [listData, summary, banks, categories, centrosCusto] = await Promise.all([
        ssrJSON<PaginatedResponse<ReceivableListItem>>("/api/financeiro/receivables?page=1&limit=50"),
        ssrJSON<FinancialSummary>("/api/financeiro/receivables/summary"),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
    ])

    return (
        <ContasReceberPageClient
            initialData={listData}
            initialSummary={summary}
            banks={banks}
            categories={categories.filter(c => c.tipo === "RECEITA")}
            centrosCusto={centrosCusto}
        />
    )
}
