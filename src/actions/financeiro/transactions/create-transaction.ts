import { prisma } from "@/lib/prisma"
import { validateTransaction, TransactionInput } from "@/lib/validators/financial"
import { TipoLancamento } from "@prisma/client"
import { getCashFlowSettings } from "@/actions/financeiro/settings/cash-flow"

function isDateClosed(date: Date, closingDateIso?: string | null) {
    if (!closingDateIso) return false
    return new Date(date) <= new Date(closingDateIso)
}

export async function createTransaction(input: TransactionInput, userId?: number) {
    // 1. Validate Business Rules
    await validateTransaction(input)
    const settings = await getCashFlowSettings()
    const effectiveDate = input.data_competencia || input.data_lancamento

    if (isDateClosed(effectiveDate, settings.closing_date)) {
        throw new Error("Período financeiro fechado")
    }

    // 2. Execute Atomic Transaction
    return await prisma.$transaction(async (tx) => {
        // A. Create Confirmation
        // Default competência to data_lancamento if missing
        const data_competencia = input.data_competencia || input.data_lancamento

        const lancamento = await tx.lancamento.create({
            data: {
                ...input,
                data_competencia,
                created_by: userId
            }
        })

        // B. Update Bank Balance
        // RECEITA = + | DESPESA = -
        const operation = input.tipo === TipoLancamento.RECEITA ? "increment" : "decrement"

        const updatedAccount = await tx.contasBancaria.update({
            where: { id: input.conta_bancaria_id },
            data: {
                saldo_atual: {
                    [operation]: input.valor
                }
            }
        })

        if (userId) {
            await tx.auditLog.create({
                data: {
                    action: "TRANSACTION_CREATED",
                    entity: "lancamento",
                    entity_id: lancamento.id,
                    user_id: userId,
                    detail: {
                        descricao: lancamento.descricao,
                        valor: Number(lancamento.valor),
                        tipo: lancamento.tipo,
                        data_lancamento: lancamento.data_lancamento.toISOString(),
                        data_competencia: lancamento.data_competencia.toISOString(),
                    },
                },
            })
        }

        return {
            lancamento,
            novo_saldo: updatedAccount.saldo_atual
        }
    })
}


