"use server"

import { ConferenciaStatus, StatusFinanceiro } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export async function revertReceivable(lancamento_id: number) {
    const lancamento = await prisma.lancamento.findUnique({
        where: { id: lancamento_id },
        include: {
            conferencia_sessoes: true,
        },
    })

    if (!lancamento) throw new Error("Lancamento nao encontrado")
    if (!lancamento.conta_receber_id) throw new Error("Lancamento nao pertence a uma Conta a Receber")

    if (lancamento.conferencia_sessoes?.status === ConferenciaStatus.LOCKED) {
        throw new Error("Lancamento ja esta vinculado a uma sessao de conferencia e nao pode ser estornado diretamente.")
    }

    const bill = await prisma.contaReceber.findUnique({
        where: { id: lancamento.conta_receber_id },
    })

    if (!bill) throw new Error("Conta a receber nao encontrada")

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
                data: { saldo_atual: { decrement: lancamento.valor } },
            })
        }

        const amortized = Number(lancamento.valor) + Number(lancamento.valor_desconto) - Number(lancamento.valor_juros)
        let newReceived = Number(bill.valor_recebido) - amortized
        if (newReceived < 0.01) newReceived = 0

        let newStatus: StatusFinanceiro = StatusFinanceiro.PARCIAL
        if (newReceived <= 0) {
            newStatus = StatusFinanceiro.PENDENTE
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (bill.data_vencimento < today) {
                newStatus = StatusFinanceiro.ATRASADO
            }
        }

        await tx.contaReceber.update({
            where: { id: bill.id },
            data: {
                valor_recebido: newReceived,
                status: newStatus,
                data_recebimento: newReceived <= 0 ? null : bill.data_recebimento,
            },
        })

        await tx.lancamento.delete({
            where: { id: lancamento.id },
        })
    })

    return true
}
