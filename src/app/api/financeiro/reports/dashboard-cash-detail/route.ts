import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardCashDetailData } from "@/actions/financeiro/dashboard/dashboard-data"
import { parseDashboardAccountIds } from "@/lib/financeiro-dashboard"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const accountIds = parseDashboardAccountIds(searchParams.get("account_ids"))
        const detail = await getDashboardCashDetailData(accountIds)
        return NextResponse.json(detail)
    } catch (error) {
        console.error("[Dashboard Cash Detail]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
