import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, Prisma } from "@prisma/client"

export interface GetPayablesOptions {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    status?: StatusFinanceiro | StatusFinanceiro[]
    fornecedor_id?: number
    categoria_id?: number
    centro_custo_id?: number
    search?: string
}

export async function getPayables(options: GetPayablesOptions = {}) {
    const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        status,
        fornecedor_id,
        categoria_id,
        centro_custo_id,
        search,
    } = options
    const skip = (page - 1) * limit

    const where: Prisma.ContaPagarWhereInput = {}

    if (startDate || endDate) {
        where.data_vencimento = {}
        if (startDate) (where.data_vencimento as any).gte = startDate
        if (endDate) (where.data_vencimento as any).lte = endDate
    }

    where.status = status
        ? (Array.isArray(status) ? { in: status } : status)
        : { notIn: [StatusFinanceiro.PAGO, StatusFinanceiro.CANCELADO] }
    if (fornecedor_id) where.fornecedor_id = fornecedor_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) {
        where.descricao = { contains: search, mode: "insensitive" }
    }

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
                centro_custo: { select: { id: true, nome: true } },
            },
        }),
    ])

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    }
}

export async function getPayablesSummary(filters: Omit<GetPayablesOptions, "page" | "limit"> = {}) {
    const { startDate, endDate, status, fornecedor_id, categoria_id, centro_custo_id, search } = filters
    const where: Prisma.ContaPagarWhereInput = {}

    if (startDate || endDate) {
        where.data_vencimento = {}
        if (startDate) (where.data_vencimento as any).gte = startDate
        if (endDate) (where.data_vencimento as any).lte = endDate
    }
    if (status) where.status = Array.isArray(status) ? { in: status } : status
    if (fornecedor_id) where.fornecedor_id = fornecedor_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) where.descricao = { contains: search, mode: "insensitive" }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    const baseWhere = { ...where, status: { notIn: [StatusFinanceiro.PAGO, StatusFinanceiro.CANCELADO] as StatusFinanceiro[] } }

    const [totalPending, overdue, dueToday, dueNext7] = await prisma.$transaction([
        prisma.contaPagar.aggregate({
            where: baseWhere,
            _sum: { valor_total: true, valor_pago: true },
            _count: true,
        }),
        prisma.contaPagar.aggregate({
            where: { ...baseWhere, data_vencimento: { lt: today } },
            _sum: { valor_total: true, valor_pago: true },
            _count: true,
        }),
        prisma.contaPagar.aggregate({
            where: { ...baseWhere, data_vencimento: { gte: today, lt: tomorrow } },
            _sum: { valor_total: true, valor_pago: true },
            _count: true,
        }),
        prisma.contaPagar.aggregate({
            where: { ...baseWhere, data_vencimento: { gte: today, lt: next7 } },
            _sum: { valor_total: true, valor_pago: true },
            _count: true,
        }),
    ])

    return {
        totalAmount: Number(totalPending._sum.valor_total ?? 0) - Number(totalPending._sum.valor_pago ?? 0),
        totalPending: totalPending._count,
        overdueAmount: Number(overdue._sum.valor_total ?? 0) - Number(overdue._sum.valor_pago ?? 0),
        overdueCount: overdue._count,
        dueTodayAmount: Number(dueToday._sum.valor_total ?? 0) - Number(dueToday._sum.valor_pago ?? 0),
        dueTodayCount: dueToday._count,
        dueNext7Amount: Number(dueNext7._sum.valor_total ?? 0) - Number(dueNext7._sum.valor_pago ?? 0),
        dueNext7Count: dueNext7._count,
    }
}
