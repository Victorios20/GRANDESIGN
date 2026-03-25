import { prisma } from "@/lib/prisma"
import { validateTransaction, TransactionInput } from "@/lib/validators/financial"
import { TipoLancamento } from "@prisma/client"

export async function createTransaction(input: TransactionInput, userId?: number) {
    // 1. Validate Business Rules
    await validateTransaction(input)

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

        return {
            lancamento,
            novo_saldo: updatedAccount.saldo_atual
        }
    })
}
