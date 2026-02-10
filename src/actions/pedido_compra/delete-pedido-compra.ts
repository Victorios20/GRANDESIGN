"use server"

import { excluirPedidoCompra } from "./delete-pedido-compra-db"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function deletePedidoCompra(pedidoId: number) {
    if (!pedidoId) {
        return { success: false, error: "ID do pedido inválido" }
    }

    const session = await getServerSession(authOptions as any)
    const actorId = Number((session as any)?.user?.id)
    if (!actorId || !Number.isFinite(actorId)) {
        return { success: false, error: "Não autenticado" }
    }

    try {
        await excluirPedidoCompra(pedidoId, actorId)

        revalidatePath("/pedido_compra")
        revalidatePath("/obras")
        return { success: true }
    } catch (error: any) {
        console.error("Erro ao excluir pedido:", error)
        return { success: false, error: error.message }
    }
}
