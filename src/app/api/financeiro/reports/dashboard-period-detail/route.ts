import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardPeriodDetailData } from "@/actions/financeiro/dashboard/dashboard-data"
import { parseDashboardAccountIds, resolveDashboardFilters } from "@/lib/financeiro-dashboard"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const periodStart = searchParams.get("detail_start")
        const periodEnd = searchParams.get("detail_end")

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ error: "detail_start e detail_end são obrigatórios." }, { status: 400 })
        }

        const filters = resolveDashboardFilters({
            period_preset: searchParams.get("period_preset"),
            period_start: searchParams.get("period_start"),
            period_end: searchParams.get("period_end"),
            account_ids: parseDashboardAccountIds(searchParams.get("account_ids")),
            analysis_status: searchParams.get("analysis_status"),
        })

        const detail = await getDashboardPeriodDetailData(filters, periodStart, periodEnd)
        return NextResponse.json(detail)
    } catch (error) {
        console.error("[Dashboard Period Detail]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
