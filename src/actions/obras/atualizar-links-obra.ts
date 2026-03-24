"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { normalizeFixedLinkTitle, type LinkKey } from "./links-fixos"

const FIELD_MAP: Record<LinkKey, string> = {
  contrato: "link_contrato",
  proposta: "link_slide_orcamento",
  ordemServico: "link_ordem_servico",
  orcamento: "link_pdf_orcamento",
}

const TITLE_FIELD_MAP: Record<LinkKey, string> = {
  contrato: "titulo_link_contrato",
  proposta: "titulo_link_slide_orcamento",
  ordemServico: "titulo_link_ordem_servico",
  orcamento: "titulo_link_pdf_orcamento",
}

export async function atualizarLinkObra(
  obraId: number,
  key: LinkKey,
  url: string | null,
  titulo: string | null
): Promise<{ success: boolean; error?: string }> {
  const field = FIELD_MAP[key]
  const titleField = TITLE_FIELD_MAP[key]

  if (!field || !titleField) {
    return { success: false, error: "Campo invalido" }
  }

  try {
    await prisma.obras.update({
      where: { id: obraId },
      data: {
        [field]: url?.trim() || null,
        [titleField]: normalizeFixedLinkTitle(key, titulo),
      },
    })

    revalidatePath(`/obras/${obraId}`)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[atualizarLinkObra]", message)
    return { success: false, error: "Erro ao salvar link" }
  }
}

export async function obterTitulosLinksObra(
  obraId: number
): Promise<Record<LinkKey, string | null>> {
  const [row] = await prisma.$queryRaw<
    Array<{
      contrato: string | null
      proposta: string | null
      ordem_servico: string | null
      orcamento: string | null
    }>
  >`
    SELECT
      titulo_link_contrato AS contrato,
      titulo_link_slide_orcamento AS proposta,
      titulo_link_ordem_servico AS ordem_servico,
      titulo_link_pdf_orcamento AS orcamento
    FROM obras
    WHERE id = ${obraId}
    LIMIT 1
  `

  return {
    contrato: row?.contrato ?? null,
    proposta: row?.proposta ?? null,
    ordemServico: row?.ordem_servico ?? null,
    orcamento: row?.orcamento ?? null,
  }
}
