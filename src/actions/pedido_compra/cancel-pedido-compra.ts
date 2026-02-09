"use server"

import { prisma } from "@/lib/prisma"
import { PedidoCompraStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function cancelPedidoCompra(pedidoId: number) {
    if (!pedidoId) {
        throw new Error("ID do pedido inválido")
    }

    try {
        const p = await prisma.pedido_compra.findUnique({
            where: { id: pedidoId },
            select: { status: true, obra_id: true }
        })

        if (!p) throw new Error("Pedido não encontrado")

        if (p.status === PedidoCompraStatus.ENTREGUE || p.status === PedidoCompraStatus.CANCELADO) {
            throw new Error("Não é possível cancelar um pedido já entregue ou cancelado")
        }

        await prisma.pedido_compra.update({
            where: { id: pedidoId },
            data: { status: PedidoCompraStatus.CANCELADO }
        })

        revalidatePath(`/obras/${p.obra_id}`)
        revalidatePath("/pedido_compra")

        return { success: true }
    } catch (error: any) {
        console.error("Erro ao cancelar pedido:", error)
        return { success: false, error: error.message }
    }
}
