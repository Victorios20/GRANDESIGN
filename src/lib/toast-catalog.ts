// Centraliza as mensagens e níveis de severidade para o Sonner
import { toast } from "sonner"

export type Severity = "success" | "error" | "warning" | "info"

export type ToastReason =
  | "missing_title"
  | "missing_client_fields"
  | "missing_city_or_tipoObra"
  | "materials_required"
  | "non_negative_violation"
  | "cannot_generate_pdf_yet"
  | "select_row_to_edit"

const reasonMap: Record<ToastReason, { title: string; description?: string; severity: Severity }> = {
  missing_title: {
    title: "Título obrigatório",
    description: "Defina um título para este orçamento.",
    severity: "warning",
  },
  missing_client_fields: {
    title: "Dados do cliente incompletos",
    description: "Preencha pelo menos nome e telefone.",
    severity: "warning",
  },
  missing_city_or_tipoObra: {
    title: "Informações de obra incompletas",
    description: "Selecione a cidade e o tipo de obra.",
    severity: "warning",
  },
  materials_required: {
    title: "Materiais obrigatórios",
    description: "Adicione ao menos um item em Madeiras.",
    severity: "warning",
  },
  non_negative_violation: {
    title: "Valor inválido",
    description: "Não são permitidos valores negativos.",
    severity: "error",
  },
  cannot_generate_pdf_yet: {
    title: "Pendências antes do PDF",
    description: "Revise as etapas anteriores no resumo.",
    severity: "warning",
  },
  select_row_to_edit: {
    title: "Selecione um item",
    description: "Escolha uma linha para habilitar ‘Editar’.",
    severity: "info",
  },
}

type Extra = { fields?: string[]; hint?: string }

export function toastByReason(reason: ToastReason, extra?: Extra) {
  const { title, description, severity } = reasonMap[reason]
  const desc =
    (description ?? "") +
    (extra?.fields?.length ? ` Campos: ${extra.fields.join(", ")}` : "") +
    (extra?.hint ? ` Dica: ${extra.hint}` : "")

  switch (severity) {
    case "success": return toast.success(title, { description: desc })
    case "error":   return toast.error(title, { description: desc })
    case "warning": return toast.warning(title, { description: desc })
    case "info":    return toast.info(title, { description: desc })
  }
}

export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  error:   (title: string, description?: string) => toast.error(title, { description }),
  warning: (title: string, description?: string) => toast.warning(title, { description }),
  info:    (title: string, description?: string) => toast.info(title, { description }),
}
