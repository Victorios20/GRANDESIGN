import { Prisma, StatusFinanceiro, TipoLancamento } from "@prisma/client"
import {
    addDays,
    differenceInCalendarDays,
    eachDayOfInterval,
    eachMonthOfInterval,
    endOfDay,
    endOfMonth,
    format,
    isToday,
    isTomorrow,
    startOfDay,
    startOfMonth,
    subDays,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    type DashboardAppliedFilters,
    type DashboardCashDetail,
    type DashboardChartWindowPreset,
    type DashboardDetailListItem,
    type DashboardEntryDetail,
    type DashboardExpenseCategoryDetail,
    type DashboardExpenseScope,
    type DashboardExpenseSupplierBreakdownItem,
    type DashboardSummary,
    type DashboardTopExpenseItem,
    type UpcomingItem,
} from "@/types/financeiro"
import { getDashboardChartWindowRange } from "@/lib/financeiro-dashboard"
import { prisma } from "@/lib/prisma"
import { EXCLUDED_FINANCIAL_GROUP_NAMES } from "@/lib/financial/fixed-category-taxonomy"

const ACTIVE_STATUSES: StatusFinanceiro[] = ["PENDENTE", "PARCIAL", "ATRASADO"]
const ACTIVE_STATUS_DB_VALUES: Record<StatusFinanceiro, string> = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    PARCIAL: "Parcial",
    ATRASADO: "Atrasado",
    CANCELADO: "Cancelado",
}
const ACTIVE_STATUSES_SQL = Prisma.join(
    ACTIVE_STATUSES.map((status) => Prisma.sql`${ACTIVE_STATUS_DB_VALUES[status]}::"StatusFinanceiro"`),
)
const PERIOD_DETAIL_LIMIT = 10
const CATEGORY_DETAIL_LIMIT = 8
const UPCOMING_VISIBLE_LIMIT = 6
const CASH_DETAIL_MOVEMENT_LIMIT = 10

interface Totals {
    receitas: number
    despesas: number
    resultado: number
}

interface MovementRow {
    bucket: string
    tipo: string
    total: number
}

interface CategoryAggregateRow {
    categoria_id: number
    nome: string
    cor: string | null
    total: number
    lancamentos_count: number
}

interface SupplierAggregateRow {
    supplier_id: number | null
    nome: string | null
    total: number
    lancamentos_count: number
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value == null) return 0
    return Number(value)
}

function roundMoney(value: number) {
    return Number(value.toFixed(2))
}

function parseFilterDate(value: string, end = false) {
    return end ? endOfDay(new Date(`${value}T00:00:00`)) : new Date(`${value}T00:00:00`)
}

function getPeriodRange(filters: DashboardAppliedFilters) {
    return {
        start: parseFilterDate(filters.period_start),
        end: parseFilterDate(filters.period_end, true),
    }
}

function getPreviousRange(filters: DashboardAppliedFilters) {
    const { start, end } = getPeriodRange(filters)
    const dayCount = differenceInCalendarDays(end, start) + 1
    const previousEnd = endOfDay(subDays(start, 1))
    const previousStart = startOfDay(subDays(previousEnd, dayCount - 1))

    return {
        start: previousStart,
        end: previousEnd,
    }
}

function bucketLabel(date: Date, resolution: "day" | "month") {
    return resolution === "day"
        ? format(date, "dd/MM", { locale: ptBR })
        : format(date, "MMM/yy", { locale: ptBR }).replace(".", "")
}

function bucketKey(date: Date, resolution: "day" | "month") {
    return format(date, resolution === "day" ? "yyyy-MM-dd" : "yyyy-MM")
}

function buildBucketPoints(start: Date, end: Date, resolution: "day" | "month", now = new Date()) {
    const dates = resolution === "day" ? eachDayOfInterval({ start, end }) : eachMonthOfInterval({ start, end })

    return dates.map((date) => {
        const rangeStart = resolution === "day" ? startOfDay(date) : startOfMonth(date)
        const rangeEnd = resolution === "day" ? endOfDay(date) : endOfMonth(date)

        return {
            bucket_key: bucketKey(date, resolution),
            label: bucketLabel(date, resolution),
            start: format(rangeStart, "yyyy-MM-dd"),
            end: format(rangeEnd, "yyyy-MM-dd"),
            receitas: 0,
            despesas: 0,
            resultado: 0,
            saldo_acumulado: 0,
            is_current:
                resolution === "day"
                    ? isToday(date)
                    : date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(),
        }
    })
}

function getAccountFilterClause(accountIds: number[]) {
    return accountIds.length > 0 ? Prisma.sql`AND l.conta_bancaria_id IN (${Prisma.join(accountIds)})` : Prisma.empty
}

function getExpenseScopeClause(scope: DashboardExpenseScope) {
    return scope === "cost" ? Prisma.sql`AND l.centro_custo_id IS NOT NULL` : Prisma.sql`AND l.centro_custo_id IS NULL`
}

function getExcludedExpenseCategoryClause(alias: string) {
    return Prisma.sql`
        AND NOT EXISTS (
            SELECT 1
            FROM categorias child
            LEFT JOIN categorias parent ON parent.id = child.categoria_pai_id
            WHERE child.id = ${Prisma.raw(`${alias}.categoria_id`)}
              AND (
                child.nome IN (${Prisma.join(EXCLUDED_FINANCIAL_GROUP_NAMES)})
                OR parent.nome IN (${Prisma.join(EXCLUDED_FINANCIAL_GROUP_NAMES)})
              )
        )
    `
}

function buildTransactionHref({
    start,
    end,
    accountIds,
    categoriaId,
    tipo,
    costScope,
}: {
    start: string
    end: string
    accountIds?: number[]
    categoriaId?: number
    tipo?: "RECEITA" | "DESPESA"
    costScope?: DashboardExpenseScope
}) {
    const params = new URLSearchParams()
    params.set("page", "1")
    params.set("limit", "50")
    params.set("dateType", "competencia")
    params.set("startDate", start)
    params.set("endDate", end)
    if (accountIds && accountIds.length > 1) {
        params.set("conta_bancaria_ids", accountIds.join(","))
    } else if (accountIds && accountIds.length === 1) {
        params.set("conta_bancaria_id", String(accountIds[0]))
    }
    if (categoriaId) {
        params.set("categoria_id", String(categoriaId))
    }
    if (tipo) {
        params.set("tipo", tipo)
    }
    if (costScope) {
        params.set("cost_scope", costScope)
    }
    return `/lancamentos?${params.toString()}`
}

function buildPayableHref({
    start,
    end,
    categoriaId,
    supplierId,
    search,
}: {
    start?: string
    end?: string
    categoriaId?: number
    supplierId?: number | null
    search?: string
}) {
    const params = new URLSearchParams()
    params.set("page", "1")
    params.set("limit", "50")
    params.set("status", ACTIVE_STATUSES.join(","))
    if (start) params.set("startDate", start)
    if (end) params.set("endDate", end)
    if (categoriaId) params.set("categoria_id", String(categoriaId))
    if (supplierId) params.set("fornecedor_id", String(supplierId))
    if (search) params.set("search", search)
    return `/contas-pagar?${params.toString()}`
}

function buildReceivableHref({
    start,
    end,
    search,
}: {
    start?: string
    end?: string
    search?: string
}) {
    const params = new URLSearchParams()
    params.set("page", "1")
    params.set("limit", "50")
    params.set("status", ACTIVE_STATUSES.join(","))
    if (start) params.set("startDate", start)
    if (end) params.set("endDate", end)
    if (search) params.set("search", search)
    return `/contas-receber?${params.toString()}`
}

function buildUpcomingBadge(dateValue: Date) {
    const today = startOfDay(new Date())
    const dueDate = startOfDay(dateValue)
    const diff = differenceInCalendarDays(dueDate, today)

    if (diff < 0) {
        return { urgency: "overdue" as const, badge_label: "Vencido" }
    }

    if (isToday(dueDate)) {
        return { urgency: "today" as const, badge_label: "Hoje" }
    }

    if (isTomorrow(dueDate)) {
        return { urgency: "tomorrow" as const, badge_label: "Amanhã" }
    }

    return { urgency: "upcoming" as const, badge_label: `Em ${diff} dias` }
}

function toUpcomingItem(
    item: {
        id: number
        descricao: string
        valor_total: Prisma.Decimal | number
        valor_pago?: Prisma.Decimal | number
        valor_recebido?: Prisma.Decimal | number
        data_vencimento: Date
        categoria: { nome: string }
        fornecedor?: { nome: string } | null
        cliente?: { nome: string } | null
    },
    tipo: "pagar" | "receber",
): UpcomingItem {
    const badge = buildUpcomingBadge(item.data_vencimento)
    const paidAmount = tipo === "pagar" ? toNumber(item.valor_pago) : toNumber(item.valor_recebido)
    const amount = toNumber(item.valor_total) - paidAmount

    return {
        id: item.id,
        descricao: item.descricao,
        valor_pendente: amount,
        data_vencimento: item.data_vencimento.toISOString(),
        tipo,
        entidade: tipo === "pagar" ? item.fornecedor?.nome ?? null : item.cliente?.nome ?? null,
        categoria: item.categoria.nome,
        urgency: badge.urgency,
        badge_label: badge.badge_label,
        route_href:
            tipo === "pagar"
                ? buildPayableHref({
                      start: format(item.data_vencimento, "yyyy-MM-dd"),
                      end: format(item.data_vencimento, "yyyy-MM-dd"),
                      search: item.descricao,
                  })
                : buildReceivableHref({
                      start: format(item.data_vencimento, "yyyy-MM-dd"),
                      end: format(item.data_vencimento, "yyyy-MM-dd"),
                      search: item.descricao,
                  }),
    }
}

function mergeTotals(target: Totals, source: Totals) {
    return {
        receitas: target.receitas + source.receitas,
        despesas: target.despesas + source.despesas,
        resultado: target.resultado + source.resultado,
    }
}

function emptyTotals(): Totals {
    return { receitas: 0, despesas: 0, resultado: 0 }
}

async function getRealizedTotals(range: { start: Date; end: Date }, accountIds: number[]) {
    const rows = await prisma.$queryRaw<Array<{ tipo: string; total: number }>>(Prisma.sql`
        SELECT
            l.tipo,
            COALESCE(SUM(l.valor), 0)::float AS total
        FROM lancamentos l
        WHERE l.data_competencia >= ${range.start}
          AND l.data_competencia <= ${range.end}
          ${getAccountFilterClause(accountIds)}
        GROUP BY l.tipo
    `)

    return rows.reduce<Totals>((acc, row) => {
        if (row.tipo === "Receita") acc.receitas = row.total
        if (row.tipo === "Despesa") acc.despesas = row.total
        acc.resultado = acc.receitas - acc.despesas
        return acc
    }, emptyTotals())
}

async function getForecastTotals(range: { start: Date; end: Date }) {
    const [receber, pagar] = await Promise.all([
        prisma.contaReceber.aggregate({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: range.start, lte: range.end },
            },
            _sum: {
                valor_total: true,
                valor_recebido: true,
            },
        }),
        prisma.contaPagar.aggregate({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: range.start, lte: range.end },
            },
            _sum: {
                valor_total: true,
                valor_pago: true,
            },
        }),
    ])

    const receitas = toNumber(receber._sum.valor_total) - toNumber(receber._sum.valor_recebido)
    const despesas = toNumber(pagar._sum.valor_total) - toNumber(pagar._sum.valor_pago)

    return {
        receitas,
        despesas,
        resultado: receitas - despesas,
    }
}

async function getTotalsByStatus(filters: DashboardAppliedFilters, range = getPeriodRange(filters)) {
    if (filters.analysis_status === "realizado") {
        return getRealizedTotals(range, filters.account_ids)
    }

    if (filters.analysis_status === "previsto") {
        return getForecastTotals(range)
    }

    const [realized, forecast] = await Promise.all([
        getRealizedTotals(range, filters.account_ids),
        getForecastTotals(range),
    ])

    return mergeTotals(realized, forecast)
}

async function getRealizedMovementRows(
    range: { start: Date; end: Date },
    resolution: "day" | "month",
    accountIds: number[],
) {
    const bucketExpression =
        resolution === "day"
            ? Prisma.sql`to_char(l.data_competencia, 'YYYY-MM-DD')`
            : Prisma.sql`to_char(l.data_competencia, 'YYYY-MM')`

    return prisma.$queryRaw<MovementRow[]>(Prisma.sql`
        SELECT
            ${bucketExpression} AS bucket,
            l.tipo,
            COALESCE(SUM(l.valor), 0)::float AS total
        FROM lancamentos l
        WHERE l.data_competencia >= ${range.start}
          AND l.data_competencia <= ${range.end}
          ${getAccountFilterClause(accountIds)}
        GROUP BY bucket, l.tipo
        ORDER BY bucket ASC
    `)
}

async function getForecastMovementRows(range: { start: Date; end: Date }, resolution: "day" | "month") {
    const payableBucket =
        resolution === "day"
            ? Prisma.sql`to_char(cp.data_vencimento, 'YYYY-MM-DD')`
            : Prisma.sql`to_char(cp.data_vencimento, 'YYYY-MM')`

    const receivableBucket =
        resolution === "day"
            ? Prisma.sql`to_char(cr.data_vencimento, 'YYYY-MM-DD')`
            : Prisma.sql`to_char(cr.data_vencimento, 'YYYY-MM')`

    const [receitas, despesas] = await Promise.all([
        prisma.$queryRaw<MovementRow[]>(Prisma.sql`
            SELECT
                ${receivableBucket} AS bucket,
                'Receita' AS tipo,
                COALESCE(SUM(cr.valor_total - cr.valor_recebido), 0)::float AS total
            FROM contas_receber cr
            WHERE cr.status IN (${ACTIVE_STATUSES_SQL})
              AND cr.data_vencimento >= ${range.start}
              AND cr.data_vencimento <= ${range.end}
            GROUP BY bucket
            ORDER BY bucket ASC
        `),
        prisma.$queryRaw<MovementRow[]>(Prisma.sql`
            SELECT
                ${payableBucket} AS bucket,
                'Despesa' AS tipo,
                COALESCE(SUM(cp.valor_total - cp.valor_pago), 0)::float AS total
            FROM contas_pagar cp
            WHERE cp.status IN (${ACTIVE_STATUSES_SQL})
              AND cp.data_vencimento >= ${range.start}
              AND cp.data_vencimento <= ${range.end}
            GROUP BY bucket
            ORDER BY bucket ASC
        `),
    ])

    return [...receitas, ...despesas]
}

async function getCurrentCashBalance(accountIds: number[]) {
    const bankAgg = await prisma.contasBancaria.aggregate({
        _sum: { saldo_atual: true },
        where: {
            ativo: true,
            ...(accountIds.length > 0 ? { id: { in: accountIds } } : {}),
        },
    })

    return roundMoney(toNumber(bankAgg._sum.saldo_atual))
}

function getMovementNet(rows: MovementRow[]) {
    return roundMoney(
        rows.reduce((total, row) => {
        if (row.tipo === "Receita") return total + row.total
        if (row.tipo === "Despesa") return total - row.total
        return total
        }, 0),
    )
}

async function buildEvolutionData(filters: DashboardAppliedFilters, windowPreset: DashboardChartWindowPreset) {
    const range = getDashboardChartWindowRange(windowPreset)
    const resolution = range.resolution
    const points = buildBucketPoints(range.start, range.end, resolution)
    const pointMap = new Map(points.map((point) => [point.bucket_key, point]))

    const [realizedRows, currentBalance] = await Promise.all([
        getRealizedMovementRows(range, resolution, filters.account_ids),
        getCurrentCashBalance(filters.account_ids),
    ])

    const forecastRows =
        filters.analysis_status === "previsto" || filters.analysis_status === "ambos"
            ? await getForecastMovementRows(range, resolution)
            : []

    const rows =
        filters.analysis_status === "realizado"
            ? realizedRows
            : filters.analysis_status === "previsto"
              ? forecastRows
              : [...realizedRows, ...forecastRows]

    for (const row of rows) {
        const entry = pointMap.get(row.bucket)
        if (!entry) continue

        if (row.tipo === "Receita") {
            entry.receitas = roundMoney(entry.receitas + row.total)
        }

        if (row.tipo === "Despesa") {
            entry.despesas = roundMoney(entry.despesas + row.total)
        }

        entry.resultado = roundMoney(entry.receitas - entry.despesas)
    }

    const saldoInicial = roundMoney(currentBalance - getMovementNet(realizedRows))
    let saldoAcumulado = saldoInicial

    for (const point of points) {
        saldoAcumulado = roundMoney(saldoAcumulado + point.resultado)
        point.saldo_acumulado = saldoAcumulado
    }

    const summary = points.reduce(
        (acc, point) => ({
            receitas: roundMoney(acc.receitas + point.receitas),
            despesas: roundMoney(acc.despesas + point.despesas),
            resultado: roundMoney(acc.resultado + point.resultado),
            saldo_acumulado: point.saldo_acumulado,
        }),
        {
            ...emptyTotals(),
            saldo_acumulado: saldoInicial,
        },
    )

    return {
        title: "Evolução financeira",
        subtitle: "Receitas, despesas e saldo acumulado.",
        window_preset: windowPreset,
        range_label: range.label,
        resolution,
        summary,
        points,
    }
}

async function getRealizedExpenseCategories(
    range: { start: Date; end: Date },
    accountIds: number[],
    scope: DashboardExpenseScope,
) {
    return prisma.$queryRaw<CategoryAggregateRow[]>(Prisma.sql`
        SELECT
            l.categoria_id,
            c.nome,
            c.cor,
            COALESCE(SUM(l.valor), 0)::float AS total,
            COUNT(*)::int AS lancamentos_count
        FROM lancamentos l
        JOIN categorias c ON c.id = l.categoria_id
        WHERE l.tipo = 'Despesa'
          AND l.data_competencia >= ${range.start}
          AND l.data_competencia <= ${range.end}
          ${getAccountFilterClause(accountIds)}
          ${getExpenseScopeClause(scope)}
          ${getExcludedExpenseCategoryClause("l")}
        GROUP BY l.categoria_id, c.nome, c.cor
        ORDER BY total DESC, lancamentos_count DESC, c.nome ASC
    `)
}

async function getExpenseCategories(
    filters: DashboardAppliedFilters,
    scope: DashboardExpenseScope,
    range = getPeriodRange(filters),
) {
    return getRealizedExpenseCategories(range, filters.account_ids, scope)
}

async function getCategorySpikeAlert(filters: DashboardAppliedFilters) {
    const currentCategories = await getExpenseCategories(filters, "expense")
    const previousCategories = await getExpenseCategories(filters, "expense", getPreviousRange(filters))
    const previousMap = new Map(previousCategories.map((item) => [item.categoria_id, item.total]))

    let selected: { categoria_id: number; nome: string; current: number; previous: number } | null = null

    for (const category of currentCategories) {
        const previousValue = previousMap.get(category.categoria_id) ?? 0
        if (category.total <= previousValue) continue

        if (!selected || category.total - previousValue > selected.current - selected.previous) {
            selected = {
                categoria_id: category.categoria_id,
                nome: category.nome,
                current: category.total,
                previous: previousValue,
            }
        }
    }

    return selected
}

void getCategorySpikeAlert

async function getSummaryAlerts() {
    return []
    /*
    const next7Start = startOfDay(new Date())
    const next7End = endOfDay(addDays(next7Start, 7))
    const [settings, overdueCount, dueTodayCount, receivablesNext7Count, previousTotals, categorySpike] =
        await Promise.all([
            getCashFlowSettings(),
            prisma.contaPagar.count({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { lt: next7Start },
                },
            }),
            prisma.contaPagar.count({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { gte: next7Start, lte: endOfDay(next7Start) },
                },
            }),
            prisma.contaReceber.count({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { gte: next7Start, lte: next7End },
                },
            }),
            getTotalsByStatus(filters, getPreviousRange(filters)),
            getCategorySpikeAlert(filters),
        ])

    const alerts: DashboardSummary["alerts"]["items"] = []

    if (projectedBalance < settings.safety_limit) {
        alerts.push({
            id: "projected-below-limit",
            priority: 1,
            tone: "critical",
            title: "Saldo projetado abaixo do limite mínimo",
            description: "A projeção está abaixo do limite de segurança configurado para o caixa.",
            cta_label: "Ver fluxo de caixa",
            cta_href: "/relatorios/fluxo-caixa",
        })
    }

    if (overdueCount > 0 || dueTodayCount > 0) {
        alerts.push({
            id: "urgent-payables",
            priority: 2,
            tone: "warning",
            title: "Pagamentos exigem atenção imediata",
            description:
                overdueCount > 0
                    ? `${overdueCount} pagamento(s) estão vencidos e ${dueTodayCount} vencem hoje.`
                    : `${dueTodayCount} pagamento(s) vencem hoje.`,
            cta_label: "Ver contas a pagar",
            cta_href: "/contas-pagar?scope=overdue",
        })
    }

    if (receivablesNext7Count === 0) {
        alerts.push({
            id: "no-receivables",
            priority: 3,
            tone: "info",
            title: "Sem recebimentos previstos para os próximos 7 dias",
            description: "Não há entradas futuras cadastradas no curto prazo.",
            cta_label: "Ver contas a receber",
            cta_href: "/contas-receber?scope=next7",
        })
    }

    if (categorySpike) {
        alerts.push({
            id: "category-spike",
            priority: 4,
            tone: "warning",
            title: `Alta de despesa em ${categorySpike.nome}`,
            description: "A categoria acelerou em relação ao período anterior e merece revisão.",
            cta_label: "Ver categoria",
            cta_href: buildTransactionHref({
                start: filters.period_start,
                end: filters.period_end,
                accountIds: filters.account_ids,
                categoriaId: categorySpike.categoria_id,
                tipo: "DESPESA",
            }),
        })
    }

    if (resultTotals.resultado < previousTotals.resultado) {
        alerts.push({
            id: "result-drop",
            priority: 5,
            tone: "info",
            title: "Resultado do período abaixo do comparativo anterior",
            description: "O desempenho operacional recuou em relação ao intervalo equivalente anterior.",
            cta_label: "Ver detalhes do período",
            cta_href: buildTransactionHref({
                start: filters.period_start,
                end: filters.period_end,
                accountIds: filters.account_ids,
            }),
        })
    }

    return alerts.sort((left, right) => left.priority - right.priority).slice(0, MAX_ALERTS)
    */
}

async function getUpcomingPayables() {
    const start = startOfDay(new Date())
    const end = endOfDay(addDays(start, 7))
    const where = {
        status: { in: ACTIVE_STATUSES },
        data_vencimento: { gte: start, lte: end },
    } satisfies Prisma.ContaPagarWhereInput
    const [count, rows] = await Promise.all([
        prisma.contaPagar.count({ where }),
        prisma.contaPagar.findMany({
            where,
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_pago: true,
                data_vencimento: true,
                fornecedor: { select: { nome: true } },
                categoria: { select: { nome: true } },
            },
            orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
            take: UPCOMING_VISIBLE_LIMIT,
        }),
    ])

    return {
        items: rows.map((item) => toUpcomingItem(item, "pagar")),
        remaining_count: Math.max(count - UPCOMING_VISIBLE_LIMIT, 0),
    }
}

async function getUpcomingReceivables() {
    const start = startOfDay(new Date())
    const end = endOfDay(addDays(start, 7))
    const where = {
        status: { in: ACTIVE_STATUSES },
        data_vencimento: { gte: start, lte: end },
    } satisfies Prisma.ContaReceberWhereInput
    const [count, rows] = await Promise.all([
        prisma.contaReceber.count({ where }),
        prisma.contaReceber.findMany({
            where,
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_recebido: true,
                data_vencimento: true,
                cliente: { select: { nome: true } },
                categoria: { select: { nome: true } },
            },
            orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
            take: UPCOMING_VISIBLE_LIMIT,
        }),
    ])

    return {
        items: rows.map((item) => toUpcomingItem(item, "receber")),
        remaining_count: Math.max(count - UPCOMING_VISIBLE_LIMIT, 0),
    }
}

async function getCashComposition(accountIds: number[]) {
    return prisma.contasBancaria.findMany({
        where: {
            ativo: true,
            ...(accountIds.length > 0 ? { id: { in: accountIds } } : {}),
        },
        select: {
            id: true,
            nome: true,
            tipo: true,
            banco: true,
            saldo_atual: true,
        },
        orderBy: [{ saldo_atual: "desc" }, { nome: "asc" }],
    })
}

async function getCashMovementDetailItems(accountIds: number[]) {
    const rows = await prisma.lancamento.findMany({
        where: accountIds.length > 0 ? { conta_bancaria_id: { in: accountIds } } : {},
        select: {
            id: true,
            descricao: true,
            valor: true,
            tipo: true,
            data_competencia: true,
            conta_bancaria_id: true,
            conta_bancaria: { select: { nome: true } },
            categoria: { select: { nome: true } },
            conta_pagar: { select: { fornecedor: { select: { nome: true } } } },
            conta_receber: { select: { cliente: { select: { nome: true } } } },
        },
        orderBy: [{ data_competencia: "desc" }, { id: "desc" }],
        take: CASH_DETAIL_MOVEMENT_LIMIT,
    })

    return rows.map((item) =>
        mapDetailItem({
            id: item.id,
            title: item.descricao,
            subtitle: [
                item.conta_bancaria?.nome,
                item.categoria.nome,
                item.tipo === TipoLancamento.RECEITA ? item.conta_receber?.cliente?.nome : item.conta_pagar?.fornecedor?.nome,
            ]
                .filter(Boolean)
                .join(" • "),
            amount: toNumber(item.valor),
            date: item.data_competencia.toISOString(),
            source: "realizado",
            tone: item.tipo === TipoLancamento.RECEITA ? "positive" : "negative",
            href: buildTransactionHref({
                start: format(item.data_competencia, "yyyy-MM-dd"),
                end: format(item.data_competencia, "yyyy-MM-dd"),
                accountIds: item.conta_bancaria_id ? [item.conta_bancaria_id] : undefined,
                tipo: item.tipo === TipoLancamento.RECEITA ? "RECEITA" : "DESPESA",
            }),
        }),
    )
}

function mapDetailItem(item: {
    id: number
    title: string
    subtitle: string
    amount: number
    date: string
    source: "realizado" | "previsto"
    tone: "positive" | "negative" | "neutral"
    href: string
}): DashboardDetailListItem {
    return item
}

async function getRealizedDetailItems(filters: DashboardAppliedFilters, range: { start: Date; end: Date }, limit: number) {
    const rows = await prisma.lancamento.findMany({
        where: {
            data_competencia: { gte: range.start, lte: range.end },
            ...(filters.account_ids.length > 0 ? { conta_bancaria_id: { in: filters.account_ids } } : {}),
        },
        select: {
            id: true,
            descricao: true,
            valor: true,
            tipo: true,
            data_competencia: true,
            categoria: { select: { nome: true } },
            conta_pagar: { select: { fornecedor: { select: { nome: true } } } },
            conta_receber: { select: { cliente: { select: { nome: true } } } },
        },
        orderBy: [{ data_competencia: "desc" }, { id: "desc" }],
        take: limit,
    })

    return rows.map((item) =>
        mapDetailItem({
            id: item.id,
            title: item.descricao,
            subtitle:
                item.tipo === TipoLancamento.RECEITA
                    ? [item.categoria.nome, item.conta_receber?.cliente?.nome].filter(Boolean).join(" • ")
                    : [item.categoria.nome, item.conta_pagar?.fornecedor?.nome].filter(Boolean).join(" • "),
            amount: toNumber(item.valor),
            date: item.data_competencia.toISOString(),
            source: "realizado",
            tone: item.tipo === TipoLancamento.RECEITA ? "positive" : "negative",
            href: buildTransactionHref({
                start: format(item.data_competencia, "yyyy-MM-dd"),
                end: format(item.data_competencia, "yyyy-MM-dd"),
                accountIds: filters.account_ids,
                tipo: item.tipo === TipoLancamento.RECEITA ? "RECEITA" : "DESPESA",
            }),
        }),
    )
}

async function getForecastDetailItems(range: { start: Date; end: Date }, limit: number) {
    const [payables, receivables] = await Promise.all([
        prisma.contaPagar.findMany({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: range.start, lte: range.end },
            },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_pago: true,
                data_vencimento: true,
                categoria: { select: { nome: true } },
                fornecedor: { select: { nome: true } },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
            take: limit,
        }),
        prisma.contaReceber.findMany({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: range.start, lte: range.end },
            },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_recebido: true,
                data_vencimento: true,
                categoria: { select: { nome: true } },
                cliente: { select: { nome: true } },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
            take: limit,
        }),
    ])

    const expenseItems = payables.map((item) =>
        mapDetailItem({
            id: item.id,
            title: item.descricao,
            subtitle: [item.categoria.nome, item.fornecedor?.nome].filter(Boolean).join(" • "),
            amount: toNumber(item.valor_total) - toNumber(item.valor_pago),
            date: item.data_vencimento.toISOString(),
            source: "previsto",
            tone: "negative",
            href: buildPayableHref({
                start: format(item.data_vencimento, "yyyy-MM-dd"),
                end: format(item.data_vencimento, "yyyy-MM-dd"),
                search: item.descricao,
            }),
        }),
    )

    const incomeItems = receivables.map((item) =>
        mapDetailItem({
            id: item.id,
            title: item.descricao,
            subtitle: [item.categoria.nome, item.cliente?.nome].filter(Boolean).join(" • "),
            amount: toNumber(item.valor_total) - toNumber(item.valor_recebido),
            date: item.data_vencimento.toISOString(),
            source: "previsto",
            tone: "positive",
            href: buildReceivableHref({
                start: format(item.data_vencimento, "yyyy-MM-dd"),
                end: format(item.data_vencimento, "yyyy-MM-dd"),
                search: item.descricao,
            }),
        }),
    )

    return [...expenseItems, ...incomeItems]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, limit)
}

async function getCategorySupplierBreakdown(
    filters: DashboardAppliedFilters,
    categoriaId: number,
    scope: DashboardExpenseScope,
) {
    const range = getPeriodRange(filters)

    const buildHref = () =>
        buildTransactionHref({
            start: filters.period_start,
            end: filters.period_end,
            accountIds: filters.account_ids,
            categoriaId,
            tipo: "DESPESA",
            costScope: scope,
        })

    const realizedRows = await prisma.$queryRaw<SupplierAggregateRow[]>(Prisma.sql`
        SELECT
            f.id AS supplier_id,
            f.nome,
            COALESCE(SUM(l.valor), 0)::float AS total,
            COUNT(*)::int AS lancamentos_count
        FROM lancamentos l
        LEFT JOIN contas_pagar cp ON cp.id = l.conta_pagar_id
        LEFT JOIN fornecedores f ON f.id = cp.fornecedor_id
        WHERE l.tipo = 'Despesa'
          AND l.categoria_id = ${categoriaId}
          AND l.data_competencia >= ${range.start}
          AND l.data_competencia <= ${range.end}
          ${getAccountFilterClause(filters.account_ids)}
          ${getExpenseScopeClause(scope)}
          ${getExcludedExpenseCategoryClause("l")}
        GROUP BY f.id, f.nome
    `)

    const grouped = new Map<string, DashboardExpenseSupplierBreakdownItem>()

    for (const row of realizedRows) {
        const key = String(row.supplier_id ?? "none")
        const current = grouped.get(key)

        if (!current) {
            grouped.set(key, {
                supplier_id: row.supplier_id,
                nome: row.nome ?? "Sem fornecedor vinculado",
                total: row.total,
                lancamentos_count: row.lancamentos_count,
                href: buildHref(),
            })
            continue
        }

        current.total += row.total
        current.lancamentos_count += row.lancamentos_count
    }

    return Array.from(grouped.values()).sort((left, right) => right.total - left.total)
}

async function getCategoryLatestItems(
    filters: DashboardAppliedFilters,
    categoriaId: number,
    scope: DashboardExpenseScope,
) {
    const range = getPeriodRange(filters)
    const items: DashboardDetailListItem[] = []

    if (filters.analysis_status === "realizado" || filters.analysis_status === "previsto" || filters.analysis_status === "ambos") {
        const realized = await prisma.lancamento.findMany({
            where: {
                categoria_id: categoriaId,
                tipo: TipoLancamento.DESPESA,
                data_competencia: { gte: range.start, lte: range.end },
                ...(scope === "cost" ? { centro_custo_id: { not: null } } : { centro_custo_id: null }),
                NOT: {
                    OR: [
                        { categoria: { nome: { in: EXCLUDED_FINANCIAL_GROUP_NAMES } } },
                        { categoria: { categoria_pai: { nome: { in: EXCLUDED_FINANCIAL_GROUP_NAMES } } } },
                    ],
                },
                ...(filters.account_ids.length > 0 ? { conta_bancaria_id: { in: filters.account_ids } } : {}),
            },
            select: {
                id: true,
                descricao: true,
                valor: true,
                data_competencia: true,
                categoria: { select: { nome: true } },
                conta_pagar: { select: { fornecedor: { select: { nome: true } } } },
            },
            orderBy: [{ data_competencia: "desc" }, { id: "desc" }],
            take: CATEGORY_DETAIL_LIMIT,
        })

        items.push(
            ...realized.map((item) =>
                mapDetailItem({
                    id: item.id,
                    title: item.descricao,
                    subtitle: [item.categoria.nome, item.conta_pagar?.fornecedor?.nome].filter(Boolean).join(" • "),
                    amount: toNumber(item.valor),
                    date: item.data_competencia.toISOString(),
                    source: "realizado",
                    tone: "negative",
                    href: buildTransactionHref({
                        start: format(item.data_competencia, "yyyy-MM-dd"),
                        end: format(item.data_competencia, "yyyy-MM-dd"),
                        accountIds: filters.account_ids,
                        categoriaId,
                        tipo: "DESPESA",
                        costScope: scope,
                    }),
                }),
            ),
        )
    }

    if (false) {
        const forecast = await prisma.contaPagar.findMany({
            where: {
                categoria_id: categoriaId,
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: range.start, lte: range.end },
            },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_pago: true,
                data_vencimento: true,
                categoria: { select: { nome: true } },
                fornecedor: { select: { nome: true } },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
            take: CATEGORY_DETAIL_LIMIT,
        })

        items.push(
            ...forecast.map((item) =>
                mapDetailItem({
                    id: item.id,
                    title: item.descricao,
                    subtitle: [item.categoria.nome, item.fornecedor?.nome].filter(Boolean).join(" • "),
                    amount: toNumber(item.valor_total) - toNumber(item.valor_pago),
                    date: item.data_vencimento.toISOString(),
                    source: "previsto",
                    tone: "negative",
                    href: buildPayableHref({
                        start: format(item.data_vencimento, "yyyy-MM-dd"),
                        end: format(item.data_vencimento, "yyyy-MM-dd"),
                        categoriaId,
                        search: item.descricao,
                    }),
                }),
            ),
        )
    }

    return items.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).slice(0, CATEGORY_DETAIL_LIMIT)
}

export async function getDashboardTopExpensesData(
    filters: DashboardAppliedFilters,
    scope: DashboardExpenseScope,
): Promise<DashboardSummary["top_expenses"]> {
    const expenseRows = await getExpenseCategories(filters, scope)
    const totalDespesas = expenseRows.reduce((sum, row) => sum + row.total, 0)
    const items: DashboardTopExpenseItem[] = expenseRows.slice(0, 5).map((row) => ({
        categoria_id: row.categoria_id,
        nome: row.nome,
        cor: row.cor,
        total: row.total,
        percentual_total: totalDespesas > 0 ? (row.total / totalDespesas) * 100 : 0,
        lancamentos_count: row.lancamentos_count,
    }))

    return {
        title: "Maiores despesas do período",
        subtitle:
            scope === "cost"
                ? "Custos realizados por categoria com centro de custo."
                : "Despesas realizadas por categoria no período.",
        scope,
        total_despesas: totalDespesas,
        items,
    }
}

export async function getDashboardSummaryData(filters: DashboardAppliedFilters): Promise<DashboardSummary> {
    const next30Range = {
        start: startOfDay(new Date()),
        end: endOfDay(addDays(new Date(), 30)),
    }

    const [banks, resultTotals, previousTotals, evolution, topExpensesSummary, upcomingPayables, upcomingReceivables] =
        await Promise.all([
            getCashComposition(filters.account_ids),
            getTotalsByStatus(filters),
            getTotalsByStatus(filters, getPreviousRange(filters)),
            buildEvolutionData(filters, "3m"),
            getDashboardTopExpensesData(filters, "expense"),
            getUpcomingPayables(),
            getUpcomingReceivables(),
        ])

    const saldoDisponivel = banks.reduce((sum, bank) => sum + toNumber(bank.saldo_atual), 0)
    const [futureReceitas, futureDespesas] = await Promise.all([
        prisma.contaReceber.aggregate({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: next30Range.start, lte: next30Range.end },
            },
            _sum: {
                valor_total: true,
                valor_recebido: true,
            },
        }),
        prisma.contaPagar.aggregate({
            where: {
                status: { in: ACTIVE_STATUSES },
                data_vencimento: { gte: next30Range.start, lte: next30Range.end },
            },
            _sum: {
                valor_total: true,
                valor_pago: true,
            },
        }),
    ])

    const entradasPrevistas = toNumber(futureReceitas._sum.valor_total) - toNumber(futureReceitas._sum.valor_recebido)
    const saidasPrevistas = toNumber(futureDespesas._sum.valor_total) - toNumber(futureDespesas._sum.valor_pago)
    const saldoProjetado = saldoDisponivel + entradasPrevistas - saidasPrevistas
    const totalDespesas = topExpensesSummary.total_despesas
    const topExpenses = topExpensesSummary.items
    const alerts = await getSummaryAlerts()

    return {
        header_context: {
            title: "Dashboard Financeiro",
            subtitle: "Caixa, resultado e agenda financeira.",
        },
        filters_applied: filters,
        kpis: {
            saldo_disponivel: {
                label: "Saldo disponivel",
                value: saldoDisponivel,
                anchor_label: "Hoje",
            },
            resultado_periodo: {
                label: "Resultado",
                value: resultTotals.resultado,
                anchor_label: filters.period_label,
                comparison: {
                    label: "vs período anterior",
                    value: resultTotals.resultado - previousTotals.resultado,
                },
            },
            saidas_previstas: {
                label: "Saídas previstas",
                microcopy: "Pagamentos e compromissos previstos nos próximos 30 dias.",
                value: saidasPrevistas,
                anchor_label: "Próximos 30 dias",
            },
            saldo_projetado: {
                label: "Saldo projetado",
                microcopy: "Saldo estimado considerando entradas e saídas previstas.",
                value: saldoProjetado,
                anchor_label: "Próximos 30 dias",
                comparison: {
                    label: "vs saldo disponível",
                    value: saldoProjetado - saldoDisponivel,
                },
            },
        },
        evolution: {
            title: "Evolução financeira",
            subtitle: "Receitas, despesas e saldo acumulado.",
            window_preset: evolution.window_preset,
            range_label: evolution.range_label,
            resolution: evolution.resolution,
            summary: evolution.summary,
            points: evolution.points,
        },
        top_expenses: {
            title: "Maiores despesas do período",
            subtitle: "Base realizada por categoria no período atual.",
            scope: topExpensesSummary.scope,
            total_despesas: totalDespesas,
            items: topExpenses,
        },
        alerts: {
            title: "Pontos de atenção",
            subtitle: "Sinais relevantes para acompanhamento rápido da operação.",
            items: alerts,
        },
        upcoming_payables: {
            title: "Pagamentos a vencer",
            subtitle: "Compromissos com vencimento nos próximos dias.",
            items: upcomingPayables.items,
            remaining_count: upcomingPayables.remaining_count,
        },
        upcoming_receivables: {
            title: "Recebimentos previstos",
            subtitle: "Entradas esperadas para os próximos dias.",
            items: upcomingReceivables.items,
            remaining_count: upcomingReceivables.remaining_count,
        },
        cash_composition: {
            title: "Composição do caixa",
            subtitle: "Distribuição do saldo entre as contas selecionadas.",
            total: saldoDisponivel,
            items: banks.map((bank) => ({
                id: bank.id,
                nome: bank.nome,
                tipo: bank.tipo,
                banco: bank.banco,
                saldo_atual: toNumber(bank.saldo_atual),
            })),
        },
    }
}

export async function getDashboardEvolutionData(filters: DashboardAppliedFilters, windowPreset: DashboardChartWindowPreset) {
    return buildEvolutionData(filters, windowPreset)
}

export async function getDashboardCashDetailData(accountIds: number[]): Promise<DashboardCashDetail> {
    const accounts = await getCashComposition(accountIds)
    const normalizedIds = accountIds.length > 0 ? accountIds : accounts.map((account) => account.id)
    const total = accounts.reduce((sum, account) => sum + toNumber(account.saldo_atual), 0)
    const latest_movements = normalizedIds.length > 0 ? await getCashMovementDetailItems(normalizedIds) : []

    return {
        title: "Composição do caixa",
        subtitle: "Contas ativas e ultimos movimentos.",
        total,
        accounts: accounts.map((account) => ({
            id: account.id,
            nome: account.nome,
            tipo: account.tipo,
            banco: account.banco,
            saldo_atual: toNumber(account.saldo_atual),
        })),
        latest_movements,
        cta_label: "Abrir lançamentos",
        cta_href: "/lancamentos",
    }
}

export async function getDashboardPeriodDetailData(filters: DashboardAppliedFilters, periodStart: string, periodEnd: string) {
    const range = {
        start: parseFilterDate(periodStart),
        end: parseFilterDate(periodEnd, true),
    }
    const scopedFilters: DashboardAppliedFilters = {
        ...filters,
        period_start: periodStart,
        period_end: periodEnd,
    }

    const [totals, realizedItems, forecastItems] = await Promise.all([
        getTotalsByStatus(scopedFilters, range),
        filters.analysis_status === "previsto" ? Promise.resolve<DashboardDetailListItem[]>([]) : getRealizedDetailItems(filters, range, PERIOD_DETAIL_LIMIT),
        filters.analysis_status === "realizado" ? Promise.resolve<DashboardDetailListItem[]>([]) : getForecastDetailItems(range, PERIOD_DETAIL_LIMIT),
    ])

    const items = [...realizedItems, ...forecastItems]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, PERIOD_DETAIL_LIMIT)

    return {
        title: "Detalhe do período",
        subtitle: "Resumo do intervalo selecionado no gráfico principal.",
        period_label: `${format(range.start, "dd/MM/yyyy")} - ${format(range.end, "dd/MM/yyyy")}`,
        summary: totals,
        items,
        cta_label: "Ver detalhes do período",
        cta_href: buildTransactionHref({
            start: periodStart,
            end: periodEnd,
            accountIds: filters.account_ids,
        }),
    }
}

export async function getDashboardExpenseCategoryDetailData(
    filters: DashboardAppliedFilters,
    categoryId: number,
    scope: DashboardExpenseScope,
): Promise<DashboardExpenseCategoryDetail> {
    const categories = await getExpenseCategories(filters, scope)
    const category = categories.find((item) => item.categoria_id === categoryId)

    if (!category) {
        throw new Error("Categoria não encontrada para o período selecionado.")
    }

    const totalDespesas = categories.reduce((sum, item) => sum + item.total, 0)
    const [suppliers, latestItems] = await Promise.all([
        getCategorySupplierBreakdown(filters, categoryId, scope),
        getCategoryLatestItems(filters, categoryId, scope),
    ])

    return {
        title: scope === "cost" ? "Custos realizados" : "Despesas realizadas",
        subtitle:
            scope === "cost"
                ? "Base realizada da categoria com centro de custo."
                : "Base realizada da categoria no periodo.",
        scope,
        category: {
            categoria_id: category.categoria_id,
            nome: category.nome,
            total: category.total,
            percentual_total: totalDespesas > 0 ? (category.total / totalDespesas) * 100 : 0,
        },
        suppliers,
        latest_items: latestItems,
        cta_label: "Abrir analise",
        cta_href: buildTransactionHref({
            start: filters.period_start,
            end: filters.period_end,
            accountIds: filters.account_ids,
            categoriaId: categoryId,
            tipo: "DESPESA",
            costScope: scope,
        }),
    }
}

export async function getDashboardEntryDetailData(kind: "pagar" | "receber", id: number): Promise<DashboardEntryDetail> {
    if (kind === "pagar") {
        const item = await prisma.contaPagar.findUnique({
            where: { id },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                valor_pago: true,
                data_vencimento: true,
                observacoes: true,
                categoria: { select: { nome: true } },
                fornecedor: { select: { nome: true } },
            },
        })

        if (!item) {
            throw new Error("Conta a pagar não encontrada.")
        }

        return {
            title: "Detalhe do compromisso",
            subtitle: "Informações rápidas do pagamento previsto.",
            amount: toNumber(item.valor_total) - toNumber(item.valor_pago),
            due_date: item.data_vencimento.toISOString(),
            badge_label: buildUpcomingBadge(item.data_vencimento).badge_label,
            category: item.categoria.nome,
            entity: item.fornecedor?.nome ?? null,
            description: item.descricao,
            notes: item.observacoes,
            cta_label: "Ver lançamento",
            cta_href: buildPayableHref({
                start: format(item.data_vencimento, "yyyy-MM-dd"),
                end: format(item.data_vencimento, "yyyy-MM-dd"),
                search: item.descricao,
            }),
        }
    }

    const item = await prisma.contaReceber.findUnique({
        where: { id },
        select: {
            id: true,
            descricao: true,
            valor_total: true,
            valor_recebido: true,
            data_vencimento: true,
            observacoes: true,
            categoria: { select: { nome: true } },
            cliente: { select: { nome: true } },
        },
    })

    if (!item) {
        throw new Error("Conta a receber não encontrada.")
    }

    return {
        title: "Detalhe do recebimento",
        subtitle: "Informações rápidas da entrada prevista.",
        amount: toNumber(item.valor_total) - toNumber(item.valor_recebido),
        due_date: item.data_vencimento.toISOString(),
        badge_label: buildUpcomingBadge(item.data_vencimento).badge_label,
        category: item.categoria.nome,
        entity: item.cliente?.nome ?? null,
        description: item.descricao,
        notes: item.observacoes,
        cta_label: "Ver lançamento",
        cta_href: buildReceivableHref({
            start: format(item.data_vencimento, "yyyy-MM-dd"),
            end: format(item.data_vencimento, "yyyy-MM-dd"),
            search: item.descricao,
        }),
    }
}

