import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const TEST_BANK_NAME_PATTERNS = [
  /^Banco Teste/i,
  /^Bank /i,
  /^List Test Bank$/i,
]

const TEST_CATEGORY_NAME_PATTERNS = [
  /\bteste\b/i,
  /\baction\b/i,
  /\bengine\b/i,
  /\blist\b/i,
  /^Cat Rec$/i,
  /^Cat Desp$/i,
]

const TEST_COST_CENTER_NAMES = new Set([
  "CC - Residencial Modelo - Orçado x Realizado",
])

const IMPORT_LOG_PREFIXES = [
  "financial-history-2026:",
  "import:financial-history-2026:",
]

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function matchesAnyPattern(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value))
}

async function buildCleanupPlan() {
  const [
    banks,
    categories,
    costCenters,
    payables,
    receivables,
    lancamentos,
    transfers,
    idempotencyLogs,
  ] = await Promise.all([
    prisma.contasBancaria.findMany({
      select: { id: true, nome: true },
      orderBy: { id: "asc" },
    }),
    prisma.categoria.findMany({
      select: { id: true, nome: true },
      orderBy: { id: "asc" },
    }),
    prisma.centroCusto.findMany({
      select: { id: true, nome: true },
      orderBy: { id: "asc" },
    }),
    prisma.contaPagar.findMany({
      select: {
        id: true,
        categoria: { select: { nome: true } },
        centro_custo: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.contaReceber.findMany({
      select: {
        id: true,
        categoria: { select: { nome: true } },
        centro_custo: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.lancamento.findMany({
      select: {
        id: true,
        conta_bancaria_id: true,
        conta_pagar_id: true,
        conta_receber_id: true,
        transferencia_id: true,
        categoria: { select: { nome: true } },
        centro_custo: { select: { nome: true } },
        conta_bancaria: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.transferencia.findMany({
      select: {
        id: true,
        conta_origem: { select: { nome: true } },
        conta_destino: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.idempotencyLog.findMany({
      select: { key: true, status: true },
      orderBy: { key: "asc" },
    }),
  ])

  const bankIds = banks
    .filter((bank) => matchesAnyPattern(bank.nome, TEST_BANK_NAME_PATTERNS))
    .map((bank) => bank.id)

  const categoryIds = categories
    .filter((category) => matchesAnyPattern(category.nome, TEST_CATEGORY_NAME_PATTERNS))
    .map((category) => category.id)

  const costCenterIds = costCenters
    .filter((costCenter) => TEST_COST_CENTER_NAMES.has(costCenter.nome))
    .map((costCenter) => costCenter.id)

  const payableIds = payables
    .filter((payable) => {
      const categoryName = payable.categoria?.nome ?? ""
      const costCenterName = payable.centro_custo?.nome ?? ""

      return (
        matchesAnyPattern(categoryName, TEST_CATEGORY_NAME_PATTERNS) ||
        TEST_COST_CENTER_NAMES.has(costCenterName)
      )
    })
    .map((payable) => payable.id)

  const receivableIds = receivables
    .filter((receivable) => {
      const categoryName = receivable.categoria?.nome ?? ""
      const costCenterName = receivable.centro_custo?.nome ?? ""

      return (
        matchesAnyPattern(categoryName, TEST_CATEGORY_NAME_PATTERNS) ||
        TEST_COST_CENTER_NAMES.has(costCenterName)
      )
    })
    .map((receivable) => receivable.id)

  const transferIds = transfers
    .filter((transfer) => {
      const origin = transfer.conta_origem.nome
      const destination = transfer.conta_destino.nome

      return (
        matchesAnyPattern(origin, TEST_BANK_NAME_PATTERNS) ||
        matchesAnyPattern(destination, TEST_BANK_NAME_PATTERNS)
      )
    })
    .map((transfer) => transfer.id)

  const lancamentoIds = lancamentos
    .filter((lancamento) => {
      const categoryName = lancamento.categoria?.nome ?? ""
      const costCenterName = lancamento.centro_custo?.nome ?? ""
      const bankName = lancamento.conta_bancaria?.nome ?? ""

      return (
        bankIds.includes(lancamento.conta_bancaria_id) ||
        (lancamento.conta_pagar_id != null && payableIds.includes(lancamento.conta_pagar_id)) ||
        (lancamento.conta_receber_id != null &&
          receivableIds.includes(lancamento.conta_receber_id)) ||
        (lancamento.transferencia_id != null &&
          transferIds.includes(lancamento.transferencia_id)) ||
        matchesAnyPattern(categoryName, TEST_CATEGORY_NAME_PATTERNS) ||
        TEST_COST_CENTER_NAMES.has(costCenterName) ||
        matchesAnyPattern(bankName, TEST_BANK_NAME_PATTERNS)
      )
    })
    .map((lancamento) => lancamento.id)

  const idempotencyKeys = idempotencyLogs
    .filter((entry) =>
      IMPORT_LOG_PREFIXES.some((prefix) => entry.key.startsWith(prefix)),
    )
    .map((entry) => entry.key)

  return {
    bankIds,
    categoryIds,
    costCenterIds,
    payableIds,
    receivableIds,
    lancamentoIds,
    transferIds,
    idempotencyKeys,
  }
}

async function applyCleanup(plan: Awaited<ReturnType<typeof buildCleanupPlan>>) {
  await prisma.$transaction(async (tx) => {
    if (plan.lancamentoIds.length > 0) {
      await tx.lancamento.deleteMany({ where: { id: { in: plan.lancamentoIds } } })
    }

    if (plan.transferIds.length > 0) {
      await tx.transferencia.deleteMany({ where: { id: { in: plan.transferIds } } })
    }

    if (plan.payableIds.length > 0) {
      await tx.contaPagar.deleteMany({ where: { id: { in: plan.payableIds } } })
    }

    if (plan.receivableIds.length > 0) {
      await tx.contaReceber.deleteMany({ where: { id: { in: plan.receivableIds } } })
    }

    if (plan.costCenterIds.length > 0) {
      await tx.centroCusto.deleteMany({ where: { id: { in: plan.costCenterIds } } })
    }

    if (plan.categoryIds.length > 0) {
      await tx.categoria.deleteMany({ where: { id: { in: plan.categoryIds } } })
    }

    if (plan.bankIds.length > 0) {
      await tx.contasBancaria.deleteMany({ where: { id: { in: plan.bankIds } } })
    }

    if (plan.idempotencyKeys.length > 0) {
      await tx.idempotencyLog.deleteMany({
        where: { key: { in: plan.idempotencyKeys } },
      })
    }
  })
}

async function main() {
  const apply = hasFlag("--apply")
  const plan = await buildCleanupPlan()

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        bancos: plan.bankIds.length,
        categorias: plan.categoryIds.length,
        centrosCusto: plan.costCenterIds.length,
        contasPagar: plan.payableIds.length,
        contasReceber: plan.receivableIds.length,
        lancamentos: plan.lancamentoIds.length,
        transferencias: plan.transferIds.length,
        idempotencyLogs: plan.idempotencyKeys.length,
        ids: plan,
      },
      null,
      2,
    ),
  )

  if (!apply) {
    return
  }

  await applyCleanup(plan)
  console.log("[OK] Cleanup aplicado.")
}

main()
  .catch((error) => {
    console.error("[X] Falha na limpeza:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
