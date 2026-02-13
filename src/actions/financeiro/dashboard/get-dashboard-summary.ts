import { prisma } from "@/lib/prisma"
import { StatusFinanceiro } from "@prisma/client"
import { getOperationalResult } from "@/actions/financeiro/reports/get-operational-result"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { DashboardSummary, UpcomingItem } from "@/types/financeiro"

const ACTIVE_STATUSES: StatusFinanceiro[] = ["PENDENTE", "PARCIAL", "ATRASADO"]

interface MonthlyRow {
    month: string
    tipo: string
    total: number
}

interface CategoryRow {
    categoria_id: number
    nome: string
    cor: string | null
    tipo: string
    total: number
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in7days = new Date(today)
    in7days.setDate(in7days.getDate() + 7)
    const in30days = new Date(today)
    in30days.setDate(in30days.getDate() + 30)

    // Month range for 12-month chart
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 11, 1)

    // Current month range for top categories
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // For Operational Result
    const opStart = format(currentMonthStart, "yyyy-MM-dd")
    const opEnd = format(currentMonthEnd, "yyyy-MM-dd")

    const [
        [
            saldoResult,
            aReceberResult,
            aPagarResult,
            monthlyData,
            topCategories,
            proximosPagar,
            proximosReceber,
            vencidasPagar,
            vencidasReceber,
        ],
        operationalResult
    ] = await Promise.all([
        prisma.$transaction([
            // 1. Saldo total — sum saldo_atual from active bank accounts
            prisma.contasBancaria.aggregate({
                where: { ativo: true },
                _sum: { saldo_atual: true },
            }),

            // 2. A receber 30d — pending receivables within 30 days
            prisma.contaReceber.aggregate({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { lte: in30days },
                },
                _sum: { valor_total: true, valor_recebido: true },
            }),

            // 3. A pagar 30d — pending payables within 30 days
            prisma.contaPagar.aggregate({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { lte: in30days },
                },
                _sum: { valor_total: true, valor_pago: true },
            }),

            // 4. Entradas vs Saídas últimos 12 meses — raw SQL for GROUP BY month
            prisma.$queryRaw<MonthlyRow[]>`
                SELECT 
                    to_char(data_competencia, 'YYYY-MM') AS month,
                    tipo,
                    COALESCE(SUM(valor), 0)::float AS total
                FROM lancamentos
                WHERE data_competencia >= ${monthStart}
                GROUP BY month, tipo
                ORDER BY month ASC
            `,

            // 5. Top 5 categorias do mês
            prisma.$queryRaw<CategoryRow[]>`
                SELECT 
                    l.categoria_id,
                    c.nome,
                    c.cor,
                    c.tipo,
                    COALESCE(SUM(l.valor), 0)::float AS total
                FROM lancamentos l
                JOIN categorias c ON c.id = l.categoria_id
                WHERE l.data_competencia >= ${currentMonthStart}
                  AND l.data_competencia <= ${currentMonthEnd}
                GROUP BY l.categoria_id, c.nome, c.cor, c.tipo
                ORDER BY total DESC
                LIMIT 5
            `,

            // 6. Próximos vencimentos - Pagar (7 dias)
            prisma.contaPagar.findMany({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { gte: today, lte: in7days },
                },
                select: {
                    id: true,
                    descricao: true,
                    valor_total: true,
                    valor_pago: true,
                    data_vencimento: true,
                    fornecedor: { select: { nome: true } },
                    categoria: { select: { nome: true } },
                },
                orderBy: { data_vencimento: "asc" },
                take: 10,
            }),

            // 7. Próximos vencimentos - Receber (7 dias)
            prisma.contaReceber.findMany({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { gte: today, lte: in7days },
                },
                select: {
                    id: true,
                    descricao: true,
                    valor_total: true,
                    valor_recebido: true,
                    data_vencimento: true,
                    cliente: { select: { nome: true } },
                    categoria: { select: { nome: true } },
                },
                orderBy: { data_vencimento: "asc" },
                take: 10,
            }),

            // 8. Vencidas - Pagar
            prisma.contaPagar.findMany({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { lt: today },
                },
                select: {
                    id: true,
                    descricao: true,
                    valor_total: true,
                    valor_pago: true,
                    data_vencimento: true,
                    fornecedor: { select: { nome: true } },
                    categoria: { select: { nome: true } },
                },
                orderBy: { data_vencimento: "asc" },
                take: 10,
            }),

            // 9. Vencidas - Receber
            prisma.contaReceber.findMany({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    data_vencimento: { lt: today },
                },
                select: {
                    id: true,
                    descricao: true,
                    valor_total: true,
                    valor_recebido: true,
                    data_vencimento: true,
                    cliente: { select: { nome: true } },
                    categoria: { select: { nome: true } },
                },
                orderBy: { data_vencimento: "asc" },
                take: 10,
            }),
        ]),
        getOperationalResult({
            period_start: opStart,
            period_end: opEnd,
            compare_previous: true,
        })
    ])

    const saldo_total = Number(saldoResult._sum.saldo_atual ?? 0)
    const a_receber_30d = Number(aReceberResult._sum.valor_total ?? 0) - Number(aReceberResult._sum.valor_recebido ?? 0)
    const a_pagar_30d = Number(aPagarResult._sum.valor_total ?? 0) - Number(aPagarResult._sum.valor_pago ?? 0)
    const projecao_30d = saldo_total + a_receber_30d - a_pagar_30d

    // Build 12-month chart data
    const monthMap = new Map<string, { receitas: number; despesas: number }>()
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthMap.set(key, { receitas: 0, despesas: 0 })
    }
    // Fill with data
    for (const row of monthlyData) {
        let key = row.month
        // Ensure month format matches map key if necessary (to_char 'YYYY-MM' matches)
        if (monthMap.has(key)) {
            const entry = monthMap.get(key)!
            if (row.tipo === "Receita") entry.receitas = Number(row.total)
            else if (row.tipo === "Despesa") entry.despesas = Number(row.total)
        }
    }
    const entradas_saidas_12m = Array.from(monthMap.entries()).map(([month, vals]) => ({ month, ...vals }))

    // Top categories
    const top_categorias_mes = topCategories.map((c) => ({
        nome: c.nome,
        cor: c.cor,
        total: Number(c.total),
        tipo: c.tipo,
    }))

    // Merge upcoming items
    const proximos_vencimentos: UpcomingItem[] = [
        ...proximosPagar.map((p) => ({
            id: p.id,
            descricao: p.descricao,
            valor_pendente: Number(p.valor_total) - Number(p.valor_pago),
            data_vencimento: p.data_vencimento.toISOString(),
            tipo: "pagar" as const,
            entidade: p.fornecedor?.nome ?? null,
            categoria: p.categoria.nome,
        })),
        ...proximosReceber.map((r) => ({
            id: r.id,
            descricao: r.descricao,
            valor_pendente: Number(r.valor_total) - Number(r.valor_recebido),
            data_vencimento: r.data_vencimento.toISOString(),
            tipo: "receber" as const,
            entidade: r.cliente?.nome ?? null,
            categoria: r.categoria.nome,
        })),
    ].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())

    const vencidas: UpcomingItem[] = [
        ...vencidasPagar.map((p) => ({
            id: p.id,
            descricao: p.descricao,
            valor_pendente: Number(p.valor_total) - Number(p.valor_pago),
            data_vencimento: p.data_vencimento.toISOString(),
            tipo: "pagar" as const,
            entidade: p.fornecedor?.nome ?? null,
            categoria: p.categoria.nome,
        })),
        ...vencidasReceber.map((r) => ({
            id: r.id,
            descricao: r.descricao,
            valor_pendente: Number(r.valor_total) - Number(r.valor_recebido),
            data_vencimento: r.data_vencimento.toISOString(),
            tipo: "receber" as const,
            entidade: r.cliente?.nome ?? null,
            categoria: r.categoria.nome,
        })),
    ].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())

    return {
        saldo_total,
        a_receber_30d,
        a_pagar_30d,
        projecao_30d,
        entradas_saidas_12m,
        top_categorias_mes,
        proximos_vencimentos,
        vencidas,
        operational_result: operationalResult,
    }
}
