"use server"

import { getPedidoCompraDetalhado } from "./get-pedido-compra-detalhado-db"

export async function getPedidoDetailsAction(pedidoId: number) {
    try {
        const data = await getPedidoCompraDetalhado(pedidoId)
        // Convert Decimal/Date to plain objects if necessary for serialization
        // Prisma results often need serialization for "use client" components
        return { success: true, data: JSON.parse(JSON.stringify(data)) }
    } catch (error: any) {
        console.error("Erro ao carregar detalhes do pedido:", error)
        return { success: false, error: error.message }
    }
}
