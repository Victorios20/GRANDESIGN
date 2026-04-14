import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { TipoLancamento } from "@prisma/client"

import { authOptions } from "@/lib/auth"
import { parseDateOnlyInput } from "@/lib/date-only"
import { getTransactionsSummary } from "@/actions/financeiro/transactions/get-transactions"

function parseBankIds(value: string | null) {
    if (!value) return []

    return value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0)
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)

        const startDate = searchParams.get("startDate") ? parseDateOnlyInput(searchParams.get("startDate")) ?? undefined : undefined
        const endDate = searchParams.get("endDate") ? parseDateOnlyInput(searchParams.get("endDate")) ?? undefined : undefined
        const dateType = (searchParams.get("dateType") as "lancamento" | "competencia") || "lancamento"
        const search = searchParams.get("search") ?? undefined
        const conta_bancaria_id = searchParams.get("conta_bancaria_id") ? Number(searchParams.get("conta_bancaria_id")) : undefined
        const conta_bancaria_ids = parseBankIds(searchParams.get("conta_bancaria_ids"))
        const categoria_id = searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined
        const centro_custo_id = searchParams.get("centro_custo_id") ? Number(searchParams.get("centro_custo_id")) : undefined
        const cost_scope = searchParams.get("cost_scope") === "cost" ? "cost" : searchParams.get("cost_scope") === "expense" ? "expense" : undefined
        const tipo = searchParams.get("tipo") as TipoLancamento | undefined
        const conciliadoParam = searchParams.get("conciliado")
        const conciliado = conciliadoParam === "true" ? true : conciliadoParam === "false" ? false : undefined

        const summary = await getTransactionsSummary({
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
        })

        return NextResponse.json(summary)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
