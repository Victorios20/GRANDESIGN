import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { receiveBill } from "@/actions/financeiro/receivables/receive"
import { prisma } from "@/lib/prisma"
import { StatusFinanceiro } from "@prisma/client"
import { z } from "zod"

const bulkReceiveSchema = z.object({
    conta_ids: z.array(z.number().int().positive()).min(1),
    conta_bancaria_id: z.number().int().positive(),
    data_recebimento: z.coerce.date(),
})

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = bulkReceiveSchema.parse(body)
        const receivables = await prisma.contaReceber.findMany({
            where: {
                id: { in: input.conta_ids },
                status: { in: [StatusFinanceiro.PENDENTE, StatusFinanceiro.PARCIAL, StatusFinanceiro.ATRASADO] },
            },
            select: { id: true, valor_total: true, valor_recebido: true },
        })

        const results = []
        for (const receivable of receivables) {
            const valor = Number(receivable.valor_total) - Number(receivable.valor_recebido)
            if (valor <= 0) continue
            const result = await receiveBill({
                conta_receber_id: receivable.id,
                conta_bancaria_id: input.conta_bancaria_id,
                valor,
                data_recebimento: input.data_recebimento,
                juros: 0,
                descontos: 0,
                idempotencyKey: `bulk-receive-${receivable.id}-${input.data_recebimento.toISOString()}`,
            }, Number(session.user.id))
            results.push(result)
        }

        return NextResponse.json({ processed: results.length })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
