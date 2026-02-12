import { prisma } from "@/lib/prisma"
import { StatusFinanceiro } from "@prisma/client"

export interface GetPayablesOptions {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    status?: StatusFinanceiro
    fornecedor_id?: number
    categoria_id?: number
}

export async function getPayables(options: GetPayablesOptions = {}) {
    const { page = 1, limit = 20, startDate, endDate, status, fornecedor_id, categoria_id } = options
    const skip = (page - 1) * limit

    const where: any = {}

    if (startDate || endDate) {
        where.data_vencimento = {}
        if (startDate) where.data_vencimento.gte = startDate
        if (endDate) where.data_vencimento.lte = endDate
    }

    if (status) where.status = status
    if (fornecedor_id) where.fornecedor_id = fornecedor_id
    if (categoria_id) where.categoria_id = categoria_id

    const [total, data] = await prisma.$transaction([
        prisma.contaPagar.count({ where }),
        prisma.contaPagar.findMany({
            where,
            skip,
            take: limit,
            orderBy: { data_vencimento: "asc" },
            include: {
                fornecedor: { select: { id: true, nome: true } },
                categoria: { select: { id: true, nome: true, cor: true } },
                centro_custo: { select: { id: true, nome: true } }
            }
        })
    ])

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }
}
