import { StatusFinanceiro } from "@prisma/client"

export const OPEN_FINANCIAL_STATUSES = [
    StatusFinanceiro.PENDENTE,
    StatusFinanceiro.PARCIAL,
    StatusFinanceiro.ATRASADO,
] as const

export function resolveOpenFinancialStatus(currentStatus: StatusFinanceiro, dueDate: Date) {
    if (currentStatus === StatusFinanceiro.PARCIAL) return StatusFinanceiro.PARCIAL

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return dueDate < today ? StatusFinanceiro.ATRASADO : StatusFinanceiro.PENDENTE
}
