import { PedidoCategoria } from "@prisma/client"

import { isExcludedFinancialCategory } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"
import { CategoryMapping, REPORT_CATEGORY_KEYS, type ReportCategoryKey } from "@/services/financial/category-mapping"

export type RealizedByCategory = Record<ReportCategoryKey, number>

export interface RealizedCostData {
    byCategory: RealizedByCategory
    total: number
    warnings: string[]
}

export interface RealizedCostStrategy {
    getRealizedCosts(obraId: number): Promise<RealizedCostData>
    getSourceName(): "pedido_compra" | "lancamentos"
}

function emptyRealizedByCategory(): RealizedByCategory {
    return REPORT_CATEGORY_KEYS.reduce((acc, key) => {
        acc[key] = 0
        return acc
    }, {} as RealizedByCategory)
}

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

        const byCategory = emptyRealizedByCategory()
        const sumByCat = (cat: PedidoCategoria) =>
            pedidos
                .filter((p) => p.categoria === cat)
                .reduce((acc, curr) => acc + Number(curr.valor_realizado || 0), 0)

        byCategory.MADEIRAS = sumByCat("MADEIRA")
        byCategory.TELHAS = sumByCat("TELHA")
        byCategory.ANDAIMES = sumByCat("ANDAIMES")
        byCategory.MATERIAIS_GERAIS = sumByCat("MATERIAIS")

        return {
            byCategory,
            total: Object.values(byCategory).reduce((acc, value) => acc + value, 0),
            warnings: ["Empresa PS, Empresa GD, Comissão, Frete e Taxa de Cartão não são rastreados via Pedidos de Compra."],
        }
    }
}

export class LancamentoStrategy implements RealizedCostStrategy {
    getSourceName(): "pedido_compra" | "lancamentos" {
        return "lancamentos"
    }

    async getRealizedCosts(obraId: number): Promise<RealizedCostData> {
        const centrosCusto = await prisma.centroCusto.findMany({
            where: { obra_id: obraId },
            select: { id: true },
        })

        if (centrosCusto.length === 0) {
            return {
                byCategory: emptyRealizedByCategory(),
                total: 0,
                warnings: ["Nenhum Centro de Custo vinculado a esta obra."],
            }
        }

        const ccIds = centrosCusto.map((cc) => cc.id)
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

        const byCategory = emptyRealizedByCategory()
        let total = 0

        for (const lancamento of lancamentos) {
            if (isExcludedFinancialCategory(lancamento.categoria)) {
                continue
            }

            const valor = Number(lancamento.valor)
            const key = CategoryMapping.getKey(lancamento.categoria.nome)

            byCategory[key] += valor
            total += valor
        }

        const warnings: string[] = []
        if (byCategory.OUTROS > 0) {
            warnings.push(`R$ ${byCategory.OUTROS.toFixed(2)} em categorias não mapeadas (Outros).`)
        }

        return { byCategory, total, warnings }
    }
}

export const RealizedFactory = {
    getStrategy(): RealizedCostStrategy {
        const source = process.env.FINANCEIRO_REALIZADO_SOURCE

        if (source === "lancamentos") {
            return new LancamentoStrategy()
        }

        return new PedidoCompraStrategy()
    },
}
