import { StatusFinanceiro } from "@prisma/client"

export interface ResolveReversalStatusParams {
    /** Status atual da conta a pagar/receber antes da reversão. */
    currentStatus: StatusFinanceiro
    /** Novo valor pago (conta a pagar) ou recebido (conta a receber) após a reversão. */
    newAmount: number
    /** Valor total da conta. */
    valorTotal: number
    /** Data de vencimento, usada para distinguir PENDENTE de ATRASADO quando zera. */
    dataVencimento?: Date | null
    /** Injetável para testes; default = agora. */
    now?: Date
}

/**
 * Decide o status de uma ContaPagar/ContaReceber após estornar/excluir um
 * lançamento vinculado.
 *
 * Regra crítica: uma conta já CANCELADA permanece CANCELADA. Mexer nos
 * lançamentos vinculados (estorno/exclusão) não pode "ressuscitar" a conta
 * para PENDENTE/PARCIAL/ATRASADO.
 */
export function resolveReversalStatus({
    currentStatus,
    newAmount,
    valorTotal,
    dataVencimento,
    now,
}: ResolveReversalStatusParams): StatusFinanceiro {
    if (currentStatus === StatusFinanceiro.CANCELADO) {
        return StatusFinanceiro.CANCELADO
    }

    if (newAmount > 0) {
        return newAmount >= valorTotal ? StatusFinanceiro.PAGO : StatusFinanceiro.PARCIAL
    }

    // Zerou: volta a aberto. Vencida vira ATRASADO.
    if (dataVencimento) {
        const today = now ? new Date(now) : new Date()
        today.setHours(0, 0, 0, 0)
        if (new Date(dataVencimento) < today) {
            return StatusFinanceiro.ATRASADO
        }
    }

    return StatusFinanceiro.PENDENTE
}
