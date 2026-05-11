import { StatusFinanceiro, TipoLancamento } from "@prisma/client"
import { z } from "zod"

import { createCardFeeTransaction, resolveCardFeeAmount } from "@/actions/financeiro/card-fee"
import { syncPedidoCompraValorRealizado } from "@/actions/pedido_compra/manage-finance-integration"
import { prisma } from "@/lib/prisma"

export const payBillSchema = z.object({
    conta_pagar_id: z.number().int().positive(),
    conta_bancaria_id: z.number().int().positive(),
    valor: z.number().positive(),
    data_pagamento: z.coerce.date(),
    juros: z.number().min(0).optional().default(0),
    descontos: z.number().min(0).optional().default(0),
    taxa_cartao_valor: z.number().min(0).optional(),
    taxa_cartao_percentual: z.number().min(0).optional(),
    idempotencyKey: z.string().optional(),
})

export type PayBillInput = z.infer<typeof payBillSchema>

export async function payBill(input: PayBillInput, userId?: number) {
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
        const bill = await prisma.contaPagar.findUnique({
            where: { id: input.conta_pagar_id },
            include: { categoria: true },
        })

        if (!bill) throw new Error("Conta a pagar nao encontrada")

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
            throw new Error(`Status invalido para pagamento: ${bill.status}`)
        }

        const total = Number(bill.valor_total)
        const paid = Number(bill.valor_pago)
        const remaining = total - paid
        const amortized = input.valor + input.descontos - input.juros
        const cardFee = resolveCardFeeAmount(input, input.valor)

        if (amortized > remaining + 0.01) {
            throw new Error(`Amortizacao excedente. Restante: ${remaining.toFixed(2)} (Amortizacao calculada: ${amortized.toFixed(2)})`)
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateCheck = await tx.contaPagar.updateMany({
                where: {
                    id: bill.id,
                    valor_pago: bill.valor_pago,
                },
                data: {
                    valor_pago: { increment: amortized },
                },
            })

            if (updateCheck.count === 0) {
                throw new Error("Conflito de concorrencia: O registro foi alterado por outra transacao. Tente novamente.")
            }

            const newPaid = paid + amortized
            const isPaid = Math.abs(total - newPaid) < 0.01
            const newStatus = isPaid ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL

            const updatedBill = await tx.contaPagar.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    data_pagamento: isPaid ? input.data_pagamento : undefined,
                },
            })

            const mainTransaction = await tx.lancamento.create({
                data: {
                    descricao: `Pagamento: ${bill.descricao}`,
                    valor: input.valor,
                    valor_juros: input.juros,
                    valor_desconto: input.descontos,
                    tipo: TipoLancamento.DESPESA,
                    data_lancamento: input.data_pagamento,
                    data_competencia: bill.data_vencimento,
                    conta_bancaria_id: input.conta_bancaria_id,
                    categoria_id: bill.categoria_id,
                    centro_custo_id: bill.centro_custo_id,
                    observacoes: `Ref: Conta Pagar #${bill.id}`,
                    created_by: userId,
                    conta_pagar_id: bill.id,
                },
            })

            await tx.contasBancaria.update({
                where: { id: input.conta_bancaria_id },
                data: { saldo_atual: { decrement: input.valor } },
            })

            if (cardFee > 0) {
                await createCardFeeTransaction(tx, {
                    origemLancamentoId: mainTransaction.id,
                    origemDescricao: bill.descricao,
                    valor: cardFee,
                    dataLancamento: input.data_pagamento,
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

        if (result.pedido_compra_id) {
            await syncPedidoCompraValorRealizado(result.pedido_compra_id)
        }

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
