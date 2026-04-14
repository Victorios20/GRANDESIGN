import { ssrJSON } from "@/lib/ssrFetch"
import BalanceteClient from "./_components/BalanceteClient"
import { startOfMonth, endOfMonth, format } from "date-fns"
import type { BalanceteItem } from "../../../types/financeiro"

export const dynamic = "force-dynamic"

interface CostCenterOption {
    id: number
    nome: string
}

export default async function BalancetePage() {
    const now = new Date()
    const period_start = format(startOfMonth(now), "yyyy-MM-dd")
    const period_end = format(endOfMonth(now), "yyyy-MM-dd")

    // Parallel fetch: Initial Report Data + Cost Centers
    const [initialData, costCenters] = await Promise.all([
        ssrJSON<BalanceteItem[]>(
            `/api/financeiro/reports/balancete?period_start=${period_start}&period_end=${period_end}`
        ),
        ssrJSON<CostCenterOption[]>("/api/financeiro/centros-custo?active=true"),
    ])

    return (
        <BalanceteClient
            initialData={initialData}
            costCenters={costCenters}
        />
    )
}
