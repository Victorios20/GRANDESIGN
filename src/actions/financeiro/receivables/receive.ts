import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, TipoLancamento } from "@prisma/client"
import { z } from "zod"

export const receiveBillSchema = z.object({
    conta_receber_id: z.number().int().positive(),
    conta_bancaria_id: z.number().int().positive(),
    valor: z.number().positive(),
    data_recebimento: z.coerce.date(),
    juros: z.number().min(0).optional().default(0),
    descontos: z.number().min(0).optional().default(0),
    idempotencyKey: z.string().optional(),
})

export type ReceiveBillInput = z.infer<typeof receiveBillSchema>

export async function receiveBill(input: ReceiveBillInput, userId?: number) {
    if (input.idempotencyKey) {
        const existing = await prisma.idempotencyLog.findUnique({ where: { key: input.idempotencyKey } })
        if (existing) {
            if (existing.status === "COMPLETED") return JSON.parse(existing.result!)
            if (existing.status === "PENDING") throw new Error("Operação em andamento (Idempotency Lock)")
        }

        await prisma.idempotencyLog.create({
            data: { key: input.idempotencyKey, status: "PENDING" }
        })
    }

    try {
        const bill = await prisma.contaReceber.findUnique({
            where: { id: input.conta_receber_id },
            include: { categoria: true }
        })

        if (!bill) throw new Error("Conta a receber não encontrada")

        const bank = await prisma.contasBancaria.findUnique({
            where: { id: input.conta_bancaria_id }
        })

        if (!bank || !bank.ativo) throw new Error("Conta bancária inválida ou inativa")

        const allowedStatus: StatusFinanceiro[] = [
            StatusFinanceiro.PENDENTE,
            StatusFinanceiro.PARCIAL,
            StatusFinanceiro.ATRASADO,
        ]
        if (!allowedStatus.includes(bill.status)) {
            throw new Error(`Status inválido para recebimento: ${bill.status}`)
        }

        const total = Number(bill.valor_total)
        const received = Number(bill.valor_recebido)
        const remaining = total - received
        const amountToReceive = input.valor

        if (amountToReceive > remaining + 0.01) {
            throw new Error(`Valor excedente. Restante: ${remaining.toFixed(2)}`)
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateCheck = await tx.contaReceber.updateMany({
                where: {
                    id: bill.id,
                    valor_recebido: bill.valor_recebido,
                },
                data: {
                    valor_recebido: { increment: amountToReceive }
                }
            })

            if (updateCheck.count === 0) {
                throw new Error("Conflito de concorrência: O registro foi alterado por outra transação.")
            }

            const newReceived = received + amountToReceive
            const isPaid = Math.abs(total - newReceived) < 0.01
            const newStatus = isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            const updatedBill = await tx.contaReceber.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    data_recebimento: isPaid ? input.data_recebimento : undefined
                }
            })

            await tx.lancamento.create({
                data: {
                    descricao: `Recebimento: ${bill.descricao}`,
                    valor: amountToReceive,
                    tipo: TipoLancamento.RECEITA,
                    data_lancamento: input.data_recebimento,
                    data_competencia: bill.data_vencimento,
                    conta_bancaria_id: input.conta_bancaria_id,
                    categoria_id: bill.categoria_id,
                    centro_custo_id: bill.centro_custo_id,
                    observacoes: `Ref: Conta Receber #${bill.id}`,
                    created_by: userId,
                    conta_receber_id: bill.id
                }
            })

            await tx.contasBancaria.update({
                where: { id: input.conta_bancaria_id },
                data: { saldo_atual: { increment: amountToReceive } }
            })

            return updatedBill
        })

        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: { status: "COMPLETED", result: JSON.stringify(result) }
            })
        }

        return result
    } catch (error) {
        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: {
                    status: "FAILED",
                    result: (error as Error).message
                }
            })
        }

        throw error
    }
}
