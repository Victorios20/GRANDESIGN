import { NextResponse } from "next/server"
import { getCashFlowProjection } from "@/actions/financeiro/reports/get-cash-flow"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const scope_mode = searchParams.get("scope_mode") || undefined
    const start_date = searchParams.get("start_date") || undefined
    const period_start = searchParams.get("period_start") || undefined
    const period_end = searchParams.get("period_end") || undefined
    const days = searchParams.get("days") ? Number(searchParams.get("days")) : undefined
    const centro_custo_id = searchParams.get("centro_custo_id")

    try {
        const data = await getCashFlowProjection({
            scope_mode,
            start_date,
            period_start,
            period_end,
            days,
            centro_custo_id,
        })
        return NextResponse.json(data)
    } catch (error) {
        console.error("Error fetching cash flow:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
