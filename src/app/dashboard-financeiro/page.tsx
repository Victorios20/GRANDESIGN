import { ssrJSON } from "@/lib/ssrFetch"
import DashboardFinanceiroClient from "./_components/DashboardFinanceiroClient"
import type { DashboardSummary } from "@/types/financeiro"
import { buildDashboardSearchParams, resolveDashboardFilters } from "@/lib/financeiro-dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export default async function DashboardFinanceiroPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const filters = resolveDashboardFilters({
        period_preset: getParam(resolvedSearchParams, "period_preset"),
        period_start: getParam(resolvedSearchParams, "period_start"),
        period_end: getParam(resolvedSearchParams, "period_end"),
        account_ids: [],
        analysis_status: getParam(resolvedSearchParams, "analysis_status"),
    })
    const summaryQuery = buildDashboardSearchParams(filters).toString()

    const summary = await ssrJSON<DashboardSummary>(`/api/financeiro/reports/dashboard-summary?${summaryQuery}`)

    return <DashboardFinanceiroClient data={summary} />
}
