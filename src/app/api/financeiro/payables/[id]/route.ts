import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updatePayable, updatePayableSchema } from "@/actions/financeiro/payables/update"
import { prisma } from "@/lib/prisma"
import { OPEN_FINANCIAL_STATUSES } from "@/actions/financeiro/shared/open-status"
import { estornarIntegracaoFinanceiraPedido } from "@/actions/pedido_compra/manage-finance-integration"
import { ZodError } from "zod"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const payable = await prisma.contaPagar.findUnique({
        where: { id: Number(id) },
        include: {
            lancamentos: {
                orderBy: { data_lancamento: "asc" },
                select: {
                    id: true,
                    valor: true,
                    valor_juros: true,
                    valor_desconto: true,
                    descricao: true,
                    data_lancamento: true,
                    conferencia_sessoes: { select: { status: true } },
                },
            },
        },
    })

    if (!payable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    return NextResponse.json(payable)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id } = await params
        const body = await req.json()
        const input = updatePayableSchema.parse(body)
        const result = await updatePayable(Number(id), input)
        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Dados inválidos", issues: error.flatten() }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const contaId = Number(id)

    const payable = await prisma.contaPagar.findUnique({
        where: { id: contaId },
        select: {
            id: true,
            status: true,
            valor_pago: true,
            pedido_compra_id: true,
            lancamentos: { select: { id: true }, take: 1 },
        },
    })

    if (!payable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

    if (payable.pedido_compra_id !== null) {
        if (payable.status === "CANCELADO") {
            return NextResponse.json({ error: "A integração financeira desta conta já está cancelada." }, { status: 400 })
        }

        const result = await estornarIntegracaoFinanceiraPedido(payable.pedido_compra_id, Number(session.user.id))
        return NextResponse.json({
            success: true,
            mode: "purchase_order_integration_reversed",
            data: result,
            message: result.message,
        })
    }

    if (!OPEN_FINANCIAL_STATUSES.includes(payable.status as any)) {
        return NextResponse.json({ error: "Apenas contas em aberto podem ser excluídas." }, { status: 400 })
    }

    if (Number(payable.valor_pago) > 0) {
        return NextResponse.json({ error: "Conta com baixa parcial não pode ser excluída. Estorne o pagamento primeiro." }, { status: 400 })
    }

    if (payable.lancamentos.length > 0) {
        return NextResponse.json({ error: "Conta com lançamentos vinculados não pode ser excluída." }, { status: 400 })
    }

    await prisma.contaPagar.delete({ where: { id: contaId } })
    return NextResponse.json({ success: true })
}
