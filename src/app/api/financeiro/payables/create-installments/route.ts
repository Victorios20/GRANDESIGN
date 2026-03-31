import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createPayableInstallments, createPayableInstallmentSchema } from "@/actions/financeiro/payables/create"
import { ZodError } from "zod"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = createPayableInstallmentSchema.parse(body)
        const result = await createPayableInstallments(input, Number(session.user.id))
        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
