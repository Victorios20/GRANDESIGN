import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardSummary } from "@/actions/financeiro/dashboard/get-dashboard-summary"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const summary = await getDashboardSummary()
        return NextResponse.json(summary)
    } catch (error) {
        console.error("[Dashboard Summary]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
