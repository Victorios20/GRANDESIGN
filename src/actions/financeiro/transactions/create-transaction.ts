import { prisma } from "@/lib/prisma"
import { validateTransaction, TransactionInput } from "@/lib/validators/financial"
import { TipoLancamento } from "@prisma/client"
import { getCashFlowSettings } from "@/actions/financeiro/settings/cash-flow"
import { createCardFeeTransaction, resolveCardFeeAmount } from "@/actions/financeiro/card-fee"

function isDateClosed(date: Date, closingDateIso?: string | null) {
    if (!closingDateIso) return false
    return new Date(date) <= new Date(closingDateIso)
}

export async function createTransaction(input: TransactionInput, userId?: number) {
    // 1. Validate Business Rules
    await validateTransaction(input)
    const settings = await getCashFlowSettings()
    const effectiveDate = input.data_competencia || input.data_lancamento
    const { taxa_cartao_valor, taxa_cartao_percentual, ...transactionInput } = input
    const cardFee = resolveCardFeeAmount({ taxa_cartao_valor, taxa_cartao_percentual }, transactionInput.valor)

    if (isDateClosed(effectiveDate, settings.closing_date)) {
        throw new Error("Período financeiro fechado")
    }
    if (cardFee > 0 && transactionInput.tipo !== TipoLancamento.RECEITA) {
        throw new Error("Taxa de cartão manual só pode ser aplicada em receitas")
    }
    if (cardFee >= transactionInput.valor) {
        throw new Error("Taxa de cartão deve ser menor que o valor da receita")
    }

    // 2. Execute Atomic Transaction
    return await prisma.$transaction(async (tx) => {
        // A. Create Confirmation
        // Default competência to data_lancamento if missing
        const data_competencia = transactionInput.data_competencia || transactionInput.data_lancamento

        const lancamento = await tx.lancamento.create({
            data: {
                ...transactionInput,
                data_competencia,
                created_by: userId
            }
        })

        // B. Update Bank Balance
        // RECEITA = + | DESPESA = -
        const operation = transactionInput.tipo === TipoLancamento.RECEITA ? "increment" : "decrement"

        let updatedAccount = await tx.contasBancaria.update({
            where: { id: transactionInput.conta_bancaria_id },
            data: {
                saldo_atual: {
                    [operation]: transactionInput.valor
                }
            }
        })

        let taxaCartao = null
        if (cardFee > 0) {
            taxaCartao = await createCardFeeTransaction(tx, {
                origemLancamentoId: lancamento.id,
                origemDescricao: lancamento.descricao,
                valor: cardFee,
                dataLancamento: lancamento.data_lancamento,
                dataCompetencia: lancamento.data_competencia,
                contaBancariaId: transactionInput.conta_bancaria_id,
                centroCustoId: transactionInput.centro_custo_id ?? null,
                userId,
            })

            updatedAccount = await tx.contasBancaria.update({
                where: { id: transactionInput.conta_bancaria_id },
                data: { saldo_atual: { decrement: cardFee } },
            })
        }

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
            taxa_cartao: taxaCartao,
            novo_saldo: updatedAccount.saldo_atual
        }
    })
}


