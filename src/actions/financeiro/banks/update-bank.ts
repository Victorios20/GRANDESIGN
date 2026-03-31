import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { rebuildBankCurrentBalances } from "./balance-tools"
import { updateBankSchema, UpdateBankInput } from "./schema"

export async function updateBank(input: UpdateBankInput) {
    const { id, ...data } = updateBankSchema.parse(input)

    if (data.ativo === false) {
        const activeCount = await prisma.contasBancaria.count({
            where: { ativo: true },
        })

        if (activeCount <= 1) {
            const current = await prisma.contasBancaria.findUnique({ where: { id } })
            if (current?.ativo) {
                throw new Error("Não é possível desativar a única conta ativa do sistema")
            }
        }
    }

    return await prisma.contasBancaria.update({
        where: { id },
        data,
        include: {
            _count: {
                select: {
                    lancamentos: true,
                },
            },
        },
    })
}

export async function updateInitialBalance(id: number, newBalance: number) {
    return await prisma.$transaction(async (tx) => {
        const bank = await tx.contasBancaria.findUnique({
            where: { id },
        })

        if (!bank) {
            throw new Error("Conta bancária não encontrada")
        }

        await tx.contasBancaria.update({
            where: { id },
            data: {
                saldo_inicial: new Prisma.Decimal(newBalance.toFixed(2)),
            },
        })

        await rebuildBankCurrentBalances(tx, [id])

        return tx.contasBancaria.findUniqueOrThrow({
            where: { id },
            include: {
                _count: {
                    select: {
                        lancamentos: true,
                    },
                },
            },
        })
    })
}
