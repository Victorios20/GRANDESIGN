import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createTransaction } from "@/actions/financeiro/transactions/create-transaction"
import { transactionSchema } from "@/lib/validators/financial"
import { ZodError } from "zod"
import { parseDateOnlyInput } from "@/lib/date-only"

import { getTransactions, type TransactionOrderBy } from "@/actions/financeiro/transactions/get-transactions"
import { TipoLancamento } from "@prisma/client"

const TRANSACTION_ORDER_FIELDS = new Set([
    "data_lancamento",
    "data_competencia",
    "tipo",
    "categoria",
    "descricao",
    "conta_bancaria",
    "centro_custo",
    "valor",
    "status_conferencia",
    "created_at",
])

function parseBankIds(value: string | null) {
    if (!value) return []

    return value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0)
}

function parsePositiveInteger(value: string | null) {
    if (!value) return undefined

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)

        // Parse Query Params
        const page = Number(searchParams.get("page")) || 1
        const limit = Number(searchParams.get("limit")) || 20
        const transaction_id = parsePositiveInteger(searchParams.get("transaction_id"))
        const search = searchParams.get("search") ?? undefined
        const startDate = searchParams.get("startDate") ? parseDateOnlyInput(searchParams.get("startDate")) ?? undefined : undefined
        const endDate = searchParams.get("endDate") ? parseDateOnlyInput(searchParams.get("endDate")) ?? undefined : undefined
        const dateType = (searchParams.get("dateType") as "lancamento" | "competencia") || "lancamento"

        const conta_bancaria_id = searchParams.get("conta_bancaria_id") ? Number(searchParams.get("conta_bancaria_id")) : undefined
        const conta_bancaria_ids = parseBankIds(searchParams.get("conta_bancaria_ids"))
        const categoria_id = searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined
        const centro_custo_id = searchParams.get("centro_custo_id") ? Number(searchParams.get("centro_custo_id")) : undefined
        const cost_scope = searchParams.get("cost_scope") === "cost" ? "cost" : searchParams.get("cost_scope") === "expense" ? "expense" : undefined
        const tipo = searchParams.get("tipo") as TipoLancamento | undefined
        const orderByParam = searchParams.get("orderBy")
        const orderBy = orderByParam && TRANSACTION_ORDER_FIELDS.has(orderByParam) ? orderByParam as TransactionOrderBy : undefined
        const orderDir = searchParams.get("orderDir") === "asc" ? "asc" : "desc"

        const conciliadoParam = searchParams.get("conciliado")
        const conciliado = conciliadoParam === "true" ? true : conciliadoParam === "false" ? false : undefined

        const result = await getTransactions({
            page,
            limit,
            transaction_id,
            search,
            startDate,
            endDate,
            dateType,
            conta_bancaria_id,
            conta_bancaria_ids,
            categoria_id,
            centro_custo_id,
            cost_scope,
            tipo,
            conciliado,
            orderBy,
            orderDir,
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
