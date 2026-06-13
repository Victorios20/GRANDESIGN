import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateReceivable, updateReceivableSchema } from "@/actions/financeiro/receivables/update"
import { prisma } from "@/lib/prisma"
import { OPEN_FINANCIAL_STATUSES } from "@/actions/financeiro/shared/open-status"
import { isAdminOrDev } from "@/lib/rbac"
import { ZodError } from "zod"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const receivable = await prisma.contaReceber.findUnique({
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

    if (!receivable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    return NextResponse.json(receivable)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id } = await params
        const body = await req.json()
        const input = updateReceivableSchema.parse(body)
        const result = await updateReceivable(Number(id), input)
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

    const { id } = await params
    const contaId = Number(id)

    const force = new URL(req.url).searchParams.get("force") === "1"

    const receivable = await prisma.contaReceber.findUnique({
        where: { id: contaId },
        select: {
            id: true,
            status: true,
            valor_recebido: true,
            lancamentos: { select: { id: true }, take: 1 },
        },
    })

    if (!receivable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

    // Exclusão forçada (ADMIN/DEV): apaga lançamentos e a conta, mesmo recebida/parcial.
    if (force) {
        if (!(await isAdminOrDev())) {
            return NextResponse.json({ error: "Apenas ADMIN/DEV podem forçar a exclusão." }, { status: 403 })
        }
        await prisma.$transaction(async (tx) => {
            await tx.lancamento.deleteMany({ where: { conta_receber_id: contaId } })
            await tx.contaReceber.delete({ where: { id: contaId } })
        })
        return NextResponse.json({ success: true, forced: true })
    }

    if (!OPEN_FINANCIAL_STATUSES.includes(receivable.status as any)) {
        return NextResponse.json({ error: "Apenas contas em aberto podem ser excluídas." }, { status: 400 })
    }

    if (Number(receivable.valor_recebido) > 0) {
        return NextResponse.json({ error: "Conta com baixa parcial não pode ser excluída. Estorne o recebimento primeiro." }, { status: 400 })
    }

    if (receivable.lancamentos.length > 0) {
        return NextResponse.json({ error: "Conta com lançamentos vinculados não pode ser excluída." }, { status: 400 })
    }

    await prisma.contaReceber.delete({ where: { id: contaId } })
    return NextResponse.json({ success: true })
}
