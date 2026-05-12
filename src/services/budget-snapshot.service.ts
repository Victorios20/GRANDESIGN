import { prisma } from "@/lib/prisma"
import { PedidoCategoria, Prisma } from "@prisma/client"

type Decimalish = Prisma.Decimal | number | string | null | undefined
type BudgetSnapshotClient = Pick<typeof prisma, "auditLog" | "obra_budget_snapshot" | "obras">
const DERIVED_BUDGET_FIELDS = [
    "comissao_previsto",
    "frete_previsto",
    "empresa_ps_previsto",
    "empresa_gd_previsto",
] as const

export type BudgetSnapshotUpdateInput = {
    receita_orcada?: Decimalish
    mao_de_obra_orcada?: Decimalish
    madeira_previsto?: Decimalish
    telha_previsto?: Decimalish
    andaime_previsto?: Decimalish
    materiais_previsto?: Decimalish
    comissao_previsto?: Decimalish
    frete_previsto?: Decimalish
    empresa_ps_previsto?: Decimalish
    empresa_gd_previsto?: Decimalish
}

function asDecimal(value: Decimalish) {
    if (value instanceof Prisma.Decimal) return value
    if (value == null || value === "") return new Prisma.Decimal(0)
    return new Prisma.Decimal(String(value).replace(",", "."))
}

function isZero(value: Decimalish) {
    return asDecimal(value).isZero()
}

function positiveOrFallback(value: Decimalish, fallback: Decimalish) {
    const decimal = asDecimal(value)
    return decimal.gt(0) ? decimal : asDecimal(fallback)
}

function buildMissingDerivedBudgetPatch(
    snapshot: Record<(typeof DERIVED_BUDGET_FIELDS)[number], Decimalish>,
    baseline: Record<(typeof DERIVED_BUDGET_FIELDS)[number], Decimalish>
) {
    const patch: Partial<Record<(typeof DERIVED_BUDGET_FIELDS)[number], Prisma.Decimal>> = {}

    for (const field of DERIVED_BUDGET_FIELDS) {
        const baselineValue = asDecimal(baseline[field])
        if (isZero(snapshot[field]) && baselineValue.gt(0)) {
            patch[field] = baselineValue
        }
    }

    return patch
}

function normalizeStr(value: string | null | undefined) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

function calculateMaterialAmount(material: {
    quantidade?: Decimalish
    preco_unitario?: Decimalish
    tamanho?: Decimalish
    frete?: Decimalish
    total?: Decimalish
}) {
    const total = asDecimal(material.total)
    if (!total.isZero()) return total

    const quantidade = asDecimal(material.quantidade)
    const preco = asDecimal(material.preco_unitario)
    const tamanho = asDecimal(material.tamanho)
    const base = tamanho.gt(0) ? quantidade.mul(preco).mul(tamanho) : quantidade.mul(preco)

    return base.plus(asDecimal(material.frete))
}

function calculatePedidoAmount(pedido: {
    frete?: Decimalish
    itens?: Array<{ total: Decimalish }>
}) {
    const itensTotal = (pedido.itens ?? []).reduce(
        (sum, item) => sum.plus(asDecimal(item.total)),
        new Prisma.Decimal(0)
    )

    return itensTotal.plus(asDecimal(pedido.frete))
}

function isMadeiraMaterial(material: { tipo: string | null; descricao: string | null; componente: string | null }) {
    const text = normalizeStr(`${material.tipo ?? ""} ${material.descricao ?? ""} ${material.componente ?? ""}`)
    return text.includes("madeira") || text.includes("vigamento") || text.includes("ripa") || text.includes("caibro")
}

function isTelhaMaterial(material: { tipo: string | null; descricao: string | null }) {
    const text = normalizeStr(`${material.tipo ?? ""} ${material.descricao ?? ""}`)
    return text.includes("telha")
}

function isAndaimeMaterial(material: { tipo: string | null; descricao: string | null }) {
    const text = normalizeStr(`${material.tipo ?? ""} ${material.descricao ?? ""}`)
    return text.includes("andaime") || text.includes("plataforma")
}

function matchesSelectedTelha(material: { descricao: string | null }, selectedTelha: string) {
    const materialName = normalizeStr(material.descricao)
    const selected = normalizeStr(selectedTelha)
    if (!selected) return false
    return materialName.includes(selected) || selected.includes(materialName)
}

function normalizeSnapshotInput(input: BudgetSnapshotUpdateInput) {
    const data: Partial<Record<keyof BudgetSnapshotUpdateInput, Prisma.Decimal>> = {}
    const fields: Array<keyof BudgetSnapshotUpdateInput> = [
        "receita_orcada",
        "mao_de_obra_orcada",
        "madeira_previsto",
        "telha_previsto",
        "andaime_previsto",
        "materiais_previsto",
        "comissao_previsto",
        "frete_previsto",
        "empresa_ps_previsto",
        "empresa_gd_previsto",
    ]

    for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(input, field)) {
            data[field] = asDecimal(input[field])
        }
    }

    return data
}

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
            if (DERIVED_BUDGET_FIELDS.some((field) => isZero(existing[field]))) {
                const baseline = await this.calculateBaselineData(obraId)
                const patch = buildMissingDerivedBudgetPatch(existing, baseline)

                if (Object.keys(patch).length > 0) {
                    return prisma.obra_budget_snapshot.update({
                        where: { obra_id: obraId },
                        data: patch,
                    })
                }
            }

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

    async syncDerivedValues(obraId: number, userId?: number, client: BudgetSnapshotClient = prisma) {
        const data = await this.calculateBaselineData(obraId, client)

        const snapshot = await client.obra_budget_snapshot.upsert({
            where: { obra_id: obraId },
            create: {
                obra_id: obraId,
                ...data,
            },
            update: data,
        })

        if (userId) {
            await client.auditLog.create({
                data: {
                    action: "BUDGET_SNAPSHOT_SYNCED",
                    entity: "obra_budget_snapshot",
                    entity_id: snapshot.id,
                    user_id: userId,
                    detail: { obra_id: obraId, synced_values: data },
                },
            })
        }

        return snapshot
    },

    async updateManualValues(obraId: number, input: BudgetSnapshotUpdateInput, userId?: number) {
        const data = normalizeSnapshotInput(input)
        const baseline = await this.calculateBaselineData(obraId)

        return prisma.$transaction(async (tx) => {
            const obra = await tx.obras.findUnique({
                where: { id: obraId },
                select: { id: true },
            })

            if (!obra) {
                throw new Error("Obra nao encontrada.")
            }

            const obraData: Prisma.obrasUpdateInput = {}
            if (data.receita_orcada != null) obraData.valor_obra = data.receita_orcada
            if (data.mao_de_obra_orcada != null) obraData.valor_mao_de_obra = data.mao_de_obra_orcada

            if (Object.keys(obraData).length > 0) {
                await tx.obras.update({
                    where: { id: obraId },
                    data: obraData,
                })
            }

            const snapshot = await tx.obra_budget_snapshot.upsert({
                where: { obra_id: obraId },
                create: {
                    obra_id: obraId,
                    ...baseline,
                    ...data,
                },
                update: data,
            })

            if (userId) {
                await tx.auditLog.create({
                    data: {
                        action: "BUDGET_SNAPSHOT_UPDATED",
                        entity: "obra_budget_snapshot",
                        entity_id: snapshot.id,
                        user_id: userId,
                        detail: { obra_id: obraId, updated_values: data },
                    },
                })
            }

            return snapshot
        })
    },

    /**
     * Internal helper to calculate baseline values.
     * Considers:
     * - Obra: valor_obra (Receita), valor_mao_de_obra, telha_escolhida
     * - Orçamento vinculado: madeira, telha selecionada, andaime e materiais
     */
    async calculateBaselineData(obraId: number, client: BudgetSnapshotClient = prisma) {
        const obra = await client.obras.findUniqueOrThrow({
            where: { id: obraId },
            select: {
                valor_obra: true,
                valor_mao_de_obra: true,
                telha_escolhida: true,
                orcamento: {
                    select: {
                        totais_madeiras_preco: true,
                        totais_materiais_preco: true,
                        totais_comissao_preco: true,
                        totais_empresa_ps_preco: true,
                        totais_empresa_gd_preco: true,
                        totais_frete_preco: true,
                        orcamento_material: {
                            select: {
                                tipo: true,
                                descricao: true,
                                componente: true,
                                quantidade: true,
                                preco_unitario: true,
                                tamanho: true,
                                frete: true,
                                total: true,
                            },
                        },
                    },
                },
            },
        })

        const materials = obra.orcamento?.orcamento_material ?? []
        const selectedTelha = obra.telha_escolhida ?? ""
        const sumMaterials = (predicate: (material: (typeof materials)[number]) => boolean) =>
            materials
                .filter(predicate)
                .reduce((acc, material) => acc + Number(calculateMaterialAmount(material).toString()), 0)

        const madeiraPrevista = obra.orcamento?.totais_madeiras_preco ?? sumMaterials(isMadeiraMaterial)
        const telhas = materials.filter(isTelhaMaterial)
        const telhaSelecionada = selectedTelha
            ? telhas.filter((material) => matchesSelectedTelha(material, selectedTelha))
            : []
        const telhaPrevista = sumMaterials((material) =>
            telhaSelecionada.length > 0
                ? isTelhaMaterial(material) && matchesSelectedTelha(material, selectedTelha)
                : false
        )
        const andaimePrevisto = sumMaterials(isAndaimeMaterial)
        const materiaisPrevisto = obra.orcamento?.totais_materiais_preco ?? sumMaterials(
            (material) => !isMadeiraMaterial(material) && !isTelhaMaterial(material) && !isAndaimeMaterial(material)
        )

        return {
            receita_orcada: obra.valor_obra,
            mao_de_obra_orcada: obra.valor_mao_de_obra,
            madeira_previsto: madeiraPrevista,
            telha_previsto: telhaPrevista,
            andaime_previsto: andaimePrevisto,
            materiais_previsto: materiaisPrevisto,
            comissao_previsto: obra.orcamento?.totais_comissao_preco ?? 0,
            frete_previsto: obra.orcamento?.totais_frete_preco ?? 0,
            empresa_ps_previsto: positiveOrFallback(obra.orcamento?.totais_empresa_ps_preco, obra.valor_mao_de_obra),
            empresa_gd_previsto: obra.orcamento?.totais_empresa_gd_preco ?? 0,
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
                frete: true,
                itens: {
                    select: {
                        total: true,
                    },
                },
            },
        })

        const sumByCategory = (cat: PedidoCategoria) =>
            pedidosExtras
                .filter((p) => p.categoria === cat)
                .reduce((acc, curr) => acc + Number(calculatePedidoAmount(curr).toString()), 0)

        return {
            MADEIRAS: sumByCategory(PedidoCategoria.MADEIRA),
            TELHAS: sumByCategory(PedidoCategoria.TELHA),
            MATERIAIS_GERAIS: sumByCategory(PedidoCategoria.MATERIAIS),
            OUTROS: sumByCategory(PedidoCategoria.ANDAIMES),
        }
    },
}
