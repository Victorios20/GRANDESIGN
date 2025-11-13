// src/app/orcamentos/lib/logOrcamentoWebhook.ts

export type OrcamentoAcao =
  | "CRIAR_ORCAMENTO"
  | "EDITAR_ORCAMENTO"
  | "CRIAR_RASCUNHO_ORCAMENTO"
  | "CRIAR_COPIA_ORCAMENTO"

type ClientePayload = {
  id?: number
  nome?: string | null
  telefone?: string | null
  bairro?: string | null
  cidade?: string | null
}

type UsuarioPayload = {
  id?: string | number | null
  nome?: string | null
  email?: string | null
}

export type LogOrcamentoPayload = {
  acao: OrcamentoAcao
  orcamentoId?: number
  titulo?: string | null
  cliente?: ClientePayload
  usuario?: UsuarioPayload          // quem criou/editou
  editadoEm?: string                // quando aconteceu (ISO)
  dadosOrcamento?: unknown          // JSON dos dados salvos/alterados
}

const ENDPOINT_LOGS_ORCAMENTO = process.env
  .NEXT_PUBLIC_ENDPOINT_LOGS_ORCAMENTO as string | undefined

export async function logOrcamentoWebhook(payload: LogOrcamentoPayload) {
  if (!ENDPOINT_LOGS_ORCAMENTO) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("NEXT_PUBLIC_ENDPOINT_LOGS_ORCAMENTO não configurada")
    }
    return
  }

  const body = {
    ...payload,
    editadoEm: payload.editadoEm ?? new Date().toISOString(),
    origem: "grandesign-orcamentos",
    ambiente: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "DESCONHECIDO",
  }

  try {
    await fetch(ENDPOINT_LOGS_ORCAMENTO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Erro ao enviar log para n8n (orçamentos)", err)
    }
  }
}
