import { prisma } from "@/lib/prisma"
import { createBankSchema, CreateBankInput } from "./schema"

export async function createBank(input: CreateBankInput) {
    const data = createBankSchema.parse(input)

    return await prisma.contasBancaria.create({
        data: {
            ...data,
            saldo_atual: data.saldo_inicial, // Initial balance starts as current
            ativo: true,
        },
        include: {
            _count: {
                select: {
                    lancamentos: true,
                },
            },
        },
    })
}

export async function getBanks(activeOnly = true) {
    return await prisma.contasBancaria.findMany({
        where: activeOnly ? { ativo: true } : undefined,
        include: {
            _count: {
                select: {
                    lancamentos: true,
                },
            },
        },
        orderBy: { nome: "asc" },
    })
}

export async function getBankById(id: number) {
    return await prisma.contasBancaria.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    lancamentos: true,
                },
            },
        },
    })
}
