import { prisma } from "@/lib/prisma"
import { Prisma, StatusConferencia, TipoLancamento } from "@prisma/client"
import { EXCLUDED_FINANCIAL_GROUP_NAMES } from "@/lib/financial/fixed-category-taxonomy"

export interface GetTransactionsOptions {
    page?: number
    limit?: number
    search?: string
    startDate?: Date
    endDate?: Date
    dateType?: "lancamento" | "competencia"
    conta_bancaria_id?: number
    conta_bancaria_ids?: number[]
    categoria_id?: number
    centro_custo_id?: number
    cost_scope?: "expense" | "cost"
    tipo?: TipoLancamento
    conciliado?: boolean
    orderBy?: TransactionOrderBy
    orderDir?: "asc" | "desc"
}

export type TransactionOrderBy =
    | "data_lancamento"
    | "data_competencia"
    | "tipo"
    | "categoria"
    | "descricao"
    | "conta_bancaria"
    | "centro_custo"
    | "valor"
    | "status_conferencia"
    | "created_at"

function buildTransactionsWhere({
    search,
    startDate,
    endDate,
    dateType = "lancamento",
    conta_bancaria_id,
    conta_bancaria_ids,
    categoria_id,
    centro_custo_id,
    cost_scope,
    tipo,
    conciliado,
}: Omit<GetTransactionsOptions, "page" | "limit" | "orderBy" | "orderDir"> = {}) {
    const where: Prisma.LancamentoWhereInput = {}
    const nonDreExpenseFilter: Prisma.LancamentoWhereInput = {
        NOT: {
            OR: [
                { categoria: { nome: { in: EXCLUDED_FINANCIAL_GROUP_NAMES } } },
                { categoria: { categoria_pai: { nome: { in: EXCLUDED_FINANCIAL_GROUP_NAMES } } } },
            ],
        },
    }

    if (startDate || endDate) {
        const dateField = dateType === "competencia" ? "data_competencia" : "data_lancamento"
        where[dateField] = {}
        if (startDate) where[dateField]!.gte = startDate
        if (endDate) where[dateField]!.lte = endDate
    }

    if (search) {
        where.descricao = { contains: search, mode: "insensitive" }
    }

    if (conta_bancaria_ids && conta_bancaria_ids.length > 0) {
        where.conta_bancaria_id = { in: conta_bancaria_ids }
    } else if (conta_bancaria_id) {
        where.conta_bancaria_id = conta_bancaria_id
    }
    if (categoria_id) where.categoria_id = categoria_id
    if (cost_scope === "cost") {
        where.centro_custo_id = { not: null }
        where.AND = [nonDreExpenseFilter]
    } else if (cost_scope === "expense") {
        where.centro_custo_id = null
        where.AND = [nonDreExpenseFilter]
    } else if (centro_custo_id) {
        where.centro_custo_id = centro_custo_id
    }
    if (tipo) where.tipo = tipo
    if (conciliado === true) where.status_conferencia = StatusConferencia.CONFERIDO
    if (conciliado === false) where.status_conferencia = { not: StatusConferencia.CONFERIDO }

    return where
}

function buildTransactionsOrderBy(orderBy: TransactionOrderBy = "data_lancamento", orderDir: "asc" | "desc" = "desc") {
    const direction = orderDir === "asc" ? "asc" : "desc"
    const fallback: Prisma.LancamentoOrderByWithRelationInput = { id: direction }

    const primary: Prisma.LancamentoOrderByWithRelationInput =
        orderBy === "categoria"
            ? { categoria: { nome: direction } }
            : orderBy === "conta_bancaria"
                ? { conta_bancaria: { nome: direction } }
                : orderBy === "centro_custo"
                    ? { centro_custo: { nome: direction } }
                    : orderBy === "tipo"
                        ? { tipo: direction }
                        : orderBy === "descricao"
                            ? { descricao: direction }
                            : orderBy === "valor"
                                ? { valor: direction }
                                : orderBy === "status_conferencia"
                                    ? { status_conferencia: direction }
                                    : orderBy === "data_competencia"
                                        ? { data_competencia: direction }
                                        : orderBy === "created_at"
                                            ? { created_at: direction }
                                            : { data_lancamento: direction }

    return [primary, fallback]
}

export async function getTransactions(options: GetTransactionsOptions = {}) {
    const {
        page = 1,
        limit = 20,
        search,
        startDate,
        endDate,
        dateType = "lancamento", // default to cash view
        conta_bancaria_id,
        conta_bancaria_ids,
        categoria_id,
        centro_custo_id,
        cost_scope,
        tipo,
        conciliado,
        orderBy = "data_lancamento",
        orderDir = "desc"
    } = options

    const skip = (page - 1) * limit

    const where = buildTransactionsWhere({
        search,
        startDate,
        endDate,
        dateType,
        conta_bancaria_id,
        conta_bancaria_ids,
        categoria_id,
        centro_custo_id,
        cost_scope,
        tipo,
        conciliado,
    })

    // Execute Query with Efficient Selects
    const [total, data] = await prisma.$transaction([
        prisma.lancamento.count({ where }),
        prisma.lancamento.findMany({
            where,
            skip,
            take: limit,
            orderBy: buildTransactionsOrderBy(orderBy, orderDir),
            include: {
                conta_bancaria: {
                    select: { id: true, nome: true, banco: true, cor: true }
                },
                categoria: {
                    select: { id: true, nome: true, cor: true, icone: true, tipo: true }
                },
                centro_custo: {
                    select: { id: true, nome: true }
                },
                // Origins
                conta_pagar: {
                    select: { id: true, descricao: true, fornecedor: { select: { nome: true } } }
                },
                conta_receber: {
                    select: { id: true, descricao: true, cliente: { select: { nome: true } } }
                },
                transferencia: {
                    select: { id: true }
                },
                conferencia_sessoes: {
                    select: {
                        id: true,
                        status: true,
                        periodo_inicio: true,
                        periodo_fim: true,
                    },
                },
                createdBy: {
                    select: { id: true, name: true }
                }
            }
        })
    ])

    return {
        data: data.map((item) => ({
            ...item,
            conciliado: item.status_conferencia === StatusConferencia.CONFERIDO,
            conferencia_sessoes: item.conferencia_sessoes
                ? {
                    ...item.conferencia_sessoes,
                    periodo_inicio: item.conferencia_sessoes.periodo_inicio.toISOString(),
                    periodo_fim: item.conferencia_sessoes.periodo_fim.toISOString(),
                }
                : null,
        })),
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export async function getTransactionsSummary(
    filters: Omit<GetTransactionsOptions, "page" | "limit" | "orderBy" | "orderDir"> = {}
) {
    const where = buildTransactionsWhere(filters)

    const [income, expense, totalCount, reconciledCount] = await prisma.$transaction([
        prisma.lancamento.aggregate({
            where: { ...where, tipo: TipoLancamento.RECEITA },
            _sum: { valor: true },
        }),
        prisma.lancamento.aggregate({
            where: { ...where, tipo: TipoLancamento.DESPESA },
            _sum: { valor: true },
        }),
        prisma.lancamento.count({ where }),
        prisma.lancamento.count({
            where: {
                ...where,
                status_conferencia: StatusConferencia.CONFERIDO,
            },
        }),
    ])

    const incomeAmount = Number(income._sum.valor ?? 0)
    const expenseAmount = Number(expense._sum.valor ?? 0)

    return {
        incomeAmount,
        expenseAmount,
        netAmount: incomeAmount - expenseAmount,
        reconciledCount,
        totalCount,
    }
}
