import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardSummary } from "@/actions/financeiro/dashboard/get-dashboard-summary"
import { parseDashboardAccountIds, resolveDashboardFilters } from "@/lib/financeiro-dashboard"

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

        const summary = await getDashboardSummary(filters)
        return NextResponse.json(summary)
    } catch (error) {
        console.error("[Dashboard Summary]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
