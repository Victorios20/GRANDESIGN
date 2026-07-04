import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { payBill } from "@/actions/financeiro/payables/pay"
import { prisma } from "@/lib/prisma"
import { StatusFinanceiro } from "@prisma/client"
import { z } from "zod"
import { zDateOnly } from "@/lib/date-only"

const bulkPaySchema = z.object({
    conta_ids: z.array(z.number().int().positive()).min(1),
    conta_bancaria_id: z.number().int().positive(),
    data_pagamento: zDateOnly,
})

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const input = bulkPaySchema.parse(body)
        const payables = await prisma.contaPagar.findMany({
            where: {
                id: { in: input.conta_ids },
                status: { in: [StatusFinanceiro.PENDENTE, StatusFinanceiro.PARCIAL, StatusFinanceiro.ATRASADO] },
            },
            select: { id: true, valor_total: true, valor_pago: true },
        })

        const results = []
        for (const payable of payables) {
            const valor = Number(payable.valor_total) - Number(payable.valor_pago)
            if (valor <= 0) continue
            const result = await payBill({
                conta_pagar_id: payable.id,
                conta_bancaria_id: input.conta_bancaria_id,
                valor,
                data_pagamento: input.data_pagamento,
                juros: 0,
                descontos: 0,
                quitarSaldo: false,
                idempotencyKey: `bulk-pay-${payable.id}-${input.data_pagamento.toISOString()}`,
            }, Number(session.user.id))
            results.push(result)
        }

        return NextResponse.json({ processed: results.length })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
