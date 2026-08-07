import { StatusFinanceiro } from "@prisma/client"
import { z } from "zod"

import { syncPedidoCompraValorRealizadoInTransaction } from "@/actions/pedido_compra/manage-finance-integration"
import { resolveFinancialStatusFromAmounts } from "@/actions/financeiro/shared/open-status"
import { fromDateOnlyDb, zDateOnly } from "@/lib/date-only"
import { isPayableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { isLessMoneyAmount, isSameMoneyAmount } from "@/lib/financial/money"
import { prisma } from "@/lib/prisma"

export const updatePayableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: zDateOnly,
    data_vencimento: zDateOnly,
    fornecedor_id: z.number().int().positive().nullable().optional(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().nullable().optional(),
    observacoes: z.string().nullable().optional(),
})

export type UpdatePayableInput = z.infer<typeof updatePayableSchema>

async function validateExpenseCategory(categoryId: number) {
    const category = await prisma.categoria.findUnique({
        where: { id: categoryId },
        include: {
            categoria_pai: {
                select: {
                    nome: true,
                },
            },
        },
    })

    if (!category) throw new Error("Categoria nao encontrada")
    if (!category.ativo) throw new Error("Categoria inativa")
    if (!isPayableCategory(category)) {
        throw new Error("Categoria deve ser operacional de custo ou despesa")
    }
}

export function assertLockedEditIsSafe(
    input: { valor: number; data_emissao: Date; data_vencimento: Date },
    current: { valor_total: number | { toString(): string }; data_emissao: Date; data_vencimento: Date },
) {
    const lockedFieldChanged =
        !isSameMoneyAmount(input.valor, Number(current.valor_total)) ||
        fromDateOnlyDb(input.data_emissao) !== fromDateOnlyDb(current.data_emissao) ||
        fromDateOnlyDb(input.data_vencimento) !== fromDateOnlyDb(current.data_vencimento)

    if (lockedFieldChanged) {
        throw new Error(
            "Conta paga: valor e datas são protegidos. Ajuste descrição, fornecedor, categoria, centro de custo ou observações — ou peça a um ADMIN para destravar."
        )
    }
}

export async function updatePayable(
    id: number,
    input: UpdatePayableInput,
    options?: { allowLocked?: boolean; userId?: number }
) {
    const payable = await prisma.contaPagar.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            valor_pago: true,
            data_pagamento: true,
            pedido_compra_id: true,
            valor_total: true,
            data_emissao: true,
            data_vencimento: true,
            lancamentos: {
                where: { valor: { gt: 0 } },
                orderBy: { data_lancamento: "desc" },
                take: 1,
                select: { data_lancamento: true },
            },
        },
    })

    if (!payable) throw new Error("Conta a pagar nao encontrada")
    const isLocked = payable.status === StatusFinanceiro.PAGO || payable.status === StatusFinanceiro.CANCELADO
    const isSafeLockedEdit = isLocked && !options?.allowLocked
    if (isSafeLockedEdit) {
        if (payable.status === StatusFinanceiro.CANCELADO) {
            throw new Error("Conta cancelada não pode ser editada")
        }
        assertLockedEditIsSafe(input, payable)
    }

    await validateExpenseCategory(input.categoria_id)

    const paid = Number(payable.valor_pago)
    if (isLessMoneyAmount(input.valor, paid)) {
        throw new Error("O valor total nao pode ser menor que o valor ja pago")
    }

    const status = resolveFinancialStatusFromAmounts({
        currentStatus: payable.status,
        total: input.valor,
        paid,
        dueDate: input.data_vencimento,
    })
    const paymentDate = payable.lancamentos[0]?.data_lancamento ?? payable.data_pagamento

    return prisma.$transaction(async (tx) => {
        const updated = await tx.contaPagar.update({
            where: { id },
            data: {
                descricao: input.descricao,
                valor_total: input.valor,
                data_emissao: input.data_emissao,
                data_vencimento: input.data_vencimento,
                fornecedor_id: input.fornecedor_id ?? null,
                categoria_id: input.categoria_id,
                centro_custo_id: input.centro_custo_id ?? null,
                observacoes: input.observacoes ?? null,
                status,
                data_pagamento: status === StatusFinanceiro.PAGO ? paymentDate : null,
            },
            include: {
                fornecedor: { select: { id: true, nome: true } },
                categoria: { select: { id: true, nome: true, cor: true } },
                centro_custo: { select: { id: true, nome: true } },
                pedido_compra: {
                    select: { id: true, obra_id: true, descricao: true },
                },
            },
        })

        if (payable.pedido_compra_id) {
            await syncPedidoCompraValorRealizadoInTransaction(tx, payable.pedido_compra_id)
        }

        if (isSafeLockedEdit) {
            await tx.auditLog.create({
                data: {
                    user_id: options?.userId ?? null,
                    action: "CONTA_PAGAR_EDITADA_POS_PAGAMENTO",
                    entity: "conta_pagar",
                    entity_id: id,
                    detail: {
                        descricao: input.descricao,
                        fornecedor_id: input.fornecedor_id ?? null,
                        categoria_id: input.categoria_id,
                        centro_custo_id: input.centro_custo_id ?? null,
                        observacoes: input.observacoes ?? null,
                    },
                },
            })
        }

        return updated
    })
}
