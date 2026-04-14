import { PrismaClient } from "@prisma/client"

import { getBankBalanceSnapshots, rebuildBankCurrentBalances } from "@/actions/financeiro/banks/balance-tools"

const prisma = new PrismaClient()

const IMPORT_NAMESPACE = "financial-history-2026"
const IMPORT_MARKER = `[IMPORT ${IMPORT_NAMESPACE}]`
const IMPORT_MARKER_VARIANTS = [
  "Importado do hist\u00F3rico financeiro 2026.",
  "Importado do hist\u00C3\u00B3rico financeiro 2026.",
  "Importado do hist\u00C3\u0192\u00C2\u00B3rico financeiro 2026.",
  IMPORT_MARKER,
]

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function buildObservationMarkerWhere() {
  return {
    OR: IMPORT_MARKER_VARIANTS.map((marker) => ({
      observacoes: {
        contains: marker,
      },
    })),
  }
}

function buildCostCenterMarkerWhere() {
  return {
    OR: [
      {
        descricao: {
          startsWith: "Criado automaticamente a partir do hist",
        },
      },
      {
        descricao: {
          contains: IMPORT_MARKER,
        },
      },
    ],
  }
}

function parseOpeningBankId(result: string | null) {
  if (!result) {
    return null
  }

  try {
    const parsed = JSON.parse(result) as { bankId?: unknown }
    const bankId = Number(parsed.bankId)
    return Number.isInteger(bankId) && bankId > 0 ? bankId : null
  } catch {
    return null
  }
}

function parseCreatedEntityIds(result: string | null) {
  if (!result) {
    return {
      clientId: null,
      workId: null,
      costCenterId: null,
    }
  }

  try {
    const parsed = JSON.parse(result) as {
      createdClientId?: unknown
      createdWorkId?: unknown
      createdCostCenterId?: unknown
    }

    const toInt = (value: unknown) => {
      const numeric = Number(value)
      return Number.isInteger(numeric) && numeric > 0 ? numeric : null
    }

    return {
      clientId: toInt(parsed.createdClientId),
      workId: toInt(parsed.createdWorkId),
      costCenterId: toInt(parsed.createdCostCenterId),
    }
  } catch {
    return {
      clientId: null,
      workId: null,
      costCenterId: null,
    }
  }
}

async function buildCleanupPlan() {
  const [logs, payables, receivables, lancamentos, markerCostCenters] = await Promise.all([
    prisma.idempotencyLog.findMany({
      where: {
        key: {
          startsWith: IMPORT_NAMESPACE,
        },
      },
      select: {
        key: true,
        result: true,
        status: true,
      },
      orderBy: {
        key: "asc",
      },
    }),
    prisma.contaPagar.findMany({
      where: buildObservationMarkerWhere(),
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.contaReceber.findMany({
      where: buildObservationMarkerWhere(),
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.lancamento.findMany({
      where: buildObservationMarkerWhere(),
      select: {
        id: true,
        conta_bancaria_id: true,
        transferencia_id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.centroCusto.findMany({
      where: buildCostCenterMarkerWhere(),
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
  ])

  const bankIds = new Set<number>()
  const transferIds = new Set<number>()
  const createdClientIds = new Set<number>()
  const createdWorkIds = new Set<number>()
  const createdCostCenterIds = new Set<number>(markerCostCenters.map((item) => item.id))

  for (const log of logs) {
    if (log.key.includes(":opening:")) {
      const bankId = parseOpeningBankId(log.result ?? null)
      if (bankId) {
        bankIds.add(bankId)
      }
    }

    const createdIds = parseCreatedEntityIds(log.result ?? null)
    if (createdIds.clientId) {
      createdClientIds.add(createdIds.clientId)
    }
    if (createdIds.workId) {
      createdWorkIds.add(createdIds.workId)
    }
    if (createdIds.costCenterId) {
      createdCostCenterIds.add(createdIds.costCenterId)
    }
  }

  for (const lancamento of lancamentos) {
    if (lancamento.conta_bancaria_id) {
      bankIds.add(lancamento.conta_bancaria_id)
    }

    if (lancamento.transferencia_id) {
      transferIds.add(lancamento.transferencia_id)
    }
  }

  const affectedBankIds = Array.from(bankIds).sort((left, right) => left - right)

  return {
    logKeys: logs.map((log) => log.key),
    payableIds: payables.map((payable) => payable.id),
    receivableIds: receivables.map((receivable) => receivable.id),
    lancamentoIds: lancamentos.map((lancamento) => lancamento.id),
    transferIds: Array.from(transferIds).sort((left, right) => left - right),
    candidateCostCenterIds: Array.from(createdCostCenterIds).sort((left, right) => left - right),
    candidateWorkIds: Array.from(createdWorkIds).sort((left, right) => left - right),
    candidateClientIds: Array.from(createdClientIds).sort((left, right) => left - right),
    affectedBankIds,
    bankBalanceDiagnosticsBefore:
      affectedBankIds.length > 0
        ? await getBankBalanceSnapshots(prisma, affectedBankIds)
        : [],
  }
}

async function applyCleanup(plan: Awaited<ReturnType<typeof buildCleanupPlan>>) {
  await prisma.$transaction(async (tx) => {
    if (plan.lancamentoIds.length > 0) {
      await tx.lancamento.deleteMany({
        where: {
          id: {
            in: plan.lancamentoIds,
          },
        },
      })
    }

    if (plan.transferIds.length > 0) {
      await tx.transferencia.deleteMany({
        where: {
          id: {
            in: plan.transferIds,
          },
        },
      })
    }

    if (plan.payableIds.length > 0) {
      await tx.contaPagar.deleteMany({
        where: {
          id: {
            in: plan.payableIds,
          },
        },
      })
    }

    if (plan.receivableIds.length > 0) {
      await tx.contaReceber.deleteMany({
        where: {
          id: {
            in: plan.receivableIds,
          },
        },
      })
    }

    if (plan.logKeys.length > 0) {
      await tx.idempotencyLog.deleteMany({
        where: {
          key: {
            in: plan.logKeys,
          },
        },
      })
    }
  })

  if (plan.candidateCostCenterIds.length > 0) {
    const safeCostCenters = await prisma.centroCusto.findMany({
      where: {
        id: {
          in: plan.candidateCostCenterIds,
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            lancamentos: true,
            contas_pagar: true,
            contas_receber: true,
          },
        },
      },
    })

    const removableIds = safeCostCenters
      .filter((item) =>
        item._count.lancamentos === 0 &&
        item._count.contas_pagar === 0 &&
        item._count.contas_receber === 0,
      )
      .map((item) => item.id)

    if (removableIds.length > 0) {
      await prisma.centroCusto.deleteMany({
        where: {
          id: {
            in: removableIds,
          },
        },
      })
    }
  }

  if (plan.candidateWorkIds.length > 0) {
    const safeWorks = await prisma.obras.findMany({
      where: {
        id: {
          in: plan.candidateWorkIds,
        },
        observacoes: {
          contains: IMPORT_MARKER,
        },
      },
      select: {
        id: true,
        orcamento_id: true,
        ordem_servico: {
          select: {
            id: true,
          },
        },
        budget_snapshot: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            pedidos_compra: true,
            centro_custo: true,
            imagens: true,
            segmentos: true,
            documentos: true,
          },
        },
      },
    })

    const removableIds = safeWorks
      .filter((item) =>
        item.orcamento_id == null &&
        item.ordem_servico == null &&
        item.budget_snapshot == null &&
        item._count.pedidos_compra === 0 &&
        item._count.centro_custo === 0 &&
        item._count.imagens === 0 &&
        item._count.segmentos === 0 &&
        item._count.documentos === 0,
      )
      .map((item) => item.id)

    if (removableIds.length > 0) {
      await prisma.obras.deleteMany({
        where: {
          id: {
            in: removableIds,
          },
        },
      })
    }
  }

  if (plan.candidateClientIds.length > 0) {
    const safeClients = await prisma.cliente.findMany({
      where: {
        id: {
          in: plan.candidateClientIds,
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            obras: true,
            contas_receber: true,
            orcamento: true,
          },
        },
      },
    })

    const removableIds = safeClients
      .filter((item) =>
        item._count.obras === 0 &&
        item._count.contas_receber === 0 &&
        item._count.orcamento === 0,
      )
      .map((item) => item.id)

    if (removableIds.length > 0) {
      await prisma.cliente.deleteMany({
        where: {
          id: {
            in: removableIds,
          },
        },
      })
    }
  }

  return plan.affectedBankIds.length > 0
    ? rebuildBankCurrentBalances(prisma, plan.affectedBankIds)
    : []
}

async function main() {
  const apply = hasFlag("--apply")
  const plan = await buildCleanupPlan()

  const payload: Record<string, unknown> = {
    mode: apply ? "apply" : "dry-run",
    idempotencyLogs: plan.logKeys.length,
    contasPagar: plan.payableIds.length,
    contasReceber: plan.receivableIds.length,
    lancamentos: plan.lancamentoIds.length,
    transferencias: plan.transferIds.length,
    centrosCustoCandidatos: plan.candidateCostCenterIds.length,
    obrasCandidatas: plan.candidateWorkIds.length,
    clientesCandidatos: plan.candidateClientIds.length,
    contasAfetadas: plan.affectedBankIds.length,
    affectedBankIds: plan.affectedBankIds,
    bankBalanceDiagnosticsBefore: plan.bankBalanceDiagnosticsBefore,
  }

  if (apply) {
    payload.bankBalanceDiagnosticsAfter = await applyCleanup(plan)
  }

  console.log(JSON.stringify(payload, null, 2))
}

main()
  .catch((error) => {
    console.error("[X] Falha na limpeza da importacao 2026:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
