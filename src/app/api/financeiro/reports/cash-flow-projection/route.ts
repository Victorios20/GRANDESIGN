import { NextResponse } from "next/server"
import { getCashFlowProjection } from "@/actions/financeiro/reports/get-cash-flow"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    // Parse params
    const start_date = searchParams.get("start_date") || undefined
    const days = searchParams.get("days") ? Number(searchParams.get("days")) : undefined
    const centro_custo_id = searchParams.get("centro_custo_id")
    const conta_bancaria_id = searchParams.get("conta_bancaria_id")

    try {
        const data = await getCashFlowProjection({
            start_date,
            days,
            centro_custo_id,
            conta_bancaria_id
        })
        return NextResponse.json(data)
    } catch (error) {
        console.error("Error fetching cash flow:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
