import { prisma } from "@/lib/prisma"
import { TipoLancamento, TipoCategoria } from "@prisma/client"
import { z } from "zod"

export const transferSchema = z.object({
    descricao: z.string().min(1).max(255),
    valor: z.number().positive().refine(val => Number(val.toFixed(2)) === val, "Máximo 2 casas decimais"),
    data_transferencia: z.coerce.date(),
    conta_origem_id: z.number().int().positive(),
    conta_destino_id: z.number().int().positive(),
})

export type TransferInput = z.infer<typeof transferSchema>

export async function createTransfer(input: TransferInput, userId?: number) {
    // 1. Validate Input Basics
    if (input.conta_origem_id === input.conta_destino_id) {
        throw new Error("Conta de origem e destino devem ser diferentes")
    }

    // 2. Fetch Accounts
    const [origem, destino] = await Promise.all([
        prisma.contasBancaria.findUnique({ where: { id: input.conta_origem_id } }),
        prisma.contasBancaria.findUnique({ where: { id: input.conta_destino_id } })
    ])

    if (!origem || !origem.ativo) throw new Error("Conta de origem inválida ou inativa")
    if (!destino || !destino.ativo) throw new Error("Conta de destino inválida ou inativa")

    // 3. Find System Categories
    const catSaida = await prisma.categoria.findFirst({
        where: { nome: "Transferências (Saída)", tipo: TipoCategoria.DESPESA }
    })
    const catEntrada = await prisma.categoria.findFirst({
        where: { nome: "Transferências (Entrada)", tipo: TipoCategoria.RECEITA }
    })

    // If seeded data is missing, we could create it or throw. Throwing is safer for now to ensure seed runs.
    if (!catSaida || !catEntrada) {
        throw new Error("Categorias de Transferência do Sistema não encontradas. Execute o seed.")
    }

    // 4. Atomic Transaction
    return await prisma.$transaction(async (tx) => {
        // A. Create Transfer Record
        const transferencia = await tx.transferencia.create({
            data: {
                descricao: input.descricao,
                valor: input.valor,
                data_transferencia: input.data_transferencia,
                conta_origem_id: input.conta_origem_id,
                conta_destino_id: input.conta_destino_id,
                created_by: userId
            }
        })

        // B. Create Outbound Transaction (Origem)
        await tx.lancamento.create({
            data: {
                descricao: `Transferência para ${destino.nome}: ${input.descricao}`,
                valor: input.valor,
                tipo: TipoLancamento.DESPESA,
                data_lancamento: input.data_transferencia,
                data_competencia: input.data_transferencia,
                conta_bancaria_id: input.conta_origem_id,
                categoria_id: catSaida.id,
                transferencia_id: transferencia.id,
                created_by: userId,
                conciliado: false
            }
        })

        // C. Create Inbound Transaction (Destino)
        await tx.lancamento.create({
            data: {
                descricao: `Transferência de ${origem.nome}: ${input.descricao}`,
                valor: input.valor,
                tipo: TipoLancamento.RECEITA,
                data_lancamento: input.data_transferencia,
                data_competencia: input.data_transferencia,
                conta_bancaria_id: input.conta_destino_id,
                categoria_id: catEntrada.id,
                transferencia_id: transferencia.id,
                created_by: userId,
                conciliado: false
            }
        })

        // D. Update Balances
        const updatedOrigem = await tx.contasBancaria.update({
            where: { id: input.conta_origem_id },
            data: { saldo_atual: { decrement: input.valor } }
        })

        const updatedDestino = await tx.contasBancaria.update({
            where: { id: input.conta_destino_id },
            data: { saldo_atual: { increment: input.valor } }
        })

        return {
            transferencia,
            saldo_origem: updatedOrigem.saldo_atual,
            saldo_destino: updatedDestino.saldo_atual
        }
    })
}
