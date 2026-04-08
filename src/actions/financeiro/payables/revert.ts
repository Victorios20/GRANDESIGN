"use server"

import { prisma } from "@/lib/prisma"
import { ConferenciaStatus, StatusFinanceiro } from "@prisma/client"
import { syncPedidoCompraValorRealizado } from "@/actions/pedido_compra/manage-finance-integration"

export async function revertPayable(lancamento_id: number) {
    const lancamento = await prisma.lancamento.findUnique({
        where: { id: lancamento_id },
        include: {
            conferencia_sessoes: true,
        },
    })
    
    if (!lancamento) throw new Error("Lançamento não encontrado")
    if (!lancamento.conta_pagar_id) throw new Error("Lançamento não pertence a uma Conta a Pagar")

    if (lancamento.conferencia_sessoes?.status === ConferenciaStatus.LOCKED) {
        throw new Error("Lançamento já está vinculado a uma sessão de conferência e não pode ser estornado diretamente.")
    }

    const bill = await prisma.contaPagar.findUnique({
        where: { id: lancamento.conta_pagar_id }
    })

    if (!bill) throw new Error("Conta a pagar não encontrada")

    await prisma.$transaction(async (tx) => {
        // 1. Devolver saldo para o banco
        await tx.contasBancaria.update({
            where: { id: lancamento.conta_bancaria_id },
            data: { saldo_atual: { increment: lancamento.valor } }
        })

        // 2. Reduzir amortização
        const amortizado = Number(lancamento.valor) + Number(lancamento.valor_desconto) - Number(lancamento.valor_juros)
        
        let newPaid = Number(bill.valor_pago) - amortizado
        if (newPaid < 0.01) newPaid = 0

        // 3. Redefinir status
        let newStatus: StatusFinanceiro = StatusFinanceiro.PARCIAL
        if (newPaid <= 0) {
            newStatus = StatusFinanceiro.PENDENTE
            const today = new Date()
            today.setHours(0,0,0,0)
            if (bill.data_vencimento < today) {
                newStatus = StatusFinanceiro.ATRASADO
            }
        }

        await tx.contaPagar.update({
            where: { id: bill.id },
            data: {
                valor_pago: newPaid,
                status: newStatus,
                data_pagamento: newPaid <= 0 ? null : bill.data_pagamento
            }
        })

        // 4. Deletar Lançamento
        await tx.lancamento.delete({
            where: { id: lancamento.id }
        })
    })

    if (bill.pedido_compra_id) {
        await syncPedidoCompraValorRealizado(bill.pedido_compra_id)
    }

    return true
}
