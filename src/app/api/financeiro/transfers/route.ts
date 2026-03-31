import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createTransfer, transferSchema } from "@/actions/financeiro/transfers/create-transfer"
import { getTransfers } from "@/actions/financeiro/transfers/get-transfers"
import { ZodError } from "zod"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    const conta_id = searchParams.get("conta_id") ? Number(searchParams.get("conta_id")) : undefined

    try {
        const result = await getTransfers({ page, limit, conta_id })
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = transferSchema.parse(body)
        const result = await createTransfer(input, Number(session.user.id))
        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
