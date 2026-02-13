import { prisma } from "@/lib/prisma"
import { OperationalResult, MonthlyTrendItem } from "@/types/financeiro"
import { startOfMonth, endOfMonth, subMonths, format, parseISO, differenceInDays, subDays } from "date-fns"

interface GetOperationalResultParams {
    period_start: string // YYYY-MM-DD
    period_end: string   // YYYY-MM-DD
    cost_center_id?: number
    compare_previous?: boolean
}

interface AggregationRow {
    tipo: string // 'Receita' | 'Despesa'
    total: number
}

interface TrendRow {
    month: string // YYYY-MM
    tipo: string
    total: number
}

export async function getOperationalResult({
    period_start,
    period_end,
    cost_center_id,
    compare_previous = false,
}: GetOperationalResultParams): Promise<OperationalResult> {
    const startDate = parseISO(period_start)
    const endDate = parseISO(period_end)

    // Helper to fetch aggregation for a period
    async function fetchPeriodData(start: Date, end: Date) {
        // Using raw SQL to ensure we group by the exact string value in DB
        // Prisma enum mapping: RECEITA -> 'Receita', DESPESA -> 'Despesa'

        let query = `
            SELECT 
                tipo, 
                COALESCE(SUM(valor), 0)::float as total
            FROM lancamentos
            WHERE data_competencia >= $1::date AND data_competencia <= $2::date
        `
        const params: any[] = [start, end]

        if (cost_center_id) {
            query += ` AND centro_custo_id = $3`
            params.push(cost_center_id)
        }

        query += ` GROUP BY tipo`

        const rows = await prisma.$queryRawUnsafe<AggregationRow[]>(query, ...params)

        let receitas = 0
        let despesas = 0

        for (const row of rows) {
            if (row.tipo === "Receita") receitas = row.total
            else if (row.tipo === "Despesa") despesas = row.total
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

    // 1. Current Period Data
    const currentData = await fetchPeriodData(startDate, endDate)

    // 2. Previous Period Data (if requested)
    let previousData = undefined
    if (compare_previous) {
        // Calculate previous period with same duration
        const durationInDays = differenceInDays(endDate, startDate) + 1
        const prevEnd = subDays(startDate, 1)
        const prevStart = subDays(prevEnd, durationInDays - 1)

        const prev = await fetchPeriodData(prevStart, prevEnd)

        const calcVariation = (curr: number, prev: number) => {
            if (prev === 0) return null
            return ((curr - prev) / Math.abs(prev)) * 100
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

    // 3. 6-Month Trend Data
    // Go back 5 months from the start date to cover a 6-month window including the start month?
    // Or just look at the last 6 months relative to today?
    // User request: "mini chart de tendência 6 meses". 
    // Usually relative to the selected period end or just last 6 months. 
    // Let's do: 5 months before the period_end month + the period_end month.

    const trendEnd = endOfMonth(endDate)
    const trendStart = startOfMonth(subMonths(trendEnd, 5))

    let trendQuery = `
        SELECT 
            to_char(data_competencia, 'YYYY-MM') as month,
            tipo,
            COALESCE(SUM(valor), 0)::float as total
        FROM lancamentos
        WHERE data_competencia >= $1::date AND data_competencia <= $2::date
    `
    const trendParams: any[] = [trendStart, trendEnd]

    if (cost_center_id) {
        trendQuery += ` AND centro_custo_id = $3`
        trendParams.push(cost_center_id)
    }

    trendQuery += ` GROUP BY month, tipo ORDER BY month`

    const trendRows = await prisma.$queryRawUnsafe<TrendRow[]>(trendQuery, ...trendParams)

    // Process trend rows into MonthlyTrendItem[]
    // Initialize map for the 6 months
    const trendMap = new Map<string, MonthlyTrendItem>()

    let iterDate = trendStart
    while (iterDate <= trendEnd) {
        const key = format(iterDate, "yyyy-MM")
        trendMap.set(key, {
            month: key,
            receitas: 0,
            despesas: 0,
            resultado: 0
        })
        iterDate = subMonths(iterDate, -1) // add 1 month
    }

    for (const row of trendRows) {
        const item = trendMap.get(row.month)
        if (item) {
            if (row.tipo === "Receita") item.receitas = row.total
            else if (row.tipo === "Despesa") item.despesas = row.total
        }
    }

    // Calculate result for each month
    for (const item of trendMap.values()) {
        item.resultado = item.receitas - item.despesas
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
