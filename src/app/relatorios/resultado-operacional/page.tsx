import { ssrJSON } from "@/lib/ssrFetch"
import ResultadoOperacionalClient from "./_components/ResultadoOperacionalClient"
import { startOfMonth, endOfMonth, format } from "date-fns"
import type { OperationalResult } from "@/types/financeiro"

export const dynamic = "force-dynamic"

interface CostCenterOption {
    id: number
    nome: string
}

export default async function OperationalResultPage() {
    const now = new Date()
    const period_start = format(startOfMonth(now), "yyyy-MM-dd")
    const period_end = format(endOfMonth(now), "yyyy-MM-dd")

    // Parallel fetch: Initial Report Data + Cost Centers
    // Note: ensure compare_previous=true for the initial view
    const [initialData, costCenters] = await Promise.all([
        ssrJSON<OperationalResult>(
            `/api/financeiro/reports/operational-result?period_start=${period_start}&period_end=${period_end}&compare_previous=true`
        ),
        ssrJSON<CostCenterOption[]>("/api/financeiro/centros-custo?active=true"),
    ])

    return (
        <ResultadoOperacionalClient
            initialData={initialData}
            costCenters={costCenters}
        />
    )
}
