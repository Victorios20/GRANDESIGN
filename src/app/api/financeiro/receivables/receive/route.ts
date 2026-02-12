import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { receiveBill, receiveBillSchema } from "@/actions/financeiro/receivables/receive"
import { ZodError } from "zod"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = receiveBillSchema.parse(body)
        const result = await receiveBill(input, Number(session.user.id))
        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
