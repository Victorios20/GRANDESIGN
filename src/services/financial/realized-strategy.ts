import { prisma } from "@/lib/prisma"
import { PedidoCategoria } from "@prisma/client"
import { CategoryMapping, ReportCategoryKey } from "@/services/financial/category-mapping"
import { isExcludedFinancialCategory } from "@/lib/financial/fixed-category-taxonomy"

export interface RealizedCostData {
    madeira: number
    telha: number
    andaime: number
    materiais: number
    mao_de_obra: number
    outros: number
    total: number
    warnings: string[]
}

export interface RealizedCostStrategy {
    getRealizedCosts(obraId: number): Promise<RealizedCostData>
    getSourceName(): "pedido_compra" | "lancamentos"
}

// ---------------------------------------------------------------------------
// STRATEGY 1: PEDIDO COMPRA (Simple)
// ---------------------------------------------------------------------------
export class PedidoCompraStrategy implements RealizedCostStrategy {
    getSourceName(): "pedido_compra" | "lancamentos" {
        return "pedido_compra"
    }

    async getRealizedCosts(obraId: number): Promise<RealizedCostData> {
        const pedidos = await prisma.pedido_compra.findMany({
            where: {
                obra_id: obraId,
                status: { notIn: ["RASCUNHO", "CANCELADO"] },
            },
            select: {
                categoria: true,
                valor_realizado: true,
            },
        })

        const sumByCat = (cat: PedidoCategoria) =>
            pedidos
                .filter((p) => p.categoria === cat)
                .reduce((acc, curr) => acc + Number(curr.valor_realizado || 0), 0)

        // Note: PedidoCompra doesn't normally track "Mão de Obra". 
        // Usually Mão de Obra is paid via Financeiro directly or not tracked here.
        // For this strategy, we assume 0 or maybe try to fetch from somewhere else if needed.
        // Given the prompt implications, we leave it as 0 for "pedido_compra" source unless generic inputs are used.

        return {
            madeira: sumByCat("MADEIRA"),
            telha: sumByCat("TELHA"),
            andaime: sumByCat("ANDAIMES"),
            materiais: sumByCat("MATERIAIS"),
            mao_de_obra: 0,
            outros: 0,
            total: pedidos.reduce((acc, curr) => acc + Number(curr.valor_realizado || 0), 0),
            warnings: ["Mão de Obra não é rastreada via Pedidos de Compra."],
        }
    }
}

// ---------------------------------------------------------------------------
// STRATEGY 2: LANCAMENTOS (Advanced - Financeiro)
// ---------------------------------------------------------------------------
export class LancamentoStrategy implements RealizedCostStrategy {
    getSourceName(): "pedido_compra" | "lancamentos" {
        return "lancamentos"
    }

    async getRealizedCosts(obraId: number): Promise<RealizedCostData> {
        // 1. Find CentroCusto(s) for this Obra
        const centrosCusto = await prisma.centroCusto.findMany({
            where: { obra_id: obraId },
            select: { id: true },
        })

        if (centrosCusto.length === 0) {
            return {
                madeira: 0,
                telha: 0,
                andaime: 0,
                materiais: 0,
                mao_de_obra: 0,
                outros: 0,
                total: 0,
                warnings: ["Nenhum Centro de Custo vinculado a esta obra."],
            }
        }

        const ccIds = centrosCusto.map((cc) => cc.id)

        // 2. Fetch Expenses (Despesas)
        const lancamentos = await prisma.lancamento.findMany({
            where: {
                centro_custo_id: { in: ccIds },
                tipo: "DESPESA",
            },
            include: {
                categoria: {
                    include: {
                        categoria_pai: {
                            select: { nome: true },
                        },
                    },
                },
            },
        })

        const result: RealizedCostData = {
            madeira: 0,
            telha: 0,
            andaime: 0,
            materiais: 0,
            mao_de_obra: 0,
            outros: 0,
            total: 0,
            warnings: [],
        }

        // 3. Map Categories using Helper
        for (const l of lancamentos) {
            if (isExcludedFinancialCategory(l.categoria)) {
                continue
            }

            const valor = Number(l.valor)
            const key = CategoryMapping.getKey(l.categoria.nome)

            result.total += valor

            switch (key) {
                case "MADEIRA":
                    result.madeira += valor
                    break
                case "TELHA":
                    result.telha += valor
                    break
                case "ANDAIME":
                    result.andaime += valor
                    break
                case "MATERIAIS":
                    result.materiais += valor
                    break
                case "MAO_DE_OBRA":
                    result.mao_de_obra += valor
                    break
                default:
                    result.outros += valor
                    break
            }
        }

        if (result.outros > 0) {
            result.warnings.push(`R$ ${result.outros.toFixed(2)} em categorias não mapeadas (Outros).`)
        }

        return result
    }
}

// ---------------------------------------------------------------------------
// FACTORY
// ---------------------------------------------------------------------------
export const RealizedFactory = {
    getStrategy(): RealizedCostStrategy {
        const source = process.env.FINANCEIRO_REALIZADO_SOURCE

        if (source === "lancamentos") {
            return new LancamentoStrategy()
        }

        // Default
        return new PedidoCompraStrategy()
    },
}
