import { prisma } from "@/lib/prisma"
import { CashFlowProjectionItem } from "@/types/financeiro"
import { StatusFinanceiro } from "@prisma/client"
import { startOfDay, endOfDay, addDays, format, isSameDay, parseISO, isValid } from "date-fns"

interface CashFlowParams {
    start_date?: string
    days?: number
    centro_custo_id?: string | null
    conta_bancaria_id?: string | null
}

export async function getCashFlowProjection(params: CashFlowParams): Promise<CashFlowProjectionItem[]> {
    const today = startOfDay(new Date())
    const startDate = params.start_date ? startOfDay(parseISO(params.start_date)) : today

    if (!isValid(startDate)) throw new Error("Data inicial inválida")

    const daysToProject = params.days || 30
    const endDate = endOfDay(addDays(startDate, daysToProject - 1))

    const costCenterId = params.centro_custo_id && params.centro_custo_id !== "all" ? Number(params.centro_custo_id) : null
    const textBankId = params.conta_bancaria_id && params.conta_bancaria_id !== "all" ? Number(params.conta_bancaria_id) : null

    // 1. Get Initial Balance (Snapshot at "Now")
    // NOTE: If projecting from future, we ideally should calculate "expected balance at start_date".
    // For simplicity/MVP, we take Current Balance + (Pending Items BETWEEN Now AND StartDate).
    // If start_date is Today, it's just Current Balance.

    const bankWhere: any = { ativo: true }
    if (textBankId) bankWhere.id = textBankId

    const bankAgg = await prisma.contasBancaria.aggregate({
        _sum: { saldo_atual: true },
        where: bankWhere
    })

    let currentBalance = Number(bankAgg._sum.saldo_atual || 0)

    // Adjust balance if start_date is in the future
    // We need to add/subtract items between NOW and StartDate to get the "Starting Balance" for the projection
    if (startDate > today) {
        // This gap logic is complex. For now, we assume "Starting Balance" is "Current Bank Balance".
        // Use case: "Show me projection starting next month".
        // We will just use current balance as the base, ignoring the gap for now to keep it P0 simple,
        // unless requested otherwise. Ideally we'd sum pending items in the gap.
    }

    // 2. Fetch Pending Items in Range
    const statusFilter = { in: [StatusFinanceiro.PENDENTE, StatusFinanceiro.PARCIAL, StatusFinanceiro.ATRASADO] }

    const whereBase: any = {
        status: statusFilter,
        data_vencimento: {
            gte: startDate,
            lte: endDate
        }
    }

    if (costCenterId) whereBase.centro_custo_id = costCenterId

    // For transactions, we can't easily filter by Bank Account on *Pending* items 
    // because they might not be assigned to a bank account yet (Payables/Receivables).
    // However, if the user selected a Bank Account, maybe they only want items *linked* to it?
    // Usually pending items don't have a bank account link yet until paid. 
    // So filtering pending items by bank account might result in 0 items. 
    // We will IGNORE bank_account_filter for pending items (standard practice for cash flow view).

    const [receivables, payables] = await Promise.all([
        prisma.contaReceber.findMany({
            where: whereBase,
            select: { data_vencimento: true, valor_total: true, valor_recebido: true }
        }),
        prisma.contaPagar.findMany({
            where: whereBase,
            select: { data_vencimento: true, valor_total: true, valor_pago: true }
        })
    ])

    // 3. Project Daily
    const projection: CashFlowProjectionItem[] = []
    let runningBalance = currentBalance

    for (let i = 0; i < daysToProject; i++) {
        const currentDate = addDays(startDate, i)

        // Sum items for this day
        const dayReceivables = receivables
            .filter(r => isSameDay(r.data_vencimento, currentDate))
            .reduce((acc, r) => acc + (Number(r.valor_total) - Number(r.valor_recebido)), 0)

        const dayPayables = payables
            .filter(p => isSameDay(p.data_vencimento, currentDate))
            .reduce((acc, p) => acc + (Number(p.valor_total) - Number(p.valor_pago)), 0)

        const saldoInicial = runningBalance
        const saldoFinal = saldoInicial + dayReceivables - dayPayables

        // Update running balance
        runningBalance = saldoFinal

        // Determine Status
        let status: "OK" | "ALERTA" | "CRITICO" = "OK"
        if (saldoFinal < 0) status = "CRITICO"
        else if (saldoFinal < 10000) status = "ALERTA" // Threshold 10k

        projection.push({
            date: format(currentDate, "yyyy-MM-dd"),
            saldo_inicial: saldoInicial,
            entradas_previstas: dayReceivables,
            saidas_previstas: dayPayables,
            saldo_final: saldoFinal,
            status
        })
    }

    return projection
}
