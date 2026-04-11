import { prisma } from "@/lib/prisma"
import { PedidoCategoria } from "@prisma/client"

export const BudgetSnapshotService = {
    /**
     * Checks if a snapshot exists for the given Obra.
     */
    async hasSnapshot(obraId: number) {
        const count = await prisma.obra_budget_snapshot.count({
            where: { obra_id: obraId },
        })
        return count > 0
    },

    /**
     * Generates or retrieves the Budget Snapshot (Baseline).
     * If it doesn't exist, it calculates from current Obra/Pedidos state.
     * If it exists, it returns the existing frozen data.
     */
    async getOrGenerateBaseline(obraId: number) {
        const existing = await prisma.obra_budget_snapshot.findUnique({
            where: { obra_id: obraId },
        })

        if (existing) {
            return existing
        }

        return this.generateBaseline(obraId)
    },

    /**
     * Forces regeneration of the Snapshot Baseline.
     * This updates the "frozen" values to match the current state.
     */
    async regenerateBaseline(obraId: number, userId?: number) {
        // 1. Calculate new values
        const data = await this.calculateBaselineData(obraId)

        // 2. Upsert snapshot
        const snapshot = await prisma.obra_budget_snapshot.upsert({
            where: { obra_id: obraId },
            create: {
                obra_id: obraId,
                ...data,
            },
            update: {
                ...data,
            },
        })

        // 3. Audit Log
        if (userId) {
            await prisma.auditLog.create({
                data: {
                    action: "BUDGET_SNAPSHOT_RECALCULATED",
                    entity: "obra_budget_snapshot",
                    entity_id: snapshot.id,
                    user_id: userId,
                    detail: { obra_id: obraId, new_values: data },
                },
            })
        }

        return snapshot
    },

    /**
     * Internal helper to calculate baseline values.
     * Considers:
     * - Obra: valor_obra (Receita), valor_mao_de_obra
     * - Pedidos: valor_orcado where nao_previsto = FALSE
     */
    async calculateBaselineData(obraId: number) {
        const obra = await prisma.obras.findUniqueOrThrow({
            where: { id: obraId },
            select: { valor_obra: true, valor_mao_de_obra: true },
        })

        const pedidosPrevistos = await prisma.pedido_compra.findMany({
            where: {
                obra_id: obraId,
                nao_previsto: false,
                status: { notIn: ["RASCUNHO", "CANCELADO"] },
            },
            select: {
                categoria: true,
                valor_orcado: true,
            },
        })

        const sumByCategory = (cat: PedidoCategoria) =>
            pedidosPrevistos
                .filter((p) => p.categoria === cat)
                .reduce((acc, curr) => acc + Number(curr.valor_orcado || 0), 0)

        return {
            receita_orcada: obra.valor_obra,
            mao_de_obra_orcada: obra.valor_mao_de_obra,
            madeira_previsto: sumByCategory("MADEIRA"),
            telha_previsto: sumByCategory("TELHA"),
            andaime_previsto: sumByCategory("ANDAIMES"),
            materiais_previsto: sumByCategory("MATERIAIS"),
        }
    },

    /**
     * Generates the baseline for the first time.
     */
    async generateBaseline(obraId: number) {
        const data = await this.calculateBaselineData(obraId)
        return prisma.obra_budget_snapshot.create({
            data: {
                obra_id: obraId,
                ...data,
            },
        })
    },

    /**
     * Calculates "Extras" (Unplanned Purchases) dynamically.
     * Logic: Pedidos where nao_previsto = TRUE.
     */
    async getExtras(obraId: number) {
        const pedidosExtras = await prisma.pedido_compra.findMany({
            where: {
                obra_id: obraId,
                nao_previsto: true,
                status: { notIn: ["RASCUNHO", "CANCELADO"] },
            },
            select: {
                categoria: true,
                valor_orcado: true,
            },
        })

        const sumByCategory = (cat: PedidoCategoria) =>
            pedidosExtras
                .filter((p) => p.categoria === cat)
                .reduce((acc, curr) => acc + Number(curr.valor_orcado || 0), 0)

        return {
            madeira_extra: sumByCategory("MADEIRA"),
            telha_extra: sumByCategory("TELHA"),
            andaime_extra: sumByCategory("ANDAIMES"),
            materiais_extra: sumByCategory("MATERIAIS"),
        }
    },
}
