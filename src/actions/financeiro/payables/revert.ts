"use server"

import { ConferenciaStatus, StatusFinanceiro } from "@prisma/client"

import { syncPedidoCompraValorRealizado } from "@/actions/pedido_compra/manage-finance-integration"
import { prisma } from "@/lib/prisma"

export async function revertPayable(lancamento_id: number) {
    const lancamento = await prisma.lancamento.findUnique({
        where: { id: lancamento_id },
        include: {
            conferencia_sessoes: true,
        },
    })

    if (!lancamento) throw new Error("Lancamento nao encontrado")
    if (!lancamento.conta_pagar_id) throw new Error("Lancamento nao pertence a uma Conta a Pagar")

    if (lancamento.conferencia_sessoes?.status === ConferenciaStatus.LOCKED) {
        throw new Error("Lancamento ja esta vinculado a uma sessao de conferencia e nao pode ser estornado diretamente.")
    }

    const bill = await prisma.contaPagar.findUnique({
        where: { id: lancamento.conta_pagar_id },
    })

    if (!bill) throw new Error("Conta a pagar nao encontrada")

    const cardFees = await prisma.lancamento.findMany({
        where: { lancamento_origem_id: lancamento.id },
        include: { conferencia_sessoes: true },
    })
    if (cardFees.some((fee) => fee.conferencia_sessoes?.status === ConferenciaStatus.LOCKED)) {
        throw new Error("Taxa de cartao vinculada ja esta conciliada e nao pode ser estornada diretamente.")
    }

    await prisma.$transaction(async (tx) => {
        for (const fee of cardFees) {
            if (fee.conta_bancaria_id) {
                await tx.contasBancaria.update({
                    where: { id: fee.conta_bancaria_id },
                    data: { saldo_atual: { increment: fee.valor } },
                })
            }
            await tx.lancamento.delete({ where: { id: fee.id } })
        }

        if (lancamento.conta_bancaria_id) {
            await tx.contasBancaria.update({
                where: { id: lancamento.conta_bancaria_id },
                data: { saldo_atual: { increment: lancamento.valor } },
            })
        }

        const amortized = Number(lancamento.valor) + Number(lancamento.valor_desconto) - Number(lancamento.valor_juros)
        let newPaid = Number(bill.valor_pago) - amortized
        if (newPaid < 0.01) newPaid = 0

        let newStatus: StatusFinanceiro = StatusFinanceiro.PARCIAL
        if (newPaid <= 0) {
            newStatus = StatusFinanceiro.PENDENTE
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (bill.data_vencimento < today) {
                newStatus = StatusFinanceiro.ATRASADO
            }
        }

        await tx.contaPagar.update({
            where: { id: bill.id },
            data: {
                valor_pago: newPaid,
                status: newStatus,
                data_pagamento: newPaid <= 0 ? null : bill.data_pagamento,
            },
        })

        await tx.lancamento.delete({
            where: { id: lancamento.id },
        })
    })

    if (bill.pedido_compra_id) {
        await syncPedidoCompraValorRealizado(bill.pedido_compra_id)
    }

    return true
}
