import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, TipoLancamento } from "@prisma/client"
import { z } from "zod"

export const payBillSchema = z.object({
    conta_pagar_id: z.number().int().positive(),
    conta_bancaria_id: z.number().int().positive(),
    valor: z.number().positive(),
    data_pagamento: z.coerce.date(),
    juros: z.number().min(0).optional().default(0),
    descontos: z.number().min(0).optional().default(0),
    idempotencyKey: z.string().optional(),
})

export type PayBillInput = z.infer<typeof payBillSchema>

export async function payBill(input: PayBillInput, userId?: number) {
    // 1. Idempotency Check (Pre-Transaction)
    if (input.idempotencyKey) {
        const existing = await prisma.idempotencyLog.findUnique({ where: { key: input.idempotencyKey } })
        if (existing) {
            if (existing.status === 'COMPLETED') return JSON.parse(existing.result!)
            if (existing.status === 'PENDING') throw new Error("Operação em andamento (Idempotency Lock)")
            // If FAILED, we allow retry (proceed)
        }
        await prisma.idempotencyLog.create({
            data: { key: input.idempotencyKey, status: 'PENDING' }
        })
    }

    try {
        // 2. Fetch Bill & Bank Account
        const bill = await prisma.contaPagar.findUnique({
            where: { id: input.conta_pagar_id },
            include: { categoria: true }
        })

        if (!bill) throw new Error("Conta a pagar não encontrada")

        const bank = await prisma.contasBancaria.findUnique({
            where: { id: input.conta_bancaria_id }
        })

        if (!bank || !bank.ativo) throw new Error("Conta bancária inválida ou inativa")

        // 3. Validate Status
        const allowedStatus = [StatusFinanceiro.PENDENTE, StatusFinanceiro.PARCIAL, StatusFinanceiro.ATRASADO]
        if (!allowedStatus.includes(bill.status)) {
            throw new Error(`Status inválido para pagamento: ${bill.status}`)
        }

        // 4. Calculate Remaining & Validate
        const total = Number(bill.valor_total)
        const paid = Number(bill.valor_pago)
        const remaining = total - paid
        const amountToPay = input.valor

        if (amountToPay > remaining + 0.01) {
            throw new Error(`Valor excedente. Restante: ${remaining.toFixed(2)}`)
        }

        // 5. Atomic Transaction with OCC
        const result = await prisma.$transaction(async (tx) => {
            // A. Optimistic Concurrency Control (Lock & Update)
            // We explicitly check that `valor_pago` has not changed since our read.
            const updateCheck = await tx.contaPagar.updateMany({
                where: {
                    id: bill.id,
                    valor_pago: bill.valor_pago // OCC Version Check
                },
                data: {
                    valor_pago: { increment: amountToPay }
                }
            })

            if (updateCheck.count === 0) {
                throw new Error("Conflito de concorrência: O registro foi alterado por outra transação. Tente novamente.")
            }

            // Check new totals to determine status
            // We can't use `returned` value from updateMany. We calculate based on inputs.
            const newPaid = paid + amountToPay
            const isPaid = Math.abs(total - newPaid) < 0.01
            const newStatus = isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            // Update Status and Data Pagamento
            const updatedBill = await tx.contaPagar.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    data_pagamento: isPaid ? input.data_pagamento : undefined
                }
            })

            // B. Create Transaction (Saída)
            await tx.lancamento.create({
                data: {
                    descricao: `Pagamento: ${bill.descricao}`,
                    valor: amountToPay,
                    tipo: TipoLancamento.DESPESA,
                    data_lancamento: input.data_pagamento,
                    data_competencia: bill.data_vencimento,
                    conta_bancaria_id: input.conta_bancaria_id,
                    categoria_id: bill.categoria_id,
                    centro_custo_id: bill.centro_custo_id,
                    conciliado: true,
                    observacoes: `Ref: Conta Pagar #${bill.id}`,
                    created_by: userId,
                    conta_pagar_id: bill.id
                }
            })

            // C. Update Bank Balance
            await tx.contasBancaria.update({
                where: { id: input.conta_bancaria_id },
                data: { saldo_atual: { decrement: amountToPay } }
            })

            return updatedBill
        })

        // 6. Finalize Idempotency
        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: { status: 'COMPLETED', result: JSON.stringify(result) }
            })
        }

        return result

    } catch (error) {
        // Handle Idempotency Failure
        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: {
                    status: 'FAILED',
                    error: (error as Error).message
                }
            })
        }
        throw error
    }
}
