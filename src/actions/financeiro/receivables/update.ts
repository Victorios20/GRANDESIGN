import { StatusFinanceiro } from "@prisma/client"
import { z } from "zod"

import { resolveOpenFinancialStatus } from "@/actions/financeiro/shared/open-status"
import { zDateOnly } from "@/lib/date-only"
import { isReceivableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"

export const updateReceivableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: zDateOnly,
    data_vencimento: zDateOnly,
    cliente_id: z.number().int().positive().nullable().optional(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().nullable().optional(),
    observacoes: z.string().nullable().optional(),
})

export type UpdateReceivableInput = z.infer<typeof updateReceivableSchema>

async function validateRevenueCategory(categoryId: number) {
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
    if (!isReceivableCategory(category)) {
        throw new Error("Categoria deve ser operacional de receita")
    }
}

export async function updateReceivable(id: number, input: UpdateReceivableInput) {
    const receivable = await prisma.contaReceber.findUnique({ where: { id } })
    if (!receivable) throw new Error("Conta a receber nao encontrada")
    if (receivable.status === StatusFinanceiro.PAGO || receivable.status === StatusFinanceiro.CANCELADO) {
        throw new Error("Essa conta nao pode mais ser editada")
    }

    await validateRevenueCategory(input.categoria_id)

    return prisma.contaReceber.update({
        where: { id },
        data: {
            descricao: input.descricao,
            valor_total: input.valor,
            data_emissao: input.data_emissao,
            data_vencimento: input.data_vencimento,
            cliente_id: input.cliente_id ?? null,
            categoria_id: input.categoria_id,
            centro_custo_id: input.centro_custo_id ?? null,
            observacoes: input.observacoes ?? null,
            status: resolveOpenFinancialStatus(receivable.status, input.data_vencimento),
        },
        include: {
            cliente: { select: { id: true, nome: true } },
            categoria: { select: { id: true, nome: true, cor: true } },
            centro_custo: { select: { id: true, nome: true } },
        },
    })
}
