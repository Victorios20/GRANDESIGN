import { prisma } from "../../../lib/prisma"
import { BalanceteItem } from "../../../types/financeiro"
import { parseISO } from "date-fns"

interface GetBalanceteParams {
    period_start: string // YYYY-MM-DD
    period_end: string   // YYYY-MM-DD
    cost_center_id?: number
}

interface CategoryMod {
    id: number
    nome: string
    tipo: string
    categoria_pai_id: number | null
}

interface AggregationRow {
    categoria_id: number
    receitas: number
    despesas: number
}

export async function getBalancete({
    period_start,
    period_end,
    cost_center_id,
}: GetBalanceteParams): Promise<BalanceteItem[]> {
    const startDate = parseISO(period_start)
    const endDate = parseISO(period_end)

    // 1. Fetch all categories
    const categories = await prisma.categoria.findMany({
        select: {
            id: true,
            nome: true,
            tipo: true,
            categoria_pai_id: true,
        },
        orderBy: { nome: "asc" },
    })

    // 2. Fetch Aggregations
    // We need two aggregations: Before Period (Opening) and During Period.

    async function fetchAggregation(start: Date | null, end: Date, isBefore: boolean) {
        let query = ""
        const params: any[] = []

        if (isBefore) {
            // Opening Balance: UP TO (strictly less than?) Or include previous day?
            // "Saldo Anterior" usually means balance at start of period.
            // So if period starts 2024-02-01, Opening Balance is end of 2024-01-31.
            // Which means < period_start (as date). Or <= prevEndDate.
            query = `
                SELECT 
                    categoria_id,
                    COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0)::float as receitas,
                    COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0)::float as despesas
                FROM lancamentos
                WHERE data_competencia <= $1::date
            `
            params.push(end)
        } else {
            // During Period: inclusive
            query = `
                SELECT 
                    categoria_id,
                    COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0)::float as receitas,
                    COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0)::float as despesas
                FROM lancamentos
                WHERE data_competencia >= $1::date AND data_competencia <= $2::date
            `
            if (start) params.push(start)
            params.push(end)
        }

        if (cost_center_id) {
            query += ` AND centro_custo_id = $${params.length + 1}`
            params.push(cost_center_id)
        }

        query += ` GROUP BY categoria_id`

        return prisma.$queryRawUnsafe<AggregationRow[]>(query, ...params)
    }

    // Previous Balance: everything strictly BEFORE period_start
    // So <= period_start - 1 day
    const prevEndDate = new Date(startDate)
    prevEndDate.setDate(prevEndDate.getDate() - 1)

    // During Period
    const [openingRows, periodRows] = await Promise.all([
        fetchAggregation(null, prevEndDate, true),
        fetchAggregation(startDate, endDate, false),
    ])

    // Map rows for easy lookup
    const openingMap = new Map<number, { r: number, d: number }>()
    openingRows.forEach(row => openingMap.set(row.categoria_id, { r: row.receitas, d: row.despesas }))

    const periodMap = new Map<number, { r: number, d: number }>()
    periodRows.forEach(row => periodMap.set(row.categoria_id, { r: row.receitas, d: row.despesas }))

    // 3. Build Tree & Calculate (Bottom-up or build full list then rollup)

    // Initialize all items map
    // We perform extensive mutation, so interface allows mutation or we create temp object
    const itemMap = new Map<number, BalanceteItem>()

    // Pass 1: Create BalanceteItem for every category (Leaf logic)
    for (const cat of categories) {
        const op = openingMap.get(cat.id) || { r: 0, d: 0 }
        const per = periodMap.get(cat.id) || { r: 0, d: 0 }

        // Logic: 
        // Saldo Anterior = Receitas(antes) - Despesas(antes)
        const saldo_anterior = op.r - op.d

        // Movimentação do período
        const creditos = per.r
        const debitos = per.d

        // Saldo Final = Anterior + Créditos - Débitos
        const saldo_final = saldo_anterior + creditos - debitos

        const item: BalanceteItem = {
            categoria_id: cat.id,
            nome: cat.nome,
            nivel: cat.categoria_pai_id ? 2 : 1,
            tipo: cat.tipo,
            saldo_anterior,
            debitos,
            creditos,
            saldo_final,
            subcontas: [],
        }
        itemMap.set(cat.id, item)
    }

    // Pass 2: Link Children to Parents
    const rootItems: BalanceteItem[] = []

    // We need to iterate categories again to link parents
    for (const cat of categories) {
        const item = itemMap.get(cat.id)!

        if (cat.categoria_pai_id) {
            const parent = itemMap.get(cat.categoria_pai_id)
            if (parent) {
                parent.subcontas.push(item)
            } else {
                // If parent not found (inactive?), treat as root
                rootItems.push(item)
            }
        } else {
            rootItems.push(item)
        }
    }

    // Pass 3: Rollup Logic (Sum children into parent)
    // Since depth is max 2 (Root -> Child), iterating roots is sufficient.
    // Parent values already contain "Own values" (direct transactions on parent category, if any).
    // Just add children sums.

    for (const root of rootItems) {
        // Sort children alphabetically
        root.subcontas.sort((a, b) => a.nome.localeCompare(b.nome))

        for (const child of root.subcontas) {
            root.saldo_anterior += child.saldo_anterior
            root.debitos += child.debitos
            root.creditos += child.creditos
            root.saldo_final += child.saldo_final
        }
    }

    // Sort roots alphabetically
    return rootItems.sort((a, b) => a.nome.localeCompare(b.nome))
}
