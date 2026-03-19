/**
 * Pedido de Compra - Design Tokens & Theme Configuration
 * 
 * Centralized theme configuration based on official palette.
 * Import this file instead of duplicating status/color configs.
 */

// ═══════════════════════════════════════════════════════════
// OFFICIAL COLOR PALETTE
// ═══════════════════════════════════════════════════════════

export const palette = {
    primary: "#2c201b",      // Texto forte / headings
    secondary: "#393316",    // Primária operacional
    accent: "#f5d193",       // Destaque suave
    background: "#FAF3E0",   // Fundo suave / contextual
} as const

// ═══════════════════════════════════════════════════════════
// STATUS CONFIGURATION (replaces 6 duplicated statusConfig objects)
// ═══════════════════════════════════════════════════════════

export type StatusSlug =
    | "rascunho"
    | "pendente"
    | "aprovado"
    | "em-compra"
    | "aguardando-pagamento"
    | "aguardando-entrega"
    | "entregue"
    | "cancelado"

export type StatusConfig = {
    label: string
    shortLabel?: string
    bg: string
    text: string
    border: string
    /** Combined class for Badge component */
    badgeClass: string
    /** Solid background for chips/pills */
    chipClass: string
}

export const statusConfig: Record<StatusSlug, StatusConfig> = {
    rascunho: {
        label: "Rascunho",
        shortLabel: "Rascunho",
        bg: "bg-stone-100",
        text: "text-stone-700",
        border: "border-stone-300",
        badgeClass: "border-stone-300 bg-stone-100 text-stone-700",
        chipClass: "bg-stone-500",
    },
    pendente: {
        label: "Pendente",
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
        chipClass: "bg-yellow-500",
    },
    aprovado: {
        label: "Aprovado",
        shortLabel: "Aprovado",
        bg: "bg-sky-50",
        text: "text-sky-700",
        border: "border-sky-200",
        badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
        chipClass: "bg-sky-500",
    },
    "em-compra": {
        label: "Em Compra",
        shortLabel: "Em compra",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        chipClass: "bg-amber-500",
    },
    "aguardando-pagamento": {
        label: "Aguardando Pagamento",
        shortLabel: "Pagto pend.",
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        badgeClass: "border-orange-200 bg-orange-50 text-orange-700",
        chipClass: "bg-orange-500",
    },
    "aguardando-entrega": {
        label: "Aguardando Entrega",
        shortLabel: "Entrega pend.",
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        badgeClass: "border-yellow-200 bg-yellow-50 text-yellow-700",
        chipClass: "bg-yellow-500",
    },
    entregue: {
        label: "Entregue",
        shortLabel: "Entregue",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        chipClass: "bg-emerald-500",
    },
    cancelado: {
        label: "Cancelado",
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        badgeClass: "bg-red-100 text-red-800 border-red-300",
        chipClass: "bg-red-500",
    },
}

// ═══════════════════════════════════════════════════════════
// STATUS LIST (for iterations)
// ═══════════════════════════════════════════════════════════

export const statusList: StatusSlug[] = [
    "rascunho",
    "aprovado",
    "em-compra",
    "aguardando-pagamento",
    "aguardando-entrega",
    "entregue",
]

export const editableStatusList: StatusSlug[] = [
    "rascunho",
    "pendente",
    "aprovado",
    "em-compra",
    "aguardando-pagamento",
    "aguardando-entrega",
    "entregue",
    "cancelado",
]

// ═══════════════════════════════════════════════════════════
// CATEGORY CONFIGURATION
// ═══════════════════════════════════════════════════════════

export type CategorySlug = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES" | "ANDAIME"

export const categoryLabels: Record<CategorySlug, string> = {
    TELHA: "Telha",
    MADEIRA: "Madeira",
    MATERIAIS: "Materiais",
    ANDAIMES: "Andaimes",
    ANDAIME: "Andaime",
}
