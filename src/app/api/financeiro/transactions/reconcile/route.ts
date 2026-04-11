import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bulkConfirmTransactions } from "@/actions/financeiro/transactions/manage-transactions"

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const ids: number[] = body.ids

        const result = await bulkConfirmTransactions(ids, Number(session.user.id))

        return NextResponse.json({ updated: result.count })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
