"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { TipoDocumento, ObraDocumento } from "./documentos-types"

// Re-export types para conveniência
export type { TipoDocumento, ObraDocumento }

/**
 * Lista todos os documentos de uma obra
 */
export async function listarDocumentos(obraId: number): Promise<ObraDocumento[]> {
    const docs = await prisma.obra_documentos.findMany({
        where: { obra_id: obraId },
        orderBy: { created_at: "desc" },
    })

    return docs.map((d) => ({
        id: d.id,
        obra_id: d.obra_id,
        tipo: d.tipo as TipoDocumento,
        titulo: d.titulo,
        url: d.url,
        link: d.link,
        created_at: d.created_at,
    }))
}

/**
 * Cria um novo documento para a obra
 */
export async function criarDocumento(data: {
    obraId: number
    tipo: TipoDocumento
    titulo: string
    url?: string | null
    link?: string | null
}): Promise<{ success: boolean; documento?: ObraDocumento; error?: string }> {
    try {
        // Validar que tem url OU link
        if (!data.url && !data.link) {
            return { success: false, error: "É necessário fornecer um arquivo ou link" }
        }

        // Validar título
        if (!data.titulo?.trim()) {
            return { success: false, error: "Título é obrigatório" }
        }

        const doc = await prisma.obra_documentos.create({
            data: {
                obra_id: data.obraId,
                tipo: data.tipo,
                titulo: data.titulo.trim(),
                url: data.url ?? null,
                link: data.link ?? null,
            },
        })

        revalidatePath("/obras")
        revalidatePath(`/obras/${data.obraId}`)

        return {
            success: true,
            documento: {
                id: doc.id,
                obra_id: doc.obra_id,
                tipo: doc.tipo as TipoDocumento,
                titulo: doc.titulo,
                url: doc.url,
                link: doc.link,
                created_at: doc.created_at,
            },
        }
    } catch (error) {
        console.error("Erro ao criar documento:", error)
        return { success: false, error: "Erro ao salvar documento" }
    }
}

/**
 * Exclui um documento da obra
 */
export async function excluirDocumento(
    documentoId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const doc = await prisma.obra_documentos.findUnique({
            where: { id: documentoId },
            select: { obra_id: true },
        })

        if (!doc) {
            return { success: false, error: "Documento não encontrado" }
        }

        await prisma.obra_documentos.delete({
            where: { id: documentoId },
        })

        revalidatePath("/obras")
        revalidatePath(`/obras/${doc.obra_id}`)

        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir documento:", error)
        return { success: false, error: "Erro ao excluir documento" }
    }
}
