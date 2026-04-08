"use server"

import { prisma } from "@/lib/prisma"
import { ConferenciaStatus, StatusFinanceiro } from "@prisma/client"

export async function revertReceivable(lancamento_id: number) {
    const lancamento = await prisma.lancamento.findUnique({
        where: { id: lancamento_id },
        include: {
            conferencia_sessoes: true,
        },
    })
    
    if (!lancamento) throw new Error("Lançamento não encontrado")
    if (!lancamento.conta_receber_id) throw new Error("Lançamento não pertence a uma Conta a Receber")

    if (lancamento.conferencia_sessoes?.status === ConferenciaStatus.LOCKED) {
        throw new Error("Lançamento já está vinculado a uma sessão de conferência e não pode ser estornado diretamente.")
    }

    const bill = await prisma.contaReceber.findUnique({
        where: { id: lancamento.conta_receber_id }
    })

    if (!bill) throw new Error("Conta a receber não encontrada")

    await prisma.$transaction(async (tx) => {
        // 1. Tirar saldo do banco
        await tx.contasBancaria.update({
            where: { id: lancamento.conta_bancaria_id },
            data: { saldo_atual: { decrement: lancamento.valor } }
        })

        // 2. Reduzir amortização
        const amortizado = Number(lancamento.valor) + Number(lancamento.valor_desconto) - Number(lancamento.valor_juros)
        
        let newReceived = Number(bill.valor_recebido) - amortizado
        if (newReceived < 0.01) newReceived = 0

        // 3. Redefinir status
        let newStatus: StatusFinanceiro = StatusFinanceiro.PARCIAL
        if (newReceived <= 0) {
            newStatus = StatusFinanceiro.PENDENTE
            const today = new Date()
            today.setHours(0,0,0,0)
            if (bill.data_vencimento < today) {
                newStatus = StatusFinanceiro.ATRASADO
            }
        }

        await tx.contaReceber.update({
            where: { id: bill.id },
            data: {
                valor_recebido: newReceived,
                status: newStatus,
                data_recebimento: newReceived <= 0 ? null : bill.data_recebimento
            }
        })

        // 4. Deletar Lançamento
        await tx.lancamento.delete({
            where: { id: lancamento.id }
        })
    })

    return true
}
