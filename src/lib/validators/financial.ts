import { TipoLancamento } from "@prisma/client"
import { differenceInYears } from "date-fns"
import { z } from "zod"

import { isTransactionSelectableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"

export const transactionSchema = z.object({
    descricao: z.string().min(1).max(255),
    valor: z
        .number()
        .positive("Valor deve ser maior que zero")
        .refine((val) => Number(val.toFixed(2)) === val, "Maximo 2 casas decimais"),
    tipo: z.nativeEnum(TipoLancamento),
    data_lancamento: z.coerce.date(),
    data_competencia: z.coerce.date().optional(),
    conta_bancaria_id: z.number().int().positive(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export async function validateTransaction(input: TransactionInput) {
    const errors: string[] = []

    const now = new Date()
    const diffPast = differenceInYears(now, input.data_lancamento)
    const diffFuture = differenceInYears(input.data_lancamento, now)

    if (diffPast > 10) errors.push("Data de lancamento nao pode ser anterior a 10 anos")
    if (diffFuture > 5) errors.push("Data de lancamento nao pode ser superior a 5 anos no futuro")

    const bank = await prisma.contasBancaria.findUnique({
        where: { id: input.conta_bancaria_id },
    })

    if (!bank) {
        errors.push("Conta bancaria nao encontrada")
    } else if (!bank.ativo) {
        errors.push("Conta bancaria inativa")
    }

    const category = await prisma.categoria.findUnique({
        where: { id: input.categoria_id },
        include: {
            categoria_pai: {
                select: {
                    nome: true,
                },
            },
        },
    })

    if (!category) {
        errors.push("Categoria nao encontrada")
    } else {
        if (!category.ativo) errors.push("Categoria inativa")

        if (!isTransactionSelectableCategory(category, input.tipo)) {
            if (input.tipo === TipoLancamento.RECEITA) {
                errors.push("Lancamento de receita exige categoria operacional de receita")
            } else {
                errors.push("Lancamento de despesa exige categoria operacional de custo ou despesa")
            }
        }
    }

    if (input.centro_custo_id) {
        const cc = await prisma.centroCusto.findUnique({
            where: { id: input.centro_custo_id },
        })
        if (!cc) errors.push("Centro de custo nao encontrado")
        else if (!cc.ativo) errors.push("Centro de custo inativo")
    }

    if (errors.length > 0) {
        throw new Error(errors.join("; "))
    }

    return true
}
