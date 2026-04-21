import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const createCostCenterSchema = z.object({
    nome: z.string().trim().min(1, "Nome é obrigatório").max(150),
    descricao: z.string().trim().max(500).optional().nullable(),
    obra_id: z.number().int().positive().optional().nullable(),
})

const updateCostCenterSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string().trim().min(1).max(150).optional(),
    descricao: z.string().trim().max(500).optional().nullable(),
    obra_id: z.number().int().positive().optional().nullable(),
    ativo: z.boolean().optional(),
})

const costCenterInclude = {
    obra: {
        select: {
            id: true,
            titulo: true,
            endereco_obra: true,
        },
    },
    _count: {
        select: {
            lancamentos: true,
            contas_pagar: true,
            contas_receber: true,
        },
    },
} as const

type Tx = Prisma.TransactionClient

function buildAutomaticCostCenterName(obra: { id: number; titulo: string | null }) {
    const title = obra.titulo?.trim()
    return title || `Obra #${obra.id}`
}

async function ensureWorkExists(obraId: number | null | undefined) {
    if (!obraId) {
        return
    }

    const obra = await prisma.obras.findUnique({
        where: { id: obraId },
        select: { id: true },
    })

    if (!obra) {
        throw new Error("Obra não encontrada")
    }
}

async function ensureUniqueActiveCostCenterForWork(
    obraId: number | null | undefined,
    excludeId?: number
) {
    if (!obraId) {
        return
    }

    const existing = await prisma.centroCusto.findFirst({
        where: {
            obra_id: obraId,
            ativo: true,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: {
            id: true,
            nome: true,
            obra: {
                select: {
                    id: true,
                    titulo: true,
                },
            },
        },
    })

    if (existing) {
        const workLabel = existing.obra?.titulo?.trim()
            ? `Obra #${existing.obra.id} — ${existing.obra.titulo}`
            : `Obra #${obraId}`

        throw new Error(
            `${workLabel} já possui um centro de custo principal ativo: ${existing.nome}.`
        )
    }
}

export async function getCostCenters(activeOnly = true) {
    return prisma.centroCusto.findMany({
        where: activeOnly ? { ativo: true } : undefined,
        include: costCenterInclude,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
    })
}

export async function createCostCenter(input: z.infer<typeof createCostCenterSchema>) {
    const data = createCostCenterSchema.parse(input)

    await ensureWorkExists(data.obra_id)
    await ensureUniqueActiveCostCenterForWork(data.obra_id)

    return prisma.centroCusto.create({
        data: {
            nome: data.nome,
            descricao: data.descricao ?? null,
            obra_id: data.obra_id ?? null,
            ativo: true,
        },
        include: costCenterInclude,
    })
}

export async function getOrCreateActiveCostCenterForWork(tx: Tx, obraId: number) {
    const existing = await tx.centroCusto.findFirst({
        where: {
            obra_id: obraId,
            ativo: true,
        },
        orderBy: { id: "asc" },
        select: { id: true },
    })

    if (existing) {
        return existing
    }

    const obra = await tx.obras.findUnique({
        where: { id: obraId },
        select: {
            id: true,
            titulo: true,
        },
    })

    if (!obra) {
        throw new Error("Obra nao encontrada")
    }

    return tx.centroCusto.create({
        data: {
            nome: buildAutomaticCostCenterName(obra),
            descricao: "Centro de custo criado automaticamente a partir da obra.",
            obra_id: obra.id,
            ativo: true,
        },
        select: { id: true },
    })
}

export async function updateCostCenter(input: z.infer<typeof updateCostCenterSchema>) {
    const data = updateCostCenterSchema.parse(input)
    const current = await prisma.centroCusto.findUnique({
        where: { id: data.id },
        select: {
            id: true,
            ativo: true,
            obra_id: true,
        },
    })

    if (!current) {
        throw new Error("Centro de custo não encontrado")
    }

    const nextWorkId = data.obra_id === undefined ? current.obra_id : data.obra_id
    const nextActive = data.ativo === undefined ? current.ativo : data.ativo

    await ensureWorkExists(nextWorkId)

    if (nextActive) {
        await ensureUniqueActiveCostCenterForWork(nextWorkId, data.id)
    }

    return prisma.centroCusto.update({
        where: { id: data.id },
        data: {
            ...(data.nome !== undefined ? { nome: data.nome } : {}),
            ...(data.descricao !== undefined ? { descricao: data.descricao ?? null } : {}),
            ...(data.obra_id !== undefined ? { obra_id: data.obra_id ?? null } : {}),
            ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        },
        include: costCenterInclude,
    })
}
