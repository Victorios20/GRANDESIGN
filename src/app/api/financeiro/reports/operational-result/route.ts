import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOperationalResult } from "@/actions/financeiro/reports/get-operational-result"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)

    // Default to current month if not specified
    const now = new Date()
    const defaultStart = format(startOfMonth(now), "yyyy-MM-dd")
    const defaultEnd = format(endOfMonth(now), "yyyy-MM-dd")

    const period_start = searchParams.get("period_start") || defaultStart
    const period_end = searchParams.get("period_end") || defaultEnd

    const costCenterParam = searchParams.get("cost_center_id")
    const cost_center_id = costCenterParam ? Number(costCenterParam) : undefined

    const compare_previous = searchParams.get("compare_previous") === "true"

    try {
        const result = await getOperationalResult({
            period_start,
            period_end,
            cost_center_id,
            compare_previous,
        })
        return NextResponse.json(result)
    } catch (error) {
        console.error("[Operational Result Report]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
