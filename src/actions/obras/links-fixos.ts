export type LinkKey = "contrato" | "proposta" | "ordemServico" | "orcamento"

export const DEFAULT_FIXED_LINK_LABELS: Record<LinkKey, string> = {
  contrato: "Contrato (Gerado)",
  proposta: "Proposta",
  ordemServico: "Ordem de Serviço",
  orcamento: "Orçamento",
}

export function normalizeFixedLinkTitle(
  key: LinkKey,
  title: string | null | undefined
): string | null {
  const normalized = title?.trim() ?? ""
  if (!normalized) return null
  return normalized === DEFAULT_FIXED_LINK_LABELS[key] ? null : normalized
}
