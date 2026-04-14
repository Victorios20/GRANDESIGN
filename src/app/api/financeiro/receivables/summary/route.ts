import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { parseDateOnlyInput } from "@/lib/date-only"
import { getReceivablesSummary, type GetReceivablesOptions } from "@/actions/financeiro/receivables/service"
import { StatusFinanceiro } from "@prisma/client"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)

        const filters: Omit<GetReceivablesOptions, "page" | "limit"> = {}

        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        if (startDate) filters.startDate = parseDateOnlyInput(startDate) ?? undefined
        if (endDate) filters.endDate = parseDateOnlyInput(endDate) ?? undefined

        const statusParam = searchParams.get("status")
        if (statusParam) {
            const statuses = statusParam.split(",").filter(Boolean) as StatusFinanceiro[]
            filters.status = statuses.length === 1 ? statuses[0] : statuses
        }

        const clienteId = searchParams.get("cliente_id")
        if (clienteId) filters.cliente_id = Number(clienteId)

        const categoriaId = searchParams.get("categoria_id")
        if (categoriaId) filters.categoria_id = Number(categoriaId)

        const centroCustoId = searchParams.get("centro_custo_id")
        if (centroCustoId) filters.centro_custo_id = Number(centroCustoId)

        const search = searchParams.get("search")
        if (search) filters.search = search

        const summary = await getReceivablesSummary(filters)
        return NextResponse.json(summary)
    } catch {
        return NextResponse.json({ error: "Erro ao buscar resumo" }, { status: 500 })
    }
}
