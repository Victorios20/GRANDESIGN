import { NextResponse } from "next/server"
import { getBalanceteReport } from "@/actions/financeiro/reports/get-balancete"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const period_start = searchParams.get("period_start")
    const period_end = searchParams.get("period_end")
    const cost_center_id = searchParams.get("cost_center_id")
    const show_empty = searchParams.get("show_empty") === "true"

    if (!period_start || !period_end) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    try {
        const data = await getBalanceteReport({
            period_start,
            period_end,
            cost_center_id,
            show_empty
        })
        return NextResponse.json(data)
    } catch (error) {
        console.error("Error fetching balancete:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
