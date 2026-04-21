import { TipoLancamento } from "@prisma/client"
import { z } from "zod"

import { syncFixedFinancialCategoryTaxonomy } from "@/actions/financeiro/categories/sync-fixed-taxonomy"
import { getCashFlowSettings } from "@/actions/financeiro/settings/cash-flow"
import { prisma } from "@/lib/prisma"

export const transferSchema = z.object({
    descricao: z.string().min(1).max(255),
    valor: z
        .number()
        .positive()
        .refine((val) => Number(val.toFixed(2)) === val, "Maximo 2 casas decimais"),
    data_transferencia: z.coerce.date(),
    conta_origem_id: z.number().int().positive(),
    conta_destino_id: z.number().int().positive(),
    observacoes: z.string().max(1000).optional(),
})

export type TransferInput = z.infer<typeof transferSchema>

function isDateClosed(date: Date, closingDateIso?: string | null) {
    if (!closingDateIso) return false
    return new Date(date) <= new Date(closingDateIso)
}

export async function createTransfer(input: TransferInput, userId?: number) {
    if (input.conta_origem_id === input.conta_destino_id) {
        throw new Error("Conta de origem e destino devem ser diferentes")
    }

    const settings = await getCashFlowSettings()
    if (isDateClosed(input.data_transferencia, settings.closing_date)) {
        throw new Error("Período financeiro fechado")
    }

    await syncFixedFinancialCategoryTaxonomy()

    const [origem, destino] = await Promise.all([
        prisma.contasBancaria.findUnique({ where: { id: input.conta_origem_id } }),
        prisma.contasBancaria.findUnique({ where: { id: input.conta_destino_id } }),
    ])

    if (!origem || !origem.ativo) throw new Error("Conta de origem invalida ou inativa")
    if (!destino || !destino.ativo) throw new Error("Conta de destino invalida ou inativa")

    const transferParent = await prisma.categoria.findFirst({
        where: {
            nome: "Transfer\u00eancia",
            categoria_pai_id: null,
        },
    })

    if (!transferParent) {
        throw new Error("Grupo de transferencia nao encontrado")
    }

    const existingTransferCategory = await prisma.categoria.findFirst({
        where: {
            nome: "Transfer\u00eancia",
            categoria_pai: {
                nome: "Transfer\u00eancia",
            },
        },
    })

    const transferCategory =
        existingTransferCategory ??
        (await prisma.categoria.create({
            data: {
                nome: "Transfer\u00eancia",
                tipo: transferParent.tipo,
                categoria_pai_id: transferParent.id,
                ativo: true,
            },
        }))

    return prisma.$transaction(async (tx) => {
        const transferencia = await tx.transferencia.create({
            data: {
                descricao: input.descricao,
                valor: input.valor,
                data_transferencia: input.data_transferencia,
                conta_origem_id: input.conta_origem_id,
                conta_destino_id: input.conta_destino_id,
                created_by: userId,
            },
        })

        await tx.lancamento.create({
            data: {
                descricao: `Transferencia para ${destino.nome}: ${input.descricao}`,
                valor: input.valor,
                tipo: TipoLancamento.DESPESA,
                data_lancamento: input.data_transferencia,
                data_competencia: input.data_transferencia,
                conta_bancaria_id: input.conta_origem_id,
                categoria_id: transferCategory.id,
                transferencia_id: transferencia.id,
                observacoes: input.observacoes,
                created_by: userId,
            },
        })

        await tx.lancamento.create({
            data: {
                descricao: `Transferencia de ${origem.nome}: ${input.descricao}`,
                valor: input.valor,
                tipo: TipoLancamento.RECEITA,
                data_lancamento: input.data_transferencia,
                data_competencia: input.data_transferencia,
                conta_bancaria_id: input.conta_destino_id,
                categoria_id: transferCategory.id,
                transferencia_id: transferencia.id,
                observacoes: input.observacoes,
                created_by: userId,
            },
        })

        const updatedOrigem = await tx.contasBancaria.update({
            where: { id: input.conta_origem_id },
            data: { saldo_atual: { decrement: input.valor } },
        })

        const updatedDestino = await tx.contasBancaria.update({
            where: { id: input.conta_destino_id },
            data: { saldo_atual: { increment: input.valor } },
        })

        if (userId) {
            await tx.auditLog.create({
                data: {
                    action: "TRANSFER_CREATED",
                    entity: "transferencia",
                    entity_id: transferencia.id,
                    user_id: userId,
                    detail: {
                        descricao: transferencia.descricao,
                        valor: Number(transferencia.valor),
                        data_transferencia: transferencia.data_transferencia.toISOString(),
                        conta_origem_id: transferencia.conta_origem_id,
                        conta_destino_id: transferencia.conta_destino_id,
                    },
                },
            })
        }

        return {
            transferencia,
            saldo_origem: updatedOrigem.saldo_atual,
            saldo_destino: updatedDestino.saldo_atual,
        }
    })
}
