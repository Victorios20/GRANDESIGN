import { prisma } from "@/lib/prisma"
import { BudgetSnapshotService } from "@/services/budget-snapshot.service"
import { REPORT_CATEGORIES, type ReportCategoryKey } from "@/services/financial/category-mapping"
import { LancamentoStrategy } from "@/services/financial/realized-strategy"

export interface CategoryComparison {
    key: ReportCategoryKey
    label: string
    previsto: number
    extra: number
    total_orcado: number
    realizado: number
    diferenca: number
    percentual: number
}

export interface OrcadoRealizadoDTO {
    obraId: number
    nomeObra: string
    receita: {
        orcada: number
        realizada: number
    }
    rows: CategoryComparison[]
    totais: {
        custoPrevisto: number
        custoExtra: number
        custoRealizado: number
        lucroBrutoProjetado: number
        lucroBrutoReal: number
        margemProjetada: number
        margemReal: number
    }
    realized_source: string
    warnings: string[]
}

function buildComparison(
    key: ReportCategoryKey,
    label: string,
    previsto: unknown,
    extra: number,
    realizado: number,
): CategoryComparison {
    const previstoValue = Number(previsto ?? 0)
    const totalOrcado = previstoValue + extra
    const diferenca = realizado - totalOrcado
    const percentual = totalOrcado === 0 ? (realizado > 0 ? 100 : 0) : (realizado / totalOrcado) * 100

    return {
        key,
        label,
        previsto: previstoValue,
        extra,
        total_orcado: totalOrcado,
        realizado,
        diferenca,
        percentual,
    }
}

export const OrcadoRealizadoService = {
    async getReport(obraId: number): Promise<OrcadoRealizadoDTO> {
        const obra = await prisma.obras.findUniqueOrThrow({
            where: { id: obraId },
            select: { titulo: true },
        })

        const snapshot = await BudgetSnapshotService.getOrGenerateBaseline(obraId)
        const extras = await BudgetSnapshotService.getExtras(obraId)
        const strategy = new LancamentoStrategy()
        const realizedData = await strategy.getRealizedCosts(obraId)

        const centros = await prisma.centroCusto.findMany({ where: { obra_id: obraId }, select: { id: true } })
        const ccIds = centros.map((centro) => centro.id)
        const receitaRealizada = ccIds.length > 0
            ? Number((await prisma.lancamento.aggregate({
                where: { centro_custo_id: { in: ccIds }, tipo: "RECEITA" },
                _sum: { valor: true },
            }))._sum.valor || 0)
            : 0

        const snapshotValues = snapshot as unknown as Record<string, unknown>
        const rows = REPORT_CATEGORIES.map((category) =>
            buildComparison(
                category.key,
                category.label,
                category.budgetField ? snapshotValues[category.budgetField] : 0,
                extras[category.key as keyof typeof extras] ?? 0,
                realizedData.byCategory[category.key] ?? 0,
            ),
        )

        const custoPrevisto = rows.reduce((sum, row) => sum + row.total_orcado, 0)
        const custoExtra = rows.reduce((sum, row) => sum + row.extra, 0)
        const custoRealizado = realizedData.total
        const receitaOrcada = Number(snapshot.receita_orcada)
        const lucroBrutoProjetado = receitaOrcada - custoPrevisto
        const lucroBrutoReal = receitaRealizada - custoRealizado
        const margemProjetada = receitaOrcada ? (lucroBrutoProjetado / receitaOrcada) * 100 : 0
        const margemReal = receitaRealizada ? (lucroBrutoReal / receitaRealizada) * 100 : 0

        return {
            obraId,
            nomeObra: obra.titulo || `Obra #${obraId}`,
            receita: {
                orcada: receitaOrcada,
                realizada: receitaRealizada,
            },
            rows,
            totais: {
                custoPrevisto,
                custoExtra,
                custoRealizado,
                lucroBrutoProjetado,
                lucroBrutoReal,
                margemProjetada,
                margemReal,
            },
            realized_source: "lancamentos",
            warnings: realizedData.warnings,
        }
    },
}
