import { FrequenciaRecorrencia, StatusFinanceiro } from "@prisma/client"
import { z } from "zod"

import { zDateOnly } from "@/lib/date-only"
import { isPayableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { calculateInstallments } from "@/lib/financial/installments"
import { prisma } from "@/lib/prisma"
import { notifyContaCriada } from "@/lib/email/notifications"

export const createPayableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: zDateOnly,
    data_vencimento: zDateOnly,
    fornecedor_id: z.number().int().positive().optional().nullable(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
    recorrente: z.boolean().optional(),
    frequencia: z.nativeEnum(FrequenciaRecorrencia).optional().nullable(),
})

export const createPayableInstallmentSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor_total: z.number().positive(),
    total_parcelas: z.number().int().min(2).max(36),
    data_emissao: zDateOnly,
    primeiro_vencimento: zDateOnly,
    fornecedor_id: z.number().int().positive().optional().nullable(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
})

export type CreatePayableInput = z.infer<typeof createPayableSchema>
export type CreatePayableInstallmentInput = z.infer<typeof createPayableInstallmentSchema>

async function validateCategory(id: number) {
    const category = await prisma.categoria.findUnique({
        where: { id },
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

export async function createPayable(input: CreatePayableInput, userId?: number) {
    await validateCategory(input.categoria_id)

    const conta = await prisma.contaPagar.create({
        data: {
            descricao: input.descricao,
            valor_total: input.valor,
            data_emissao: input.data_emissao,
            data_vencimento: input.data_vencimento,
            fornecedor_id: input.fornecedor_id,
            categoria_id: input.categoria_id,
            centro_custo_id: input.centro_custo_id,
            observacoes: input.observacoes,
            recorrente: input.recorrente,
            frequencia: input.frequencia,
            valor_pago: 0,
            status: StatusFinanceiro.PENDENTE,
            parcela_atual: 1,
            total_parcelas: 1,
            created_by: userId,
        },
    })

    await notifyContaCriada({
        tipo: "PAGAR",
        descricao: conta.descricao,
        valor: Number(conta.valor_total),
        vencimento: conta.data_vencimento,
    })

    return conta
}

export async function createPayableInstallments(
    input: CreatePayableInstallmentInput,
    userId?: number,
) {
    await validateCategory(input.categoria_id)

    const installments = calculateInstallments(
        input.valor_total,
        input.total_parcelas,
        input.primeiro_vencimento,
    )

    const contas = await prisma.$transaction(
        installments.map((inst) =>
            prisma.contaPagar.create({
                data: {
                    descricao: `${input.descricao} (${inst.parcela}/${input.total_parcelas})`,
                    valor_total: inst.valor,
                    valor_pago: 0,
                    data_emissao: input.data_emissao,
                    data_vencimento: inst.data_vencimento,
                    status: StatusFinanceiro.PENDENTE,
                    fornecedor_id: input.fornecedor_id,
                    categoria_id: input.categoria_id,
                    centro_custo_id: input.centro_custo_id,
                    observacoes: input.observacoes,
                    parcela_atual: inst.parcela,
                    total_parcelas: input.total_parcelas,
                    created_by: userId,
                },
            }),
        ),
    )

    await notifyContaCriada({
        tipo: "PAGAR",
        descricao: `${input.descricao} (${input.total_parcelas}x)`,
        valor: input.valor_total,
        vencimento: input.primeiro_vencimento,
    })

    return contas
}
