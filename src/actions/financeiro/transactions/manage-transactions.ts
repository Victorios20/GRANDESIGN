import { prisma } from "@/lib/prisma"
import { transactionSchema, validateTransaction } from "@/lib/validators/financial"
import { ConferenciaStatus, Prisma, StatusConferencia, TipoLancamento } from "@prisma/client"
import { z } from "zod"
import { getCashFlowSettings } from "@/actions/financeiro/settings/cash-flow"

const conferenceAccountSchema = z.object({
    conta_bancaria_id: z.number().int().positive(),
    nota: z.string().max(1000).nullable().optional(),
})

export const updateManualTransactionSchema = transactionSchema
export const adjustManualTransactionSchema = transactionSchema.extend({
    reason: z.string().max(255).nullable().optional(),
})
export const reverseManualTransactionSchema = z.object({
    reason: z.string().max(255).nullable().optional(),
})
export const conferenceStatusSchema = z.object({
    status: z.enum(["CONFERIDO", "PENDENCIA"]),
    pendencia_motivo: z.string().max(255).nullable().optional(),
})
export const conferenceSessionCreateSchema = conferenceAccountSchema
export const conferenceSessionReopenSchema = z.object({
    reason: z.string().min(3).max(1000),
})
export const closeConferenceSessionSchema = z.object({
    nota: z.string().max(1000).nullable().optional(),
})

export type UpdateManualTransactionInput = z.infer<typeof updateManualTransactionSchema>
export type AdjustManualTransactionInput = z.infer<typeof adjustManualTransactionSchema>
export type ReverseManualTransactionInput = z.infer<typeof reverseManualTransactionSchema>
export type ConferenceStatusInput = z.infer<typeof conferenceStatusSchema>
export type ConferenceSessionCreateInput = z.infer<typeof conferenceSessionCreateSchema>
export type ConferenceSessionReopenInput = z.infer<typeof conferenceSessionReopenSchema>
export type CloseConferenceSessionInput = z.infer<typeof closeConferenceSessionSchema>

type DbClient = Prisma.TransactionClient | typeof prisma

function getSignedAmount(tipo: TipoLancamento, value: Prisma.Decimal | number) {
    const amount = Number(value)
    return tipo === TipoLancamento.RECEITA ? amount : -amount
}

function getOppositeTipo(tipo: TipoLancamento) {
    return tipo === TipoLancamento.RECEITA ? TipoLancamento.DESPESA : TipoLancamento.RECEITA
}

function getAccountBacklogWhere(contaBancariaId: number): Prisma.LancamentoWhereInput {
    return {
        conta_bancaria_id: contaBancariaId,
        status_conferencia: { not: StatusConferencia.CONFERIDO },
    }
}

async function applyAccountDelta(
    tx: Prisma.TransactionClient,
    contaBancariaId: number,
    delta: number
) {
    if (delta === 0) return

    await tx.contasBancaria.update({
        where: { id: contaBancariaId },
        data: delta > 0
            ? { saldo_atual: { increment: delta } }
            : { saldo_atual: { decrement: Math.abs(delta) } },
    })
}

async function getTransactionForMutation(id: number) {
    const lancamento = await prisma.lancamento.findUnique({
        where: { id },
        include: {
            conferencia_sessoes: true,
        },
    })

    if (!lancamento) {
        throw new Error("Lançamento não encontrado")
    }

    return lancamento
}

function ensureManualTransaction(lancamento: {
    conta_pagar_id: number | null
    conta_receber_id: number | null
    transferencia_id: number | null
}) {
    if (lancamento.conta_pagar_id || lancamento.conta_receber_id || lancamento.transferencia_id) {
        throw new Error("Este lançamento deve ser ajustado no módulo de origem")
    }
}

function ensureSessionEditable(session: { status: ConferenciaStatus } | null) {
    if (session?.status === ConferenciaStatus.LOCKED) {
        throw new Error("Revisão encerrada. Reabra a revisão para corrigir")
    }
}

function isClosedByFinancialPeriod(date: Date, closingDateIso?: string | null) {
    if (!closingDateIso) return false
    return new Date(date) <= new Date(closingDateIso)
}

function ensureFinancialPeriodEditable(date: Date, closingDateIso?: string | null) {
    if (isClosedByFinancialPeriod(date, closingDateIso)) {
        throw new Error("Período financeiro fechado")
    }
}

async function getActiveSession(db: DbClient, contaBancariaId: number) {
    return db.conferencia_sessoes.findFirst({
        where: {
            conta_bancaria_id: contaBancariaId,
            status: { in: [ConferenciaStatus.OPEN, ConferenciaStatus.REOPENED] },
        },
        orderBy: {
            criada_em: "desc",
        },
    })
}

async function getLatestClosedSession(db: DbClient, contaBancariaId: number) {
    return db.conferencia_sessoes.findFirst({
        where: {
            conta_bancaria_id: contaBancariaId,
            status: ConferenciaStatus.LOCKED,
        },
        orderBy: {
            concluida_em: "desc",
        },
    })
}

async function buildConferenceSessionSummary(db: DbClient, sessionId: number) {
    const session = await db.conferencia_sessoes.findUnique({
        where: { id: sessionId },
        include: {
            contas_bancarias: {
                select: { id: true, nome: true },
            },
        },
    })

    if (!session || !session.conta_bancaria_id) {
        throw new Error("Sessão de conferência não encontrada")
    }

    const snapshotWhere = { conferencia_sessao_id: session.id }
    const accountBacklogWhere = getAccountBacklogWhere(session.conta_bancaria_id)

    const [
        snapshotTotal,
        reviewedCount,
        pendingIssueCount,
        notReviewedCount,
        accountBacklogTotal,
        newPendingAfterOpenCount,
        reconciledRows,
    ] = await Promise.all([
        db.lancamento.count({ where: snapshotWhere }),
        db.lancamento.count({
            where: {
                ...snapshotWhere,
                status_conferencia: StatusConferencia.CONFERIDO,
            },
        }),
        db.lancamento.count({
            where: {
                ...snapshotWhere,
                status_conferencia: StatusConferencia.PENDENCIA,
            },
        }),
        db.lancamento.count({
            where: {
                ...snapshotWhere,
                status_conferencia: StatusConferencia.PENDENTE,
            },
        }),
        db.lancamento.count({
            where: accountBacklogWhere,
        }),
        db.lancamento.count({
            where: {
                ...accountBacklogWhere,
                created_at: { gt: session.criada_em },
                OR: [
                    { conferencia_sessao_id: null },
                    { conferencia_sessao_id: { not: session.id } },
                ],
            },
        }),
        db.lancamento.findMany({
            where: {
                ...snapshotWhere,
                status_conferencia: StatusConferencia.CONFERIDO,
            },
            select: {
                tipo: true,
                valor: true,
            },
        }),
    ])

    const totalConferido = reconciledRows.reduce((sum, row) => sum + getSignedAmount(row.tipo, row.valor), 0)

    await db.conferencia_sessoes.update({
        where: { id: session.id },
        data: {
            qtd_conferidas: reviewedCount,
            qtd_pendencias: pendingIssueCount,
            total_conferido: totalConferido,
        },
    })

    return {
        id: session.id,
        conta_bancaria_id: session.conta_bancaria_id,
        conta_bancaria_nome: session.contas_bancarias?.nome ?? null,
        criada_em: session.criada_em.toISOString(),
        concluida_em: session.concluida_em ? session.concluida_em.toISOString() : null,
        periodo_inicio: session.periodo_inicio.toISOString(),
        periodo_fim: session.periodo_fim.toISOString(),
        status: session.status,
        qtd_conferidas: reviewedCount,
        qtd_pendencias: pendingIssueCount,
        total_lancamentos: snapshotTotal,
        remainingCount: notReviewedCount,
        snapshot_total: snapshotTotal,
        reviewed_count: reviewedCount,
        pending_issue_count: pendingIssueCount,
        not_reviewed_count: notReviewedCount,
        new_pending_after_open_count: newPendingAfterOpenCount,
        account_backlog_total: accountBacklogTotal,
        total_conferido: totalConferido,
        nota: session.nota ?? null,
        reopen_reason: session.reopen_reason ?? null,
    }
}

export async function updateManualTransaction(id: number, input: UpdateManualTransactionInput, userId?: number) {
    await validateTransaction(input)

    const lancamento = await getTransactionForMutation(id)
    const settings = await getCashFlowSettings()
    ensureManualTransaction(lancamento)

    ensureSessionEditable(lancamento.conferencia_sessoes)
    ensureFinancialPeriodEditable(lancamento.data_competencia, settings.closing_date)

    if (lancamento.status_conferencia === StatusConferencia.CONFERIDO) {
        throw new Error("Lançamento conciliado. Faça ajuste ou estorno")
    }

    return prisma.$transaction(async (tx) => {
        const oldSignedAmount = getSignedAmount(lancamento.tipo, lancamento.valor)
        const newSignedAmount = getSignedAmount(input.tipo, input.valor)

        await applyAccountDelta(tx, lancamento.conta_bancaria_id, -oldSignedAmount)
        await applyAccountDelta(tx, input.conta_bancaria_id, newSignedAmount)

        const dataCompetencia = input.data_competencia || input.data_lancamento
        ensureFinancialPeriodEditable(dataCompetencia, settings.closing_date)

        const updated = await tx.lancamento.update({
            where: { id: lancamento.id },
            data: {
                descricao: input.descricao,
                valor: input.valor,
                tipo: input.tipo,
                data_lancamento: input.data_lancamento,
                data_competencia: dataCompetencia,
                conta_bancaria_id: input.conta_bancaria_id,
                categoria_id: input.categoria_id,
                centro_custo_id: input.centro_custo_id ?? null,
                observacoes: input.observacoes ?? null,
                version: { increment: 1 },
            },
        })

        if (userId) {
            await tx.auditLog.create({
                data: {
                    action: "TRANSACTION_UPDATED",
                    entity: "lancamento",
                    entity_id: updated.id,
                    user_id: userId,
                    detail: {
                        before: {
                            descricao: lancamento.descricao,
                            valor: Number(lancamento.valor),
                            tipo: lancamento.tipo,
                            data_lancamento: lancamento.data_lancamento.toISOString(),
                            data_competencia: lancamento.data_competencia.toISOString(),
                        },
                        after: {
                            descricao: updated.descricao,
                            valor: Number(updated.valor),
                            tipo: updated.tipo,
                            data_lancamento: updated.data_lancamento.toISOString(),
                            data_competencia: updated.data_competencia.toISOString(),
                        },
                    },
                },
            })
        }

        return updated
    })
}

export async function adjustManualTransaction(
    id: number,
    input: AdjustManualTransactionInput,
    userId?: number
) {
    await validateTransaction(input)

    const lancamento = await getTransactionForMutation(id)
    const settings = await getCashFlowSettings()
    ensureManualTransaction(lancamento)
    ensureSessionEditable(lancamento.conferencia_sessoes)
    ensureFinancialPeriodEditable(lancamento.data_competencia, settings.closing_date)

    if (lancamento.status_conferencia !== StatusConferencia.CONFERIDO) {
        throw new Error("Use edição direta enquanto o lançamento ainda não estiver conciliado")
    }

    return prisma.$transaction(async (tx) => {
        const reversalDescription = `Estorno do lançamento #${lancamento.id}: ${lancamento.descricao}`
        const dataCompetencia = input.data_competencia || input.data_lancamento
        ensureFinancialPeriodEditable(dataCompetencia, settings.closing_date)
        const sessionId = lancamento.conferencia_sessao_id

        await tx.lancamento.create({
            data: {
                tipo: getOppositeTipo(lancamento.tipo),
                descricao: reversalDescription.slice(0, 255),
                valor: lancamento.valor,
                data_lancamento: lancamento.data_lancamento,
                data_competencia: lancamento.data_competencia,
                observacoes: input.reason
                    ? `Estorno de ajuste do lançamento #${lancamento.id}. Motivo: ${input.reason}`
                    : `Estorno de ajuste do lançamento #${lancamento.id}.`,
                conta_bancaria_id: lancamento.conta_bancaria_id,
                categoria_id: lancamento.categoria_id,
                centro_custo_id: lancamento.centro_custo_id,
                created_by: userId,
                status_conferencia: StatusConferencia.PENDENTE,
                conferencia_sessao_id: sessionId,
            },
        })

        const replacement = await tx.lancamento.create({
            data: {
                tipo: input.tipo,
                descricao: input.descricao,
                valor: input.valor,
                data_lancamento: input.data_lancamento,
                data_competencia: dataCompetencia,
                observacoes: input.observacoes ?? null,
                conta_bancaria_id: input.conta_bancaria_id,
                categoria_id: input.categoria_id,
                centro_custo_id: input.centro_custo_id ?? null,
                created_by: userId,
                status_conferencia: StatusConferencia.PENDENTE,
                conferencia_sessao_id: sessionId,
            },
        })

        await applyAccountDelta(tx, lancamento.conta_bancaria_id, -getSignedAmount(lancamento.tipo, lancamento.valor))
        await applyAccountDelta(tx, input.conta_bancaria_id, getSignedAmount(input.tipo, input.valor))

        if (sessionId) {
            await buildConferenceSessionSummary(tx, sessionId)
        }

        if (userId) {
            await tx.auditLog.create({
                data: {
                    action: "TRANSACTION_ADJUSTED",
                    entity: "lancamento",
                    entity_id: replacement.id,
                    user_id: userId,
                    detail: {
                        original_id: lancamento.id,
                        replacement_id: replacement.id,
                        reason: input.reason ?? null,
                    },
                },
            })
        }

        return replacement
    })
}

export async function reverseManualTransaction(
    id: number,
    input: ReverseManualTransactionInput,
    userId?: number
) {
    const lancamento = await getTransactionForMutation(id)
    const settings = await getCashFlowSettings()
    ensureManualTransaction(lancamento)
    ensureSessionEditable(lancamento.conferencia_sessoes)
    ensureFinancialPeriodEditable(lancamento.data_competencia, settings.closing_date)

    if (lancamento.status_conferencia !== StatusConferencia.CONFERIDO) {
        throw new Error("Use exclusão operacional apenas em lançamentos já conciliados")
    }

    const sessionId = lancamento.conferencia_sessao_id

    return prisma.$transaction(async (tx) => {
        const reversal = await tx.lancamento.create({
            data: {
                tipo: getOppositeTipo(lancamento.tipo),
                descricao: `Estorno do lançamento #${lancamento.id}: ${lancamento.descricao}`.slice(0, 255),
                valor: lancamento.valor,
                data_lancamento: lancamento.data_lancamento,
                data_competencia: lancamento.data_competencia,
                observacoes: input.reason
                    ? `Estorno manual do lançamento #${lancamento.id}. Motivo: ${input.reason}`
                    : `Estorno manual do lançamento #${lancamento.id}.`,
                conta_bancaria_id: lancamento.conta_bancaria_id,
                categoria_id: lancamento.categoria_id,
                centro_custo_id: lancamento.centro_custo_id,
                created_by: userId,
                status_conferencia: StatusConferencia.PENDENTE,
                conferencia_sessao_id: sessionId,
            },
        })

        await applyAccountDelta(tx, lancamento.conta_bancaria_id, -getSignedAmount(lancamento.tipo, lancamento.valor))

        if (sessionId) {
            await buildConferenceSessionSummary(tx, sessionId)
        }

        if (userId) {
            await tx.auditLog.create({
                data: {
                    action: "TRANSACTION_REVERSED",
                    entity: "lancamento",
                    entity_id: reversal.id,
                    user_id: userId,
                    detail: {
                        original_id: lancamento.id,
                        reversal_id: reversal.id,
                        reason: input.reason ?? null,
                    },
                },
            })
        }

        return reversal
    })
}

export async function getConferenceAccountContext(contaBancariaId: number) {
    const bank = await prisma.contasBancaria.findUnique({
        where: { id: contaBancariaId },
        select: { id: true, nome: true, saldo_atual: true },
    })

    if (!bank) {
        throw new Error("Conta bancária não encontrada")
    }

    const [activeSession, latestClosedSession, accountBacklogTotal] = await Promise.all([
        getActiveSession(prisma, contaBancariaId),
        getLatestClosedSession(prisma, contaBancariaId),
        prisma.lancamento.count({
            where: getAccountBacklogWhere(contaBancariaId),
        }),
    ])

    return {
        conta_bancaria_id: bank.id,
        conta_bancaria_nome: bank.nome,
        saldo_atual: Number(bank.saldo_atual),
        account_backlog_total: accountBacklogTotal,
        active_session: activeSession ? await buildConferenceSessionSummary(prisma, activeSession.id) : null,
        latest_closed_session: latestClosedSession ? await buildConferenceSessionSummary(prisma, latestClosedSession.id) : null,
    }
}

export async function listConferenceSessionHistory(contaBancariaId: number) {
    const sessions = await prisma.conferencia_sessoes.findMany({
        where: { conta_bancaria_id: contaBancariaId },
        orderBy: { criada_em: "desc" },
        take: 12,
        select: { id: true },
    })

    return Promise.all(sessions.map((session) => buildConferenceSessionSummary(prisma, session.id)))
}

export async function openConferenceSession(
    input: ConferenceSessionCreateInput,
    userId: number
) {
    const parsed = conferenceSessionCreateSchema.parse(input)

    // Check for an existing active session first — outside the transaction to
    // avoid holding a lock while we query potentially thousands of rows.
    const existingSession = await getActiveSession(prisma, parsed.conta_bancaria_id)
    if (existingSession) {
        return buildConferenceSessionSummary(prisma, existingSession.id)
    }

    const candidates = await prisma.lancamento.findMany({
        where: {
            conta_bancaria_id: parsed.conta_bancaria_id,
            status_conferencia: { not: StatusConferencia.CONFERIDO },
            OR: [
                { conferencia_sessao_id: null },
                { conferencia_sessoes: { status: ConferenciaStatus.LOCKED } },
            ],
        },
        select: {
            id: true,
            data_lancamento: true,
        },
    })

    if (candidates.length === 0) {
        throw new Error("Nenhum lançamento pendente nesta conta")
    }

    const sortedDates = candidates
        .map((item) => item.data_lancamento)
        .sort((left, right) => left.getTime() - right.getTime())

    // The actual write transaction is now minimal: create session + bulk-update.
    // buildConferenceSessionSummary runs *after* the transaction commits so it
    // never contributes to the interactive-transaction timer.
    const session = await prisma.$transaction(
        async (tx) => {
            const created = await tx.conferencia_sessoes.create({
                data: {
                    conta_bancaria_id: parsed.conta_bancaria_id,
                    periodo_inicio: sortedDates[0] ?? new Date(),
                    periodo_fim: sortedDates[sortedDates.length - 1] ?? new Date(),
                    criada_por: userId,
                    nota: parsed.nota ?? null,
                },
            })

            await tx.lancamento.updateMany({
                where: {
                    id: { in: candidates.map((item) => item.id) },
                },
                data: {
                    conferencia_sessao_id: created.id,
                },
            })

            return created
        },
        { timeout: 15000 }
    )

    return buildConferenceSessionSummary(prisma, session.id)
}

export async function closeConferenceSession(
    sessionId: number,
    userId: number,
    input: CloseConferenceSessionInput = {}
) {
    const parsed = closeConferenceSessionSchema.parse(input)

    const session = await prisma.conferencia_sessoes.findUnique({
        where: { id: sessionId },
    })

    if (!session) {
        throw new Error("Sessão de conferência não encontrada")
    }

    if (session.status === ConferenciaStatus.LOCKED) {
        throw new Error("Essa revisão já está encerrada")
    }

    await prisma.$transaction(
        async (tx) => {
            const updatedSession = await tx.conferencia_sessoes.update({
                where: { id: sessionId },
                data: {
                    status: ConferenciaStatus.LOCKED,
                    concluida_por: userId,
                    concluida_em: new Date(),
                    nota: parsed.nota ?? session.nota ?? null,
                },
            })

            await tx.auditLog.create({
                data: {
                    action: "CONFERENCE_SESSION_CLOSED",
                    entity: "conferencia_sessoes",
                    entity_id: sessionId,
                    user_id: userId,
                    detail: {
                        conta_bancaria_id: updatedSession.conta_bancaria_id,
                        nota: updatedSession.nota ?? null,
                    },
                },
            })
        },
        { timeout: 10000 }
    )

    return buildConferenceSessionSummary(prisma, sessionId)
}

export async function reopenConferenceSession(
    sessionId: number,
    input: ConferenceSessionReopenInput,
    userId: number
) {
    const parsed = conferenceSessionReopenSchema.parse(input)

    const session = await prisma.conferencia_sessoes.findUnique({
        where: { id: sessionId },
    })

    if (!session) {
        throw new Error("Sessão de conferência não encontrada")
    }

    await prisma.$transaction(
        async (tx) => {
            const updatedSession = await tx.conferencia_sessoes.update({
                where: { id: sessionId },
                data: {
                    status: ConferenciaStatus.REOPENED,
                    reopened_by: userId,
                    reopened_at: new Date(),
                    reopen_reason: parsed.reason,
                },
            })

            await tx.auditLog.create({
                data: {
                    action: "CONFERENCE_SESSION_REOPENED",
                    entity: "conferencia_sessoes",
                    entity_id: sessionId,
                    user_id: userId,
                    detail: {
                        conta_bancaria_id: updatedSession.conta_bancaria_id,
                        reason: parsed.reason,
                    },
                },
            })
        },
        { timeout: 10000 }
    )

    return buildConferenceSessionSummary(prisma, sessionId)
}

export async function updateTransactionConferenceStatus(
    id: number,
    input: ConferenceStatusInput,
    userId: number
) {
    const parsed = conferenceStatusSchema.parse(input)

    const lancamento = await prisma.lancamento.findUnique({
        where: { id },
        include: {
            conferencia_sessoes: true,
        },
    })

    if (!lancamento) {
        throw new Error("Lançamento não encontrado")
    }

    if (!lancamento.conferencia_sessao_id) {
        throw new Error("Inicie a conferência antes de classificar o lançamento")
    }

    const sessionId = lancamento.conferencia_sessao_id

    ensureSessionEditable(lancamento.conferencia_sessoes)

    if (parsed.status === "PENDENCIA" && !parsed.pendencia_motivo?.trim()) {
        throw new Error("Informe o motivo da pendência")
    }

    await prisma.$transaction(
        async (tx) => {
            await tx.lancamento.update({
                where: { id },
                data: {
                    status_conferencia: parsed.status,
                    pendencia_motivo: parsed.status === "PENDENCIA" ? parsed.pendencia_motivo?.trim() ?? null : null,
                    conferido_em: parsed.status === "CONFERIDO" ? new Date() : null,
                    conferido_por: parsed.status === "CONFERIDO" ? userId : null,
                    version: { increment: 1 },
                },
            })
        },
        { timeout: 10000 }
    )

    return buildConferenceSessionSummary(prisma, sessionId)
}

export async function bulkConfirmTransactions(ids: number[], userId: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("ids must be a non-empty array")
    }

    const lancamentos = await prisma.lancamento.findMany({
        where: { id: { in: ids } },
        include: {
            conferencia_sessoes: true,
        },
    })

    if (lancamentos.length === 0) {
        throw new Error("Nenhum lançamento encontrado")
    }

    const locked = lancamentos.find((item) => item.conferencia_sessoes?.status === ConferenciaStatus.LOCKED)
    if (locked) {
        throw new Error("Revisão encerrada. Reabra a revisão para corrigir")
    }

    const result = await prisma.$transaction(
        async (tx) => {
            return tx.lancamento.updateMany({
                where: { id: { in: ids } },
                data: {
                    status_conferencia: StatusConferencia.CONFERIDO,
                    conferido_em: new Date(),
                    conferido_por: userId,
                    pendencia_motivo: null,
                    version: { increment: 1 },
                },
            })
        },
        { timeout: 15000 }
    )

    // Run session summaries outside the transaction to avoid timeout pressure.
    const sessionIds = Array.from(
        new Set(lancamentos.map((item) => item.conferencia_sessao_id).filter(Boolean))
    ) as number[]
    for (const sessionId of sessionIds) {
        await buildConferenceSessionSummary(prisma, sessionId)
    }

    return result
}



