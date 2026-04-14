import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { ZodError } from "zod"
import { authOptions } from "@/lib/auth"
import { updateManualTransaction, updateManualTransactionSchema, deleteManualTransaction } from "@/actions/financeiro/transactions/manage-transactions"
import { requireRole } from "@/lib/rbac"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id } = await params
        const body = await req.json()
        const input = updateManualTransactionSchema.parse(body)
        const result = await updateManualTransaction(Number(id), input, Number(session.user.id))
        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Dados inválidos", issues: error.flatten() }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        await requireRole("ADMIN")
        
        const { id } = await params
        const result = await deleteManualTransaction(Number(id), Number(session.user.id))
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
