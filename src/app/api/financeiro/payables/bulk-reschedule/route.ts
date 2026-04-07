import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OPEN_FINANCIAL_STATUSES, resolveOpenFinancialStatus } from "@/actions/financeiro/shared/open-status"
import { syncPedidoCompraValorRealizadoInTransaction } from "@/actions/pedido_compra/manage-finance-integration"

const bulkRescheduleSchema = z.object({
    conta_ids: z.array(z.number().int().positive()).min(1),
    data_vencimento: z.coerce.date(),
})

function getRejectedIds(requestedIds: number[], records: { id: number }[]) {
    const foundIds = new Set(records.map((record) => record.id))
    return requestedIds.filter((id) => !foundIds.has(id))
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = bulkRescheduleSchema.parse(body)
        const payables = await prisma.contaPagar.findMany({
            where: {
                id: { in: input.conta_ids },
                status: { in: [...OPEN_FINANCIAL_STATUSES] },
            },
            select: { id: true, status: true, pedido_compra_id: true },
        })

        const rejectedIds = getRejectedIds(input.conta_ids, payables)
        if (rejectedIds.length > 0) {
            return NextResponse.json(
                { error: "Algumas contas não podem ter o vencimento alterado.", rejectedIds },
                { status: 400 }
            )
        }

        await prisma.$transaction(async (tx) => {
            for (const payable of payables) {
                await tx.contaPagar.update({
                    where: { id: payable.id },
                    data: {
                        data_vencimento: input.data_vencimento,
                        status: resolveOpenFinancialStatus(payable.status, input.data_vencimento),
                        updated_by: Number(session.user.id),
                    },
                })

                if (payable.pedido_compra_id) {
                    await syncPedidoCompraValorRealizadoInTransaction(tx, payable.pedido_compra_id)
                }
            }
        })

        return NextResponse.json({ success: true, processedCount: payables.length })
    } catch (error) {
        const message = error instanceof z.ZodError ? "Dados inválidos para alterar vencimento." : (error as Error).message
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
