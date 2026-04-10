import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getReceivables, type ReceivableOrderBy } from "@/actions/financeiro/receivables/service"
import { StatusFinanceiro } from "@prisma/client"

const RECEIVABLE_ORDER_FIELDS = new Set(["data_vencimento", "cliente", "descricao", "categoria", "valor_total", "status", "created_at"])

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
    const cliente_id = searchParams.get("cliente_id") ? Number(searchParams.get("cliente_id")) : undefined
    const categoria_id = searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined
    const centro_custo_id = searchParams.get("centro_custo_id") ? Number(searchParams.get("centro_custo_id")) : undefined
    const search = searchParams.get("search") || undefined
    const orderByParam = searchParams.get("orderBy")
    const orderBy = orderByParam && RECEIVABLE_ORDER_FIELDS.has(orderByParam) ? orderByParam as ReceivableOrderBy : undefined
    const orderDir = searchParams.get("orderDir") === "asc" ? "asc" : "desc"

    const statusParam = searchParams.get("status")
    let status: StatusFinanceiro | StatusFinanceiro[] | undefined
    if (statusParam) {
        const arr = statusParam.split(",").filter(Boolean) as StatusFinanceiro[]
        status = arr.length === 1 ? arr[0] : arr
    }

    try {
        const result = await getReceivables({ page, limit, startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search, orderBy, orderDir })
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
