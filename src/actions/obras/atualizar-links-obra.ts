"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type LinkKey = "contrato" | "proposta" | "ordemServico" | "orcamento"

const FIELD_MAP: Record<LinkKey, string> = {
  contrato: "link_contrato",
  proposta: "link_slide_orcamento",
  ordemServico: "link_ordem_servico",
  orcamento: "link_pdf_orcamento",
}

export async function atualizarLinkObra(
  obraId: number,
  key: LinkKey,
  url: string | null
): Promise<{ success: boolean; error?: string }> {
  const field = FIELD_MAP[key]
  if (!field) return { success: false, error: "Campo inválido" }

  try {
    await prisma.obras.update({
      where: { id: obraId },
      data: { [field]: url?.trim() || null },
    })

    revalidatePath(`/obras/${obraId}`)
    return { success: true }
  } catch (err: any) {
    console.error("[atualizarLinkObra]", err?.message ?? err)
    return { success: false, error: "Erro ao salvar link" }
  }
}
