import { prisma } from "@/lib/prisma"
import { updateBankSchema, UpdateBankInput } from "./schema"

export async function updateBank(input: UpdateBankInput) {
    const { id, ...data } = updateBankSchema.parse(input)

    // Soft Delete Check
    if (data.ativo === false) {
        const activeCount = await prisma.contasBancaria.count({
            where: { ativo: true },
        })

        if (activeCount <= 1) {
            // Check if this is the last one
            const current = await prisma.contasBancaria.findUnique({ where: { id } })
            if (current?.ativo) {
                throw new Error("Não é possível desativar a única conta ativa do sistema")
            }
        }
    }

    return await prisma.contasBancaria.update({
        where: { id },
        data,
    })
}

/**
 * Special action to update initial balance.
 * Only allowed if NO transactions exist for this account.
 */
export async function updateInitialBalance(id: number, newBalance: number) {
    const hasTransactions = await prisma.lancamento.count({
        where: { conta_bancaria_id: id },
    })

    if (hasTransactions > 0) {
        throw new Error("Não é possível alterar saldo inicial de uma conta com movimentações")
    }

    // Update both initial and current (re-calc would be needed if we supported it with transactions, but we blocked it)
    return await prisma.contasBancaria.update({
        where: { id },
        data: {
            saldo_inicial: newBalance,
            saldo_atual: newBalance,
        },
    })
}
