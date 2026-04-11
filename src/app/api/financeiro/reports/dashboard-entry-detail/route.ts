import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardEntryDetailData } from "@/actions/financeiro/dashboard/dashboard-data"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const kind = searchParams.get("kind")
        const entryId = Number(searchParams.get("entry_id"))

        if ((kind !== "pagar" && kind !== "receber") || !Number.isInteger(entryId) || entryId <= 0) {
            return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
        }

        const detail = await getDashboardEntryDetailData(kind, entryId)
        return NextResponse.json(detail)
    } catch (error) {
        console.error("[Dashboard Entry Detail]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
