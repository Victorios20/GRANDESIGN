import { StatusFinanceiro } from "@prisma/client"

import { getTodayDateOnly, parseDateOnlyInput } from "@/lib/date-only"
import { isSameMoneyAmount } from "@/lib/financial/money"

export const OPEN_FINANCIAL_STATUSES = [
    StatusFinanceiro.PENDENTE,
    StatusFinanceiro.PARCIAL,
    StatusFinanceiro.ATRASADO,
] as const

export function resolveOpenFinancialStatus(currentStatus: StatusFinanceiro, dueDate: Date) {
    if (currentStatus === StatusFinanceiro.PARCIAL) return StatusFinanceiro.PARCIAL

    // Compara no mesmo referencial (meio-dia UTC) usado para gravar/filtrar datas,
    // evitando reclassificacao indevida por fuso horario.
    const today = parseDateOnlyInput(getTodayDateOnly())

    return today && dueDate < today ? StatusFinanceiro.ATRASADO : StatusFinanceiro.PENDENTE
}

export function resolveFinancialStatusFromAmounts({
    currentStatus,
    total,
    paid,
    dueDate,
}: {
    currentStatus: StatusFinanceiro
    total: number
    paid: number
    dueDate: Date
}) {
    if (currentStatus === StatusFinanceiro.CANCELADO) return StatusFinanceiro.CANCELADO
    if (isSameMoneyAmount(total, paid)) return StatusFinanceiro.PAGO
    if (paid > 0) return StatusFinanceiro.PARCIAL
    return resolveOpenFinancialStatus(currentStatus, dueDate)
}

export function resolvePayablePaymentState({
    currentStatus,
    total,
    paid,
    amortized,
    dueDate,
    adjustTotal,
}: {
    currentStatus: StatusFinanceiro
    total: number
    paid: number
    amortized: number
    dueDate: Date
    adjustTotal: boolean
}) {
    const newPaid = paid + amortized
    const newTotal = adjustTotal ? newPaid : total
    const status = resolveFinancialStatusFromAmounts({
        currentStatus,
        total: newTotal,
        paid: newPaid,
        dueDate,
    })

    return { newPaid, newTotal, status }
}
