import { ssrJSON } from "@/lib/ssrFetch"
import DashboardFinanceiroClient from "./_components/DashboardFinanceiroClient"
import type { DashboardSummary } from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardFinanceiroPage() {
    const summary = await ssrJSON<DashboardSummary>("/api/financeiro/reports/dashboard-summary")

    return <DashboardFinanceiroClient data={summary} />
}
