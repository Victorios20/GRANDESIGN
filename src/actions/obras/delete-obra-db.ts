"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function deleteObraDB(id: number) {
    try {
        if (!id) throw new Error("ID da obra não informado")

        // Prisma handles cascading deletes for:
        // - pedido_compra (via onDelete: Cascade)
        // - ordem_servico (via onDelete: Cascade on unique relation)
        // - obra_imagens (via onDelete: Cascade)
        // - obra_agenda_segmento (via onDelete: Cascade)
        // - obra_documentos (via onDelete: Cascade)

        // Relationships that are SET NULL:
        // - orcamento (via onDelete: SetNull)
        // - equipe (via onDelete: SetNull)

        // Cliente is NOT deleted (N:1 relation, no cascade on parent)

        const deleted = await prisma.obras.delete({
            where: { id },
        })

        revalidatePath("/obras")
        revalidatePath(`/obras/${id}`)

        return { success: true }
    } catch (error: any) {
        console.error("Erro ao excluir obra:", error)
        return { success: false, error: error.message || "Erro ao excluir obra" }
    }
}
