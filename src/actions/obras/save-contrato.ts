"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

type Result =
    | { ok: true; linkContrato: string; dataContrato: string }
    | { ok: false; error: string }

/**
 * Saves the signed contract link and sets the upload date.
 * If the contract already had a date, it is preserved.
 * Uses 'link_contrato_assinado' field to distinguish from generated contract.
 */
export async function saveContrato(
    obraId: number,
    linkContrato: string
): Promise<Result> {
    if (!obraId || Number.isNaN(obraId)) {
        return { ok: false, error: "OBRA_ID_INVALIDO" }
    }

    const link = (linkContrato ?? "").trim()
    if (!link) {
        return { ok: false, error: "LINK_CONTRATO_OBRIGATORIO" }
    }

    try {
        const obra = await prisma.obras.findUnique({
            where: { id: obraId },
            select: { id: true, data_contrato: true },
        })

        if (!obra) {
            return { ok: false, error: "OBRA_NAO_ENCONTRADA" }
        }

        // Set the contract date to now if not already set
        const dataContrato = obra.data_contrato ?? new Date()

        await prisma.obras.update({
            where: { id: obraId },
            data: {
                link_contrato_assinado: link,
                data_contrato: dataContrato,
            },
        })

        revalidatePath("/obras")
        revalidatePath("/calendario")

        return {
            ok: true,
            linkContrato: link,
            dataContrato: dataContrato instanceof Date
                ? dataContrato.toISOString()
                : new Date(dataContrato).toISOString(),
        }
    } catch (err) {
        console.error("[saveContrato] error:", err)
        return { ok: false, error: "ERRO_INTERNO" }
    }
}
