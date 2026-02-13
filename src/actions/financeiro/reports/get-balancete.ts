import { prisma } from "@/lib/prisma"
import { BalanceteItem } from "@/types/financeiro"
import { TipoLancamento } from "@prisma/client"
import { startOfDay, endOfDay, isValid, parseISO } from "date-fns"

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

    let whereClause = `WHERE 1=1`
    const queryParams: any[] = [start, end] // $1, $2

    if (costCenterId) {
        whereClause += ` AND centro_custo_id = $3`
        queryParams.push(costCenterId)
    }

    // Types for mapping
    const RECEITA = TipoLancamento.RECEITA
    const DESPESA = TipoLancamento.DESPESA

    // SQL Aggregation
    // saldo_anterior: everything before start. Receita (+), Despesa (-)
    // creditos: range [start, end]. Receita (+)
    // debitos: range [start, end]. Despesa (+) - note we sum positive values for display

    const sql = `
        SELECT 
            categoria_id,
            SUM(CASE 
                WHEN data_competencia < $1 AND tipo = '${RECEITA}' THEN valor 
                WHEN data_competencia < $1 AND tipo = '${DESPESA}' THEN -valor 
                ELSE 0 
            END) as saldo_anterior,
            SUM(CASE 
                WHEN data_competencia >= $1 AND data_competencia <= $2 AND tipo = '${RECEITA}' THEN valor 
                ELSE 0 
            END) as creditos,
            SUM(CASE 
                WHEN data_competencia >= $1 AND data_competencia <= $2 AND tipo = '${DESPESA}' THEN valor 
                ELSE 0 
            END) as debitos
        FROM lancamentos
        ${whereClause}
        GROUP BY categoria_id
    `

    const rawData = await prisma.$queryRawUnsafe<RawAggregation[]>(sql, ...queryParams)

    // 4. Map results to Category Map
    // Helper to parse decimal/number from raw query
    const toNum = (val: any) => Number(val || 0)

    const categoryMap = new Map<number, BalanceteItem>()

    // Initialize all categories with 0
    categories.forEach(cat => {
        categoryMap.set(cat.id, {
            categoria_id: cat.id,
            nome: cat.nome,
            tipo: cat.tipo === 'RECEITA' ? 'Receita' : 'Despesa', // Match Frontend Enum/String
            nivel: cat.categoria_pai_id ? 2 : 1, // Simple logic for now
            saldo_anterior: 0,
            creditos: 0,
            debitos: 0,
            saldo_final: 0,
            subcontas: [] // We'll fill this later
        })
    })

    // Fill with aggregated data
    rawData.forEach((row: any) => {
        const item = categoryMap.get(row.categoria_id)
        if (item) {
            item.saldo_anterior = toNum(row.saldo_anterior)
            item.creditos = toNum(row.creditos)
            item.debitos = toNum(row.debitos)
            item.saldo_final = item.saldo_anterior + item.creditos - item.debitos
        }
    })

    // 5. Build Hierarchy (Bottom-Up Summation or Post-Order Traversal)
    // We can iterate roots and build recursively.

    const roots: BalanceteItem[] = []
    const childrenMap = new Map<number, BalanceteItem[]>()

    // Separate roots and children
    categories.forEach(cat => {
        const item = categoryMap.get(cat.id)!
        if (cat.categoria_pai_id) {
            if (!childrenMap.has(cat.categoria_pai_id)) {
                childrenMap.set(cat.categoria_pai_id, [])
            }
            childrenMap.get(cat.categoria_pai_id)?.push(item)
        } else {
            roots.push(item)
        }
    })

    // Recursive function to process node: returns whether it (or children) has non-zero data
    const processNode = (node: BalanceteItem): boolean => {
        const children = childrenMap.get(node.categoria_id) || []

        // Recursively process children
        let computedSaldoAnt = node.saldo_anterior
        let computedCreditos = node.creditos
        let computedDebitos = node.debitos

        const activeChildren: BalanceteItem[] = []

        for (const child of children) {
            const hasData = processNode(child)

            // Sum children values to parent (Bubbling up)
            // NOTE: Requirement says "categorias pai somam valores dos filhos". 
            // We assume database aggregation only caught direct assignments. 
            // So we MUST add children values.
            computedSaldoAnt += child.saldo_anterior
            computedCreditos += child.creditos
            computedDebitos += child.debitos

            // Filter logic
            if (show_empty || hasData) {
                activeChildren.push(child)
            }
        }

        // Update Parent
        node.saldo_anterior = computedSaldoAnt
        node.creditos = computedCreditos
        node.debitos = computedDebitos
        node.saldo_final = computedSaldoAnt + computedCreditos - computedDebitos
        node.subcontas = activeChildren

        // Check availability strictly
        // Use epsilon for float comparison if needed, but 0 check is usually fine for "empty"
        const isNonZero =
            Math.abs(node.saldo_anterior) > 0.001 ||
            Math.abs(node.creditos) > 0.001 ||
            Math.abs(node.debitos) > 0.001

        return isNonZero
    }

    // Process roots
    return roots.filter(root => {
        const hasData = processNode(root)
        return show_empty || hasData
    })
}
