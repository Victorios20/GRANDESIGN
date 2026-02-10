"use server"

import { prisma } from "@/lib/prisma"
import { PedidoCompraStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function cancelPedidoCompra(pedidoId: number) {
    if (!pedidoId) {
        return { success: false, error: "ID do pedido inválido" }
    }

    const session = await getServerSession(authOptions as any)
    const actorId = Number((session as any)?.user?.id)
    if (!actorId || !Number.isFinite(actorId)) {
        return { success: false, error: "Não autenticado" }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const p = await tx.pedido_compra.findUnique({
                where: { id: pedidoId },
                select: { status: true, obra_id: true }
            })

            if (!p) throw new Error("Pedido não encontrado")

            if (p.status === PedidoCompraStatus.ENTREGUE || p.status === PedidoCompraStatus.CANCELADO) {
                throw new Error("Não é possível cancelar um pedido já entregue ou cancelado")
            }

            const previousStatus = p.status

            await tx.pedido_compra.update({
                where: { id: pedidoId },
                data: { status: PedidoCompraStatus.CANCELADO }
            })

            // Audit trail
            try {
                await tx.auditLog.create({
                    data: {
                        user_id: actorId,
                        action: "PEDIDO_COMPRA_CANCEL",
                        entity: "pedido_compra",
                        entity_id: pedidoId,
                        detail: {
                            previous_status: previousStatus,
                            new_status: PedidoCompraStatus.CANCELADO,
                        },
                    },
                })
            } catch {
                // best effort — don't fail the cancel if audit fails
            }

            return p.obra_id
        }, { timeout: 30_000, maxWait: 10_000 })

        revalidatePath(`/obras/${result}`)
        revalidatePath("/pedido_compra")

        return { success: true }
    } catch (error: any) {
        console.error("Erro ao cancelar pedido:", error)
        return { success: false, error: error.message }
    }
}
