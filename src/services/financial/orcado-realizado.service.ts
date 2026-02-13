import { prisma } from "@/lib/prisma"
import { BudgetSnapshotService } from "@/services/budget-snapshot.service"
import { LancamentoStrategy } from "@/services/financial/realized-strategy"

export interface OrcadoRealizadoDTO {
    obraId: number
    nomeObra: string

    receita: {
        orcada: number
        realizada: number
    }

    custos: {
        maoDeObra: CategoryComparison
        materiais: CategoryComparison
        madeira: CategoryComparison
        telha: CategoryComparison
        andaime: CategoryComparison
    }

    totais: {
        custoPrevisto: number // Baseline
        custoExtra: number    // Dynamic
        custoRealizado: number

        lucroBrutoProjetado: number
        lucroBrutoReal: number

        margemProjetada: number
        margemReal: number
    }

    realized_source: string
    warnings: string[]
}

interface CategoryComparison {
    previsto: number
    extra: number
    total_orcado: number // previsto + extra
    realizado: number
    diferenca: number // realizado - total_orcado (positive = over budget)
    percentual: number // realizado / total_orcado
}

export const OrcadoRealizadoService = {
    async getReport(obraId: number): Promise<OrcadoRealizadoDTO> {
        // 1. Get Obra Info
        const obra = await prisma.obras.findUniqueOrThrow({
            where: { id: obraId },
            select: {
                titulo: true,
                pagamento_entrada: true,
                pagamento_quitacao: true,
                status_pagamento_entrada: true,
                status_pagamento_quitacao: true
            }
        })

        // 2. Get or Generate Baseline (Snapshot)
        const snapshot = await BudgetSnapshotService.getOrGenerateBaseline(obraId)

        // 3. Get Dynamic Extras
        const extras = await BudgetSnapshotService.getExtras(obraId)

        // 4. Get Realized Costs - ENFORCE LEDGER (LancamentosStrategy)
        // As per product requirement: "Realizado deve vir do LEDGER"
        const strategy = new LancamentoStrategy()
        const realizedData = await strategy.getRealizedCosts(obraId)

        // 5. Calculate Revenue Realized
        let receitaRealizada = 0
        // Fetch "Receita" lancamentos linked to Obra's CentroCusto
        const centros = await prisma.centroCusto.findMany({ where: { obra_id: obraId }, select: { id: true } })
        const ccIds = centros.map(c => c.id)
        if (ccIds.length > 0) {
            const agg = await prisma.lancamento.aggregate({
                where: { centro_custo_id: { in: ccIds }, tipo: "RECEITA" },
                _sum: { valor: true }
            })
            receitaRealizada = Number(agg._sum.valor || 0)
        }

        // 6. Build DTO Helpers
        // "Orçado" shown to user = Baseline + Extra
        const buildCat = (previsto: number | string | null, extra: number, realizado: number): CategoryComparison => {
            const p = Number(previsto || 0)
            const totalOrcado = p + extra // Merged Baseline + Extra
            const diff = realizado - totalOrcado
            const pct = totalOrcado === 0 ? (realizado > 0 ? 100 : 0) : (realizado / totalOrcado) * 100

            return {
                previsto: p, // Keep for debug/internal if needed, but UI will focus on totalOrcado
                extra: extra, // Keep for debug
                total_orcado: totalOrcado,
                realizado: realizado,
                diferenca: diff,
                percentual: pct
            }
        }

        // Mão de Obra
        const maoDeObra = buildCat(snapshot.mao_de_obra_orcada, 0, realizedData.mao_de_obra)

        // Materials Categories
        const materiais = buildCat(snapshot.materiais_previsto, extras.materiais_extra, realizedData.materiais)
        const madeira = buildCat(snapshot.madeira_previsto, extras.madeira_extra, realizedData.madeira)
        const telha = buildCat(snapshot.telha_previsto, extras.telha_extra, realizedData.telha)
        const andaime = buildCat(snapshot.andaime_previsto, extras.andaime_extra, realizedData.andaime)

        // Totals
        // Custo Previsto Total = Sum of all baselines
        const baselineTotal =
            Number(snapshot.mao_de_obra_orcada) +
            Number(snapshot.materiais_previsto) +
            Number(snapshot.madeira_previsto) +
            Number(snapshot.telha_previsto) +
            Number(snapshot.andaime_previsto)

        const extraTotal =
            extras.materiais_extra +
            extras.madeira_extra +
            extras.telha_extra +
            extras.andaime_extra

        // Total Orçado = Baseline + Extra
        const custoPrevisto = baselineTotal + extraTotal
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
                realizada: receitaRealizada
            },
            custos: {
                maoDeObra,
                materiais,
                madeira,
                telha,
                andaime
            },
            totais: {
                custoPrevisto, // This is now Baseline + Extra
                custoExtra: extraTotal, // Kept in DTO just in case, but "custoPrevisto" above holds the Sum
                custoRealizado,
                lucroBrutoProjetado,
                lucroBrutoReal,
                margemProjetada,
                margemReal
            },
            realized_source: "lancamentos",
            warnings: realizedData.warnings
        }
    }
}
