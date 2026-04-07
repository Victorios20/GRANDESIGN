import { syncPedidoCompraValorRealizadoInTransaction } from "@/actions/pedido_compra/manage-finance-integration"
import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, TipoCategoria } from "@prisma/client"
import { z } from "zod"

export const updatePayableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: z.coerce.date(),
    data_vencimento: z.coerce.date(),
    fornecedor_id: z.number().int().positive().nullable().optional(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().nullable().optional(),
    observacoes: z.string().nullable().optional(),
})

export type UpdatePayableInput = z.infer<typeof updatePayableSchema>

async function validateExpenseCategory(categoryId: number) {
    const category = await prisma.categoria.findUnique({ where: { id: categoryId } })
    if (!category) throw new Error("Categoria nÃ£o encontrada")
    if (!category.ativo) throw new Error("Categoria inativa")
    if (category.tipo !== TipoCategoria.DESPESA) throw new Error("Categoria deve ser de Despesa")
}

function resolveOpenStatus(currentStatus: StatusFinanceiro, dueDate: Date) {
    if (currentStatus === StatusFinanceiro.PARCIAL) return StatusFinanceiro.PARCIAL
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today ? StatusFinanceiro.ATRASADO : StatusFinanceiro.PENDENTE
}

export async function updatePayable(id: number, input: UpdatePayableInput) {
    const payable = await prisma.contaPagar.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            pedido_compra_id: true,
        },
    })
    if (!payable) throw new Error("Conta a pagar nÃ£o encontrada")
    if (payable.status === StatusFinanceiro.PAGO || payable.status === StatusFinanceiro.CANCELADO) {
        throw new Error("Essa conta nÃ£o pode mais ser editada")
    }

    await validateExpenseCategory(input.categoria_id)

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
                status: resolveOpenStatus(payable.status, input.data_vencimento),
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

        return updated
    })
}
