import { ssrJSON } from "@/lib/ssrFetch"
import LancamentosPageClient from "./_components/LancamentosPageClient"
import type { PaginatedResponse, TransactionListItem, BankOption, CategoryOption, CentroCustoOption } from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LancamentosPage() {
    const [listData, banks, categories, centrosCusto] = await Promise.all([
        ssrJSON<PaginatedResponse<TransactionListItem>>("/api/financeiro/transactions?page=1&limit=50"),
        ssrJSON<BankOption[]>("/api/financeiro/bancos"),
        ssrJSON<CategoryOption[]>("/api/financeiro/categories?format=flat"),
        ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo"),
    ])

    return (
        <LancamentosPageClient
            initialData={listData}
            banks={banks}
            categories={categories}
            centrosCusto={centrosCusto}
        />
    )
}
