import { prisma } from "@/lib/prisma"
import { StatusFinanceiro } from "@prisma/client"
import { startOfDay } from "date-fns"

/**
 * Updates status to ATRASADO for PENDENTE items with past due date.
 * Approach: Batch update via cron job.
 * Justification: 
 * - Efficient SQL batch updates.
 * - Allows explicit "Overdue" status in UI without computing on every read.
 * - Simplifies filtering and reporting.
 */
export async function updateOverdueStatus() {
    const today = startOfDay(new Date()) // 00:00:00 today

    // 1. Update Payables
    const payables = await prisma.contaPagar.updateMany({
        where: {
            status: StatusFinanceiro.PENDENTE,
            data_vencimento: {
                lt: today
            }
        },
        data: {
            status: StatusFinanceiro.ATRASADO
        }
    })

    // 2. Update Receivables
    const receivables = await prisma.contaReceber.updateMany({
        where: {
            status: StatusFinanceiro.PENDENTE,
            data_vencimento: {
                lt: today
            }
        },
        data: {
            status: StatusFinanceiro.ATRASADO
        }
    })

    return {
        payablesUpdated: payables.count,
        receivablesUpdated: receivables.count,
        referenceDate: today
    }
}
