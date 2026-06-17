import { StatusFinanceiro } from "@prisma/client"

import { getTodayDateOnly, parseDateOnlyInput } from "@/lib/date-only"

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
