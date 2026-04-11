/**
 * GRANDESIGN Design System — StatusBadge
 *
 * Badge de status unificado para toda a aplicação.
 * Substitui as múltiplas implementações inline espalhadas pelos módulos.
 *
 * Paleta: usa apenas as cores semânticas do brand.md seção 2.
 */

import { cn } from "@/lib/utils"

// ── Tipos de status suportados ────────────────────────────────────────────────

/** Status operacionais de Obras */
export type ObraStatus =
  | "ASSINATURA_DE_CONTRATO"
  | "AGUARDANDO_VALIDACAO_TECNICA"
  | "COMPRAS"
  | "A_INICIAR"
  | "EXECUCAO"
  | "AGUARDANDO_PAGAMENTO"
  | "PENDENCIA"
  | "FINALIZADO"

/** Status financeiros (Contas a Pagar / Receber) */
export type FinanceiroStatus =
  | "PENDENTE"
  | "PARCIAL"
  | "PAGO"
  | "VENCIDO"
  | "CANCELADO"

/** Status de segmentos de Agenda */
export type AgendaStatus =
  | "AGENDADO"
  | "EXECUCAO"
  | "A_INICIAR"
  | "COMPRAS"
  | "PENDENCIA"

/** Status genérico — para casos de fallback */
export type GenericStatus = "ATIVO" | "EXCLUIDO" | "EM_OBRA" | "RASCUNHO"

export type StatusBadgeStatus =
  | ObraStatus
  | FinanceiroStatus
  | AgendaStatus
  | GenericStatus

// ── Mapa de estilos ────────────────────────────────────────────────────────────

type BadgeVariant = {
  label: string
  className: string
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Obras
  ASSINATURA_DE_CONTRATO:       { label: "Assinatura de contrato", className: "bg-amber-50 text-amber-700 border-amber-200" },
  AGUARDANDO_VALIDACAO_TECNICA: { label: "Aguardando validação",   className: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPRAS:                      { label: "Compras",                className: "bg-amber-50 text-amber-700 border-amber-200" },
  A_INICIAR:                    { label: "À iniciar",              className: "bg-sky-50    text-sky-700    border-sky-200" },
  EXECUCAO:                     { label: "Execução",               className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  AGUARDANDO_PAGAMENTO:         { label: "Aguardando pagamento",   className: "bg-orange-50 text-orange-700 border-orange-200" },
  PENDENCIA:                    { label: "Pendência",              className: "bg-rose-50   text-rose-700   border-rose-200" },
  FINALIZADO:                   { label: "Finalizado",             className: "bg-emerald-50 text-emerald-800 border-emerald-200" },

  // Financeiro
  PENDENTE:   { label: "Pendente",  className: "bg-amber-50  text-amber-700  border-amber-200" },
  PARCIAL:    { label: "Parcial",   className: "bg-sky-50    text-sky-700    border-sky-200" },
  PAGO:       { label: "Pago",      className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  VENCIDO:    { label: "Vencido",   className: "bg-red-50    text-red-700    border-red-200" },
  CANCELADO:  { label: "Cancelado", className: "bg-stone-100 text-stone-700  border-stone-300" },

  // Agenda
  AGENDADO: { label: "Agendado", className: "bg-sky-50 text-sky-700 border-sky-200" },

  // Genérico
  ATIVO:     { label: "Ativo",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EXCLUIDO:  { label: "Excluído",  className: "bg-red-50     text-red-700     border-red-200" },
  EM_OBRA:   { label: "Em Obra",   className: "bg-[#FDF5EB]  text-[#8B5E3C]  border-[#D9B99B]/40" },
  RASCUNHO:  { label: "Rascunho",  className: "bg-stone-100  text-stone-700   border-stone-300" },
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  /** Status conhecido do sistema — será mapeado automaticamente */
  status?: StatusBadgeStatus | string
  /** Label customizado (sobrescreve o label do mapa) */
  label?: string
  /** Classe Tailwind para cor customizada (sobrescreve o estilo do mapa) */
  colorClass?: string
  className?: string
  /** Tamanho: default = badge normal, sm = micro badge */
  size?: "default" | "sm"
  /** Mostrar ponto colorido ao invés de fundo */
  dot?: boolean
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  label,
  colorClass,
  className,
  size = "default",
  dot = false,
}: StatusBadgeProps) {
  const mapped = status ? STATUS_MAP[status] : undefined
  const resolvedLabel  = label ?? mapped?.label ?? String(status ?? "—")
  const resolvedClass  = colorClass ?? mapped?.className ?? "bg-stone-100 text-stone-700 border-stone-200"

  if (dot) {
    const dotColor = resolvedClass.split(" ").find(c => c.startsWith("text-"))
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-[#2c201b]", className)}>
        <span className={cn("size-2 rounded-full", dotColor?.replace("text-", "bg-"))} />
        {resolvedLabel}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium leading-none",
        size === "default" && "px-2 py-0.5 text-[11px] tracking-[0.01em]",
        size === "sm"      && "px-1.5 py-px text-[10px]",
        resolvedClass,
        className
      )}
    >
      {resolvedLabel}
    </span>
  )
}
