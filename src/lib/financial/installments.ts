import { addMonths } from "date-fns"

export interface InstallmentPlan {
    totalValue: number
    count: number
    firstSubtitle?: string // e.g. "Entrada"
}

export interface InstallmentResult {
    parcela: number
    valor: number
    data_vencimento: Date
}

export function calculateInstallments(
    totalValue: number,
    count: number,
    startDate: Date
): InstallmentResult[] {
    const result: InstallmentResult[] = []

    // Basic math
    const baseValue = Math.floor((totalValue / count) * 100) / 100
    const remainder = Math.round((totalValue - (baseValue * count)) * 100) / 100

    // Remainder goes to first installment(s) - specifically the first one usually
    // If remainder is 0.02, we add 0.01 to first and second? Or 0.02 to first? 
    // Standard is usually adding to the first.

    for (let i = 1; i <= count; i++) {
        let valor = baseValue
        if (i === 1) {
            valor = Math.round((valor + remainder) * 100) / 100
        }

        result.push({
            parcela: i,
            valor,
            data_vencimento: addMonths(startDate, i - 1)
        })
    }

    return result
}
