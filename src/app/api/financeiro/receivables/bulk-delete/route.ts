import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OPEN_FINANCIAL_STATUSES } from "@/actions/financeiro/shared/open-status"

const bulkDeleteSchema = z.object({
    conta_ids: z.array(z.number().int().positive()).min(1),
})

function getRejectedIds(requestedIds: number[], records: { id: number }[]) {
    const foundIds = new Set(records.map((record) => record.id))
    return requestedIds.filter((id) => !foundIds.has(id))
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = bulkDeleteSchema.parse(body)
        const receivables = await prisma.contaReceber.findMany({
            where: {
                id: { in: input.conta_ids },
                status: { in: [...OPEN_FINANCIAL_STATUSES] },
            },
            select: {
                id: true,
                valor_recebido: true,
                orcamento_id: true,
                lancamentos: {
                    select: { id: true },
                    take: 1,
                },
            },
        })

        const rejectedIds = getRejectedIds(input.conta_ids, receivables)
        if (rejectedIds.length > 0) {
            return NextResponse.json(
                { error: "Algumas contas não podem ser excluídas.", rejectedIds },
                { status: 400 }
            )
        }

        const blockedIds = receivables
            .filter((receivable) => Number(receivable.valor_recebido) > 0 || receivable.lancamentos.length > 0 || receivable.orcamento_id !== null)
            .map((receivable) => receivable.id)

        if (blockedIds.length > 0) {
            return NextResponse.json(
                { error: "Existem contas com recebimento parcial, lançamentos ou vínculo operacional.", rejectedIds: blockedIds },
                { status: 400 }
            )
        }

        const result = await prisma.contaReceber.deleteMany({
            where: { id: { in: input.conta_ids } },
        })

        return NextResponse.json({ success: true, processedCount: result.count })
    } catch (error) {
        const message = error instanceof z.ZodError ? "Dados inválidos para exclusão em lote." : (error as Error).message
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
