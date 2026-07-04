import { prisma } from "@/lib/prisma"
import { BalanceteItem } from "@/types/financeiro"
import { startOfDay, endOfDay, isValid, parseISO } from "date-fns"
import { buildBalanceteTree } from "@/lib/balancete-tree"

interface BalanceteParams {
    period_start: string
    period_end: string
    cost_center_id?: string | null
    show_empty?: boolean
}

interface RawAggregation {
    categoria_id: number
    saldo_anterior: number
    creditos: number
    debitos: number
}

export async function getBalanceteReport(params: BalanceteParams): Promise<BalanceteItem[]> {
    const { period_start, period_end, cost_center_id, show_empty } = params

    // 1. Validation
    if (!period_start || !period_end) throw new Error("Período obrigatório")
    const start = startOfDay(parseISO(period_start))
    const end = endOfDay(parseISO(period_end))

    if (!isValid(start) || !isValid(end)) throw new Error("Datas inválidas")
    if (start > end) throw new Error("Data inicial deve ser anterior à final")

    const costCenterId = cost_center_id && cost_center_id !== "all" ? Number(cost_center_id) : null

    // 2. Fetch all active categories
    const categories = await prisma.categoria.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, tipo: true, categoria_pai_id: true }
    })

    // 3. Raw Aggregation
    // Note: Prisma QueryRaw returns Decimal for sums, need to cast or handle BigInt/Decimal
    // We strictly use data_competencia for DRE/Balancete compatibility

    // Excluir transferências entre contas (contadas em origem+destino) — alinhado ao DRE (get-operational-result)
    let whereClause = `WHERE transferencia_id IS NULL`
    const queryParams: Array<Date | number> = [start, end] // $1, $2

    if (costCenterId) {
        whereClause += ` AND centro_custo_id = $3`
        queryParams.push(costCenterId)
    }

    // Types for mapping
    const RECEITA_DB = "Receita"
    const DESPESA_DB = "Despesa"

    // SQL Aggregation
    // saldo_anterior: everything before start. Receita (+), Despesa (-)
    // creditos: range [start, end]. Receita (+)
    // debitos: range [start, end]. Despesa (+) - note we sum positive values for display

    const sql = `
        SELECT 
            categoria_id,
            SUM(CASE 
                WHEN data_competencia < $1 AND tipo = '${RECEITA_DB}' THEN valor 
                WHEN data_competencia < $1 AND tipo = '${DESPESA_DB}' THEN -valor 
                ELSE 0 
            END) as saldo_anterior,
            SUM(CASE 
                WHEN data_competencia >= $1 AND data_competencia <= $2 AND tipo = '${RECEITA_DB}' THEN valor 
                ELSE 0 
            END) as creditos,
            SUM(CASE 
                WHEN data_competencia >= $1 AND data_competencia <= $2 AND tipo = '${DESPESA_DB}' THEN valor 
                ELSE 0 
            END) as debitos
        FROM lancamentos
        ${whereClause}
        GROUP BY categoria_id
    `

    const rawData = await prisma.$queryRawUnsafe<RawAggregation[]>(sql, ...queryParams)

    return buildBalanceteTree(
        categories.map((c) => ({
            id: c.id,
            nome: c.nome,
            tipo: c.tipo,
            categoria_pai_id: c.categoria_pai_id,
        })),
        rawData,
        Boolean(show_empty),
    )
}
