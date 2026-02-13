import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTransactions } from "@/actions/financeiro/transactions/get-transactions"
import { TipoLancamento } from "@prisma/client"
import { format } from "date-fns"

function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function getOriginLabel(item: {
    conta_pagar?: { descricao: string; fornecedor?: { nome: string } | null } | null
    conta_receber?: { descricao: string; cliente?: { nome: string } | null } | null
    transferencia?: { id: number } | null
}): string {
    if (item.conta_pagar) return `Conta a Pagar: ${item.conta_pagar.fornecedor?.nome ?? item.conta_pagar.descricao}`
    if (item.conta_receber) return `Conta a Receber: ${item.conta_receber.cliente?.nome ?? item.conta_receber.descricao}`
    if (item.transferencia) return `Transferência #${item.transferencia.id}`
    return "Manual"
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)

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
            page: 1,
            limit: 10000,
            startDate,
            endDate,
            dateType,
            conta_bancaria_id,
            categoria_id,
            centro_custo_id,
            tipo,
            conciliado,
        })

        const headers = ["Data", "Tipo", "Categoria", "Descrição", "Conta Bancária", "Centro de Custo", "Valor", "Conciliado", "Origem"]

        const rows = result.data.map((item) => [
            format(new Date(item.data_lancamento), "dd/MM/yyyy"),
            item.tipo === "RECEITA" ? "Receita" : "Despesa",
            item.categoria?.nome ?? "",
            item.descricao,
            item.conta_bancaria?.nome ?? "",
            item.centro_custo?.nome ?? "",
            Number(item.valor).toFixed(2).replace(".", ","),
            item.conciliado ? "Sim" : "Não",
            getOriginLabel(item),
        ])

        const csv = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) => row.map(escapeCSV).join(",")),
        ].join("\n")

        const bom = "\uFEFF"
        return new Response(bom + csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="transacoes_${format(new Date(), "yyyy-MM-dd")}.csv"`,
            },
        })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
