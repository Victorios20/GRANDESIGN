import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createTransaction } from "@/actions/financeiro/transactions/create-transaction"
import { transactionSchema } from "@/lib/validators/financial"
import { ZodError } from "zod"

import { getTransactions } from "@/actions/financeiro/transactions/get-transactions"
import { TipoLancamento } from "@prisma/client"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)

        // Parse Query Params
        const page = Number(searchParams.get("page")) || 1
        const limit = Number(searchParams.get("limit")) || 20
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
        const dateType = (searchParams.get("dateType") as "lancamento" | "competencia") || "lancamento"

        const conta_bancaria_id = searchParams.get("conta_bancaria_id") ? Number(searchParams.get("conta_bancaria_id")) : undefined
        const categoria_id = searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined
        const centro_custo_id = searchParams.get("centro_custo_id") ? Number(searchParams.get("centro_custo_id")) : undefined
        const tipo = searchParams.get("tipo") as TipoLancamento | undefined

        const conciliadoParam = searchParams.get("conciliado")
        const conciliado = conciliadoParam === "true" ? true : conciliadoParam === "false" ? false : undefined

        const result = await getTransactions({
            page,
            limit,
            startDate,
            endDate,
            dateType,
            conta_bancaria_id,
            categoria_id,
            centro_custo_id,
            tipo,
            conciliado
        })

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

        // Zod Parse
        const input = transactionSchema.parse(body)

        // Execute Service (passing user ID)
        const result = await createTransaction(input, Number(session.user.id))

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
