import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { closeConferenceSession, closeConferenceSessionSchema } from "@/actions/financeiro/transactions/manage-transactions"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id } = await params
        const body = await req.json().catch(() => ({}))
        const input = closeConferenceSessionSchema.parse(body)
        const result = await closeConferenceSession(Number(id), Number(session.user.id), input)
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
