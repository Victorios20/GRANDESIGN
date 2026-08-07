import type { StatusOption } from "@/components/ui/StatusSelect"
import { formatDateOnlyPtBr } from "@/lib/date-only"

// ── Currency ──

export function formatCurrency(value: number | string | null | undefined): string {
    const num = typeof value === "string" ? parseFloat(value) : (value ?? 0)
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ── Date ──

export function formatDateBR(date: string | Date | null | undefined): string {
    if (!date) return "—"
    return formatDateOnlyPtBr(date)
}

// ── Status ──

type StatusKey = "PENDENTE" | "PAGO" | "PARCIAL" | "ATRASADO" | "CANCELADO"

const STATUS_LABELS: Record<StatusKey, string> = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    PARCIAL: "Parcial",
    ATRASADO: "Atrasado",
    CANCELADO: "Cancelado",
}

const STATUS_COLORS: Record<StatusKey, "amber" | "green" | "blue" | "red" | "gray"> = {
    PENDENTE: "amber",
    PAGO: "green",
    PARCIAL: "blue",
    ATRASADO: "red",
    CANCELADO: "gray",
}

export function getStatusLabel(status: string): string {
    return STATUS_LABELS[status as StatusKey] ?? status
}

export function getStatusColor(status: string) {
    return STATUS_COLORS[status as StatusKey] ?? "gray"
}

export const FINANCIAL_STATUS_OPTIONS: StatusOption<StatusKey>[] = [
    { label: "Pendente", value: "PENDENTE", color: "amber" },
    { label: "Pago", value: "PAGO", color: "green" },
    { label: "Parcial", value: "PARCIAL", color: "blue" },
    { label: "Atrasado", value: "ATRASADO", color: "red" },
    { label: "Cancelado", value: "CANCELADO", color: "gray" },
]

// ── Helpers ──

export function canPay(status: string): boolean {
    return ["PENDENTE", "PARCIAL", "ATRASADO"].includes(status)
}

export function canEdit(status: string): boolean {
    return status !== "PAGO" && status !== "CANCELADO"
}

export function canCancel(status: string): boolean {
    return status !== "PAGO" && status !== "CANCELADO"
}

export function remaining(total: number | string, paid: number | string): number {
    return Number(total) - Number(paid)
}

/**
 * Reconhece buscas por ID (inteiro positivo, com ou sem prefixo "#"),
 * mesma regra usada no filtro server-side (actions/financeiro/shared/search.ts).
 * Usado para decidir quando a busca deve ignorar o recorte de status atual.
 */
export function isIdSearchTerm(term: string): boolean {
    const digits = term.trim().replace(/^#/, "")
    return /^\d+$/.test(digits) && Number(digits) > 0
}
