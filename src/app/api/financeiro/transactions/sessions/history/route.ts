import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { ZodError } from "zod"
import { authOptions } from "@/lib/auth"
import { conferenceSessionCreateSchema, listConferenceSessionHistory } from "@/actions/financeiro/transactions/manage-transactions"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const input = conferenceSessionCreateSchema.parse({
            conta_bancaria_id: Number(searchParams.get("conta_bancaria_id")),
        })

        const result = await listConferenceSessionHistory(input.conta_bancaria_id)
        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Dados inválidos", issues: error.flatten() }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
