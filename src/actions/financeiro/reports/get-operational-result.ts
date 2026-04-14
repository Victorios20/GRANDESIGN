import {
    differenceInDays,
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
    subDays,
    subMonths,
} from "date-fns"

import { getFixedFinancialGroup } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"
import { type MonthlyTrendItem, type OperationalResult } from "@/types/financeiro"

interface GetOperationalResultParams {
    period_start: string
    period_end: string
    cost_center_id?: number
    compare_previous?: boolean
}

interface AggregationRow {
    category_group: string | null
    category_type: string
    total: number
}

interface TrendRow extends AggregationRow {
    month: string
}

function resolveBuckets(rows: AggregationRow[]) {
    let receitas = 0
    let despesas = 0

    for (const row of rows) {
        const group = getFixedFinancialGroup(row.category_group)

        if (group?.reportBucket === "excluded") {
            continue
        }

        if (group?.reportBucket === "revenue") {
            receitas += row.total
            continue
        }

        if (group?.reportBucket === "cost" || group?.reportBucket === "expense") {
            despesas += row.total
            continue
        }

        if (row.category_type === "RECEITA") {
            receitas += row.total
        } else {
            despesas += row.total
        }
    }

    const resultado = receitas - despesas
    const margem = receitas !== 0 ? (resultado / receitas) * 100 : null

    return {
        receitas,
        despesas,
        resultado,
        margem,
    }
}

export async function getOperationalResult({
    period_start,
    period_end,
    cost_center_id,
    compare_previous = false,
}: GetOperationalResultParams): Promise<OperationalResult> {
    const startDate = parseISO(period_start)
    const endDate = parseISO(period_end)

    async function fetchPeriodData(start: Date, end: Date) {
        let query = `
            SELECT
                COALESCE(parent.nome, category.nome) AS category_group,
                category.tipo::text AS category_type,
                COALESCE(SUM(lancamento.valor), 0)::float AS total
            FROM lancamentos AS lancamento
            INNER JOIN categorias AS category ON category.id = lancamento.categoria_id
            LEFT JOIN categorias AS parent ON parent.id = category.categoria_pai_id
            WHERE lancamento.data_competencia >= $1::date
              AND lancamento.data_competencia <= $2::date
              AND lancamento.transferencia_id IS NULL
        `
        const params: Array<Date | number> = [start, end]

        if (cost_center_id) {
            query += ` AND lancamento.centro_custo_id = $3`
            params.push(cost_center_id)
        }

        query += `
            GROUP BY COALESCE(parent.nome, category.nome), category.tipo
        `

        const rows = await prisma.$queryRawUnsafe<AggregationRow[]>(query, ...params)
        return resolveBuckets(rows)
    }

    const currentData = await fetchPeriodData(startDate, endDate)

    let previousData = undefined
    if (compare_previous) {
        const durationInDays = differenceInDays(endDate, startDate) + 1
        const prevEnd = subDays(startDate, 1)
        const prevStart = subDays(prevEnd, durationInDays - 1)
        const prev = await fetchPeriodData(prevStart, prevEnd)

        const calcVariation = (curr: number, prevValue: number) => {
            if (prevValue === 0) return null
            return ((curr - prevValue) / Math.abs(prevValue)) * 100
        }

        previousData = {
            periodo: {
                start: format(prevStart, "yyyy-MM-dd"),
                end: format(prevEnd, "yyyy-MM-dd"),
            },
            receitas_totais: prev.receitas,
            custos_despesas_totais: prev.despesas,
            resultado_operacional: prev.resultado,
            margem_operacional: prev.margem,
            variacao_receitas: calcVariation(currentData.receitas, prev.receitas),
            variacao_despesas: calcVariation(currentData.despesas, prev.despesas),
            variacao_resultado: calcVariation(currentData.resultado, prev.resultado),
        }
    }

    const trendEnd = endOfMonth(endDate)
    const trendStart = startOfMonth(subMonths(trendEnd, 5))

    let trendQuery = `
        SELECT
            to_char(lancamento.data_competencia, 'YYYY-MM') AS month,
            COALESCE(parent.nome, category.nome) AS category_group,
            category.tipo::text AS category_type,
            COALESCE(SUM(lancamento.valor), 0)::float AS total
        FROM lancamentos AS lancamento
        INNER JOIN categorias AS category ON category.id = lancamento.categoria_id
        LEFT JOIN categorias AS parent ON parent.id = category.categoria_pai_id
        WHERE lancamento.data_competencia >= $1::date
          AND lancamento.data_competencia <= $2::date
          AND lancamento.transferencia_id IS NULL
    `
    const trendParams: Array<Date | number> = [trendStart, trendEnd]

    if (cost_center_id) {
        trendQuery += ` AND lancamento.centro_custo_id = $3`
        trendParams.push(cost_center_id)
    }

    trendQuery += `
        GROUP BY month, COALESCE(parent.nome, category.nome), category.tipo
        ORDER BY month
    `

    const trendRows = await prisma.$queryRawUnsafe<TrendRow[]>(trendQuery, ...trendParams)

    const trendMap = new Map<string, MonthlyTrendItem>()

    let iterDate = trendStart
    while (iterDate <= trendEnd) {
        const key = format(iterDate, "yyyy-MM")
        trendMap.set(key, {
            month: key,
            receitas: 0,
            despesas: 0,
            resultado: 0,
        })
        iterDate = subMonths(iterDate, -1)
    }

    const rowsByMonth = new Map<string, AggregationRow[]>()
    for (const row of trendRows) {
        const rows = rowsByMonth.get(row.month) ?? []
        rows.push(row)
        rowsByMonth.set(row.month, rows)
    }

    for (const [month, rows] of rowsByMonth.entries()) {
        const trendItem = trendMap.get(month)
        if (!trendItem) continue

        const totals = resolveBuckets(rows)
        trendItem.receitas = totals.receitas
        trendItem.despesas = totals.despesas
        trendItem.resultado = totals.resultado
    }

    return {
        periodo: {
            start: period_start,
            end: period_end,
        },
        receitas_totais: currentData.receitas,
        custos_despesas_totais: currentData.despesas,
        resultado_operacional: currentData.resultado,
        margem_operacional: currentData.margem,
        previous: previousData,
        trend_6m: Array.from(trendMap.values()),
    }
}
