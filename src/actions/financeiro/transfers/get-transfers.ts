import { prisma } from "@/lib/prisma"

export interface GetTransfersOptions {
    page?: number
    limit?: number
    conta_id?: number // Can be origin or destination
}

export async function getTransfers(options: GetTransfersOptions = {}) {
    const { page = 1, limit = 20, conta_id } = options
    const skip = (page - 1) * limit

    const where: any = {}
    if (conta_id) {
        where.OR = [
            { conta_origem_id: conta_id },
            { conta_destino_id: conta_id }
        ]
    }

    const [total, data] = await prisma.$transaction([
        prisma.transferencia.count({ where }),
        prisma.transferencia.findMany({
            where,
            skip,
            take: limit,
            orderBy: { data_transferencia: "desc" },
            include: {
                conta_origem: { select: { id: true, nome: true } },
                conta_destino: { select: { id: true, nome: true } },
                createdBy: { select: { id: true, name: true } }
            }
        })
    ])

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }
}
