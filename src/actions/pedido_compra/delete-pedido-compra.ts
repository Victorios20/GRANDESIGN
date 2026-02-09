"use server"

import { excluirPedidoCompra } from "./delete-pedido-compra-db"
import { revalidatePath } from "next/cache"

export async function deletePedidoCompra(pedidoId: number, actorUserId: number = 1) { // Defaulting actor to 1 (Admin) for now if not passed
    if (!pedidoId) {
        throw new Error("ID do pedido inválido")
    }

    try {
        await excluirPedidoCompra(pedidoId, actorUserId)

        revalidatePath("/pedido_compra")
        revalidatePath(`/obras`) // Revalidate broadly to be safe
        return { success: true }
    } catch (error: any) {
        console.error("Erro ao excluir pedido:", error)
        return { success: false, error: error.message }
    }
}
