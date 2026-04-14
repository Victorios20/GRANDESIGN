import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardEvolutionData } from "@/actions/financeiro/dashboard/dashboard-data"
import {
    parseDashboardAccountIds,
    resolveDashboardChartWindow,
    resolveDashboardFilters,
} from "@/lib/financeiro-dashboard"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const filters = resolveDashboardFilters({
            period_preset: searchParams.get("period_preset"),
            period_start: searchParams.get("period_start"),
            period_end: searchParams.get("period_end"),
            account_ids: parseDashboardAccountIds(searchParams.get("account_ids")),
            analysis_status: searchParams.get("analysis_status"),
        })
        const chartWindow = resolveDashboardChartWindow(searchParams.get("chart_window"))

        const evolution = await getDashboardEvolutionData(filters, chartWindow)
        return NextResponse.json(evolution)
    } catch (error) {
        console.error("[Dashboard Evolution]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
