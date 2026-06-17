import { StatusFinanceiro, TipoLancamento } from "@prisma/client"
import { z } from "zod"

import { createCardFeeTransaction, resolveCardFeeAmount } from "@/actions/financeiro/card-fee"
import { zDateOnly } from "@/lib/date-only"
import { prisma } from "@/lib/prisma"

export const receiveBillSchema = z.object({
    conta_receber_id: z.number().int().positive(),
    conta_bancaria_id: z.number().int().positive(),
    valor: z.number().positive(),
    data_recebimento: zDateOnly,
    juros: z.number().min(0).optional().default(0),
    descontos: z.number().min(0).optional().default(0),
    taxa_cartao_valor: z.number().min(0).optional(),
    taxa_cartao_percentual: z.number().min(0).optional(),
    idempotencyKey: z.string().optional(),
})

export type ReceiveBillInput = z.infer<typeof receiveBillSchema>

export async function receiveBill(input: ReceiveBillInput, userId?: number) {
    if (input.idempotencyKey) {
        const existing = await prisma.idempotencyLog.findUnique({ where: { key: input.idempotencyKey } })
        if (existing) {
            if (existing.status === "COMPLETED") return JSON.parse(existing.result!)
            if (existing.status === "PENDING") throw new Error("Operacao em andamento (Idempotency Lock)")
        }

        await prisma.idempotencyLog.create({
            data: { key: input.idempotencyKey, status: "PENDING" },
        })
    }

    try {
        const bill = await prisma.contaReceber.findUnique({
            where: { id: input.conta_receber_id },
            include: { categoria: true },
        })

        if (!bill) throw new Error("Conta a receber nao encontrada")

        const bank = await prisma.contasBancaria.findUnique({
            where: { id: input.conta_bancaria_id },
        })

        if (!bank || !bank.ativo) throw new Error("Conta bancaria invalida ou inativa")

        const allowedStatus: StatusFinanceiro[] = [
            StatusFinanceiro.PENDENTE,
            StatusFinanceiro.PARCIAL,
            StatusFinanceiro.ATRASADO,
        ]
        if (!allowedStatus.includes(bill.status)) {
            throw new Error(`Status invalido para recebimento: ${bill.status}`)
        }

        const total = Number(bill.valor_total)
        const received = Number(bill.valor_recebido)
        const remaining = total - received
        const amortized = input.valor + input.descontos - input.juros
        const cardFee = resolveCardFeeAmount(input, input.valor)

        if (amortized > remaining + 0.01) {
            throw new Error(`Amortizacao excedente. Restante: ${remaining.toFixed(2)} (Amortizacao calculada: ${amortized.toFixed(2)})`)
        }
        if (cardFee > input.valor + 0.01) {
            throw new Error("Taxa de cartao nao pode ser maior que o valor recebido")
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateCheck = await tx.contaReceber.updateMany({
                where: {
                    id: bill.id,
                    valor_recebido: bill.valor_recebido,
                },
                data: {
                    valor_recebido: { increment: amortized },
                },
            })

            if (updateCheck.count === 0) {
                throw new Error("Conflito de concorrencia: O registro foi alterado por outra transacao.")
            }

            const newReceived = received + amortized
            const isPaid = Math.abs(total - newReceived) < 0.01
            const newStatus = isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            const updatedBill = await tx.contaReceber.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    data_recebimento: isPaid ? input.data_recebimento : undefined,
                },
            })

            const mainTransaction = await tx.lancamento.create({
                data: {
                    descricao: `Recebimento: ${bill.descricao}`,
                    valor: input.valor,
                    valor_juros: input.juros,
                    valor_desconto: input.descontos,
                    tipo: TipoLancamento.RECEITA,
                    data_lancamento: input.data_recebimento,
                    data_competencia: bill.data_vencimento,
                    conta_bancaria_id: input.conta_bancaria_id,
                    categoria_id: bill.categoria_id,
                    centro_custo_id: bill.centro_custo_id,
                    observacoes: `Ref: Conta Receber #${bill.id}`,
                    created_by: userId,
                    conta_receber_id: bill.id,
                },
            })

            await tx.contasBancaria.update({
                where: { id: input.conta_bancaria_id },
                data: { saldo_atual: { increment: input.valor } },
            })

            if (cardFee > 0) {
                await createCardFeeTransaction(tx, {
                    origemLancamentoId: mainTransaction.id,
                    origemDescricao: bill.descricao,
                    valor: cardFee,
                    dataLancamento: input.data_recebimento,
                    dataCompetencia: bill.data_vencimento,
                    contaBancariaId: input.conta_bancaria_id,
                    centroCustoId: bill.centro_custo_id,
                    userId,
                })

                await tx.contasBancaria.update({
                    where: { id: input.conta_bancaria_id },
                    data: { saldo_atual: { decrement: cardFee } },
                })
            }

            return updatedBill
        })

        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: { status: "COMPLETED", result: JSON.stringify(result) },
            })
        }

        return result
    } catch (error) {
        if (input.idempotencyKey) {
            await prisma.idempotencyLog.update({
                where: { key: input.idempotencyKey },
                data: {
                    status: "FAILED",
                    result: (error as Error).message,
                },
            })
        }

        throw error
    }
}
