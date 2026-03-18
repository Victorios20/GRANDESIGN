type ObraStatusTone =
  | "contract"
  | "technical"
  | "procurement"
  | "scheduled"
  | "active"
  | "billing"
  | "issue"
  | "done"
  | "neutral"

type ObraStatusConfig = {
  key: string
  label: string
  tone: ObraStatusTone
  aliases: string[]
}

export type ObraStatusMeta = {
  key: string | null
  label: string
  tone: ObraStatusTone
  isKnown: boolean
}

const OBRA_STATUS_CONFIGS: ObraStatusConfig[] = [
  {
    key: "ASSINATURA_DE_CONTRATO",
    label: "Assinatura de contrato",
    tone: "contract",
    aliases: ["assinatura_de_contrato", "assinatura de contrato"],
  },
  {
    key: "AGUARDANDO_VALIDACAO_TECNICA",
    label: "Aguardando validação técnica",
    tone: "technical",
    aliases: ["aguardando_validacao_tecnica", "aguardando validacao tecnica"],
  },
  {
    key: "COMPRAS",
    label: "Compras",
    tone: "procurement",
    aliases: ["compras"],
  },
  {
    key: "A_INICIAR",
    label: "À iniciar",
    tone: "scheduled",
    aliases: ["a_iniciar", "a iniciar"],
  },
  {
    key: "EXECUCAO",
    label: "Execução",
    tone: "active",
    aliases: ["execucao", "execução"],
  },
  {
    key: "AGUARDANDO_PAGAMENTO",
    label: "Aguardando pagamento",
    tone: "billing",
    aliases: ["aguardando_pagamento", "aguardando pagamento"],
  },
  {
    key: "PENDENCIA",
    label: "Pendência",
    tone: "issue",
    aliases: ["pendencia", "pendência"],
  },
  {
    key: "FINALIZADO",
    label: "Finalizado",
    tone: "done",
    aliases: ["finalizado"],
  },
]

function normalizeStatusValue(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

const OBRA_STATUS_BY_ALIAS = new Map(
  OBRA_STATUS_CONFIGS.flatMap((config) =>
    config.aliases.map((alias) => [normalizeStatusValue(alias), config] as const)
  )
)

export function getObraStatusMeta(status?: string | null): ObraStatusMeta {
  const raw = String(status ?? "").trim()
  if (!raw) {
    return { key: null, label: "-", tone: "neutral", isKnown: false }
  }

  const knownStatus = OBRA_STATUS_BY_ALIAS.get(normalizeStatusValue(raw))
  if (knownStatus) {
    return {
      key: knownStatus.key,
      label: knownStatus.label,
      tone: knownStatus.tone,
      isKnown: true,
    }
  }

  return {
    key: null,
    label: raw,
    tone: "neutral",
    isKnown: false,
  }
}
