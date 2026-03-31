import { PrismaClient } from "@prisma/client"

import { getBankBalanceSnapshots, rebuildBankCurrentBalances } from "@/actions/financeiro/banks/balance-tools"

const prisma = new PrismaClient()

const IMPORT_NAMESPACE = "financial-history-2026"
const IMPORT_MARKER_VARIANTS = [
  "Importado do hist\u00F3rico financeiro 2026.",
  "Importado do hist\u00C3\u00B3rico financeiro 2026.",
  "Importado do hist\u00C3\u0192\u00C2\u00B3rico financeiro 2026.",
]

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function buildImportMarkerWhere() {
  return {
    OR: IMPORT_MARKER_VARIANTS.map((marker) => ({
      observacoes: {
        contains: marker,
      },
    })),
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

async function buildCleanupPlan() {
  const [logs, payables, receivables, lancamentos] = await Promise.all([
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
      where: buildImportMarkerWhere(),
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.contaReceber.findMany({
      where: buildImportMarkerWhere(),
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.lancamento.findMany({
      where: buildImportMarkerWhere(),
      select: {
        id: true,
        conta_bancaria_id: true,
        transferencia_id: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
  ])

  const bankIds = new Set<number>()
  const transferIds = new Set<number>()

  for (const log of logs) {
    if (!log.key.includes(":opening:")) {
      continue
    }

    const bankId = parseOpeningBankId(log.result ?? null)

    if (bankId) {
      bankIds.add(bankId)
    }
  }

  for (const lancamento of lancamentos) {
    bankIds.add(lancamento.conta_bancaria_id)

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
    console.error("[X] Falha na limpeza da importa\u00E7\u00E3o 2026:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
