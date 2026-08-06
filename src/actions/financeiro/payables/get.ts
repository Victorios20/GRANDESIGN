import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, Prisma } from "@prisma/client"

import { buildSearchWhere } from "@/actions/financeiro/shared/search"

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
    orderBy?: PayableOrderBy
    orderDir?: "asc" | "desc"
}

export type PayableOrderBy =
    | "data_vencimento"
    | "fornecedor"
    | "descricao"
    | "categoria"
    | "valor_total"
    | "status"
    | "created_at"

const FINANCIAL_STATUSES: StatusFinanceiro[] = [
    StatusFinanceiro.PENDENTE,
    StatusFinanceiro.PARCIAL,
    StatusFinanceiro.ATRASADO,
    StatusFinanceiro.PAGO,
    StatusFinanceiro.CANCELADO,
]

function buildDueDateFilter(startDate?: Date, endDate?: Date) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    return dateFilter
}

function isOnlyOverdueStatus(status?: StatusFinanceiro | StatusFinanceiro[]) {
    return status === StatusFinanceiro.ATRASADO || (Array.isArray(status) && status.length === 1 && status[0] === StatusFinanceiro.ATRASADO)
}

function buildPayablesWhere(
    filters: Omit<GetPayablesOptions, "page" | "limit" | "orderBy" | "orderDir">,
    options: { includeStatus?: boolean; includeDate?: boolean } = {}
) {
    const { startDate, endDate, status, fornecedor_id, categoria_id, centro_custo_id, search } = filters
    const { includeStatus = true, includeDate = true } = options
    const where: Prisma.ContaPagarWhereInput = {}

    if (includeDate && (startDate || endDate)) {
        where.data_vencimento = buildDueDateFilter(startDate, endDate)
    }

    if (includeStatus && status) {
        where.status = Array.isArray(status) ? { in: status } : status
    }
    if (fornecedor_id) where.fornecedor_id = fornecedor_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) Object.assign(where, buildSearchWhere(search))

    return where
}

function buildPayablesOrderBy(orderBy: PayableOrderBy = "data_vencimento", orderDir: "asc" | "desc" = "desc") {
    const direction = orderDir === "asc" ? "asc" : "desc"
    const fallback: Prisma.ContaPagarOrderByWithRelationInput = { id: direction }

    const primary: Prisma.ContaPagarOrderByWithRelationInput =
        orderBy === "fornecedor"
            ? { fornecedor: { nome: direction } }
            : orderBy === "categoria"
                ? { categoria: { nome: direction } }
                : orderBy === "descricao"
                    ? { descricao: direction }
                    : orderBy === "valor_total"
                        ? { valor_total: direction }
                        : orderBy === "status"
                            ? { status: direction }
                            : orderBy === "created_at"
                                ? { created_at: direction }
                                : { data_vencimento: direction }

    return [primary, fallback]
}

function sumOpenAmount(total: Prisma.Decimal | null | undefined, paid: Prisma.Decimal | null | undefined) {
    return Number(total ?? 0) - Number(paid ?? 0)
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
        orderBy = "data_vencimento",
        orderDir = "desc",
    } = options
    const skip = (page - 1) * limit

    const where = buildPayablesWhere(
        { startDate, endDate, status, fornecedor_id, categoria_id, centro_custo_id, search },
        { includeDate: !isOnlyOverdueStatus(status) }
    )

    const [total, data] = await prisma.$transaction([
        prisma.contaPagar.count({ where }),
        prisma.contaPagar.findMany({
            where,
            skip,
            take: limit,
            orderBy: buildPayablesOrderBy(orderBy, orderDir),
            include: {
                fornecedor: { select: { id: true, nome: true } },
                categoria: { select: { id: true, nome: true, cor: true } },
                centro_custo: { select: { id: true, nome: true } },
                pedido_compra: {
                    select: {
                        id: true,
                        obra_id: true,
                        descricao: true,
                    },
                },
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
    const filterWhere = buildPayablesWhere(
        { startDate, endDate, status, fornecedor_id, categoria_id, centro_custo_id, search },
        { includeDate: !isOnlyOverdueStatus(status) }
    )
    const countBaseWhere = buildPayablesWhere(
        { startDate, endDate, fornecedor_id, categoria_id, centro_custo_id, search },
        { includeStatus: false }
    )
    const countNoDateWhere = buildPayablesWhere(
        { fornecedor_id, categoria_id, centro_custo_id, search },
        { includeStatus: false, includeDate: false }
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    const baseWhere = {
        ...countBaseWhere,
        status: { notIn: [StatusFinanceiro.PAGO, StatusFinanceiro.CANCELADO] as StatusFinanceiro[] },
    }

    const statusCountQueries = FINANCIAL_STATUSES.map((itemStatus) =>
        prisma.contaPagar.count({
            where: {
                ...(itemStatus === StatusFinanceiro.ATRASADO ? countNoDateWhere : countBaseWhere),
                status: itemStatus,
            },
        })
    )

    const [filterAggregate, filterCount, totalByDate, totalPending, overdue, dueToday, dueNext7, ...statusCountValues] = await prisma.$transaction([
        prisma.contaPagar.aggregate({
            where: filterWhere,
            _sum: { valor_total: true, valor_pago: true },
        }),
        prisma.contaPagar.count({ where: filterWhere }),
        prisma.contaPagar.count({ where: countBaseWhere }),
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
        ...statusCountQueries,
    ])

    const statusCounts = FINANCIAL_STATUSES.reduce(
        (acc, itemStatus, index) => ({
            ...acc,
            [itemStatus]: Number(statusCountValues[index] ?? 0),
        }),
        { todos: totalByDate } as Record<"todos" | StatusFinanceiro, number>
    )

    return {
        filterCount,
        filterOpenAmount: sumOpenAmount(filterAggregate._sum.valor_total, filterAggregate._sum.valor_pago),
        statusCounts,
        totalAmount: sumOpenAmount(totalPending._sum.valor_total, totalPending._sum.valor_pago),
        totalPending: totalPending._count,
        overdueAmount: sumOpenAmount(overdue._sum.valor_total, overdue._sum.valor_pago),
        overdueCount: overdue._count,
        dueTodayAmount: sumOpenAmount(dueToday._sum.valor_total, dueToday._sum.valor_pago),
        dueTodayCount: dueToday._count,
        dueNext7Amount: sumOpenAmount(dueNext7._sum.valor_total, dueNext7._sum.valor_pago),
        dueNext7Count: dueNext7._count,
    }
}
