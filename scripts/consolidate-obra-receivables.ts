import { Prisma, PrismaClient, StatusFinanceiro } from "@prisma/client"

import {
  buildObraReceivableObservation,
  buildPlan,
  getReceivableCategoryId,
} from "@/actions/financeiro/receivables/sync-obra-receivables"

const prisma = new PrismaClient()
const DEFAULT_FROM = new Date(2026, 4, 4)
const DEFAULT_TO = new Date(2026, 4, 18)
const OPEN_STATUSES: StatusFinanceiro[] = [StatusFinanceiro.PENDENTE, StatusFinanceiro.ATRASADO]

type ObraWithReceivables = Awaited<ReturnType<typeof getAffectedObras>>[number]
type ReceivableRow = ObraWithReceivables["contas_receber"][number]

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function getArgValue(flag: string) {
  const index = process.argv.findIndex((arg) => arg === flag)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value && !value.startsWith("--") ? value : undefined
}

function parseDateArg(flag: string, fallback: Date) {
  const value = getArgValue(flag)
  if (!value) return fallback

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`${flag} deve usar o formato YYYY-MM-DD.`)

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function parseUserId() {
  const value = Number(getArgValue("--user-id"))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function parseObraIds() {
  const value = getArgValue("--obra-id")
  if (!value) return []

  const ids = value
    .split(",")
    .map((item) => item.trim())
    .map((item) => Number(item))

  if (ids.some((id) => !Number.isFinite(id) || id <= 0)) {
    throw new Error("--obra-id deve conter um ou mais IDs positivos separados por virgula.")
  }

  return ids
}

function getClientSearch() {
  return getArgValue("--client")?.trim() || null
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function startOfDate(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function getDateWindow() {
  const from = parseDateArg("--from", DEFAULT_FROM)
  const to = parseDateArg("--to", DEFAULT_TO)

  if (from >= to) {
    throw new Error("--from deve ser anterior a --to.")
  }

  return { from, to }
}

function isOpenWithoutMovement(row: ReceivableRow) {
  return (
    OPEN_STATUSES.includes(row.status) &&
    toNumber(row.valor_recebido) === 0 &&
    row.lancamentos.length === 0
  )
}

function hasPartialOpenBalance(row: ReceivableRow) {
  const total = toNumber(row.valor_total)
  const received = toNumber(row.valor_recebido)

  return row.status === StatusFinanceiro.PARCIAL || (received > 0 && received < total)
}

function getConsolidatedPlan(obra: ObraWithReceivables, valor: number) {
  const [quitacao] = buildPlan({
    pagamento_entrada: null,
    forma_pagamento_entrada: null,
    pagamento_quitacao: new Prisma.Decimal(valor),
    forma_pagamento_quitacao: obra.forma_pagamento_quitacao,
    data_contrato: obra.data_contrato,
    data_criacao: obra.data_criacao,
  }).filter((item) => item.origem === "QUITACAO")

  if (!quitacao) throw new Error(`Obra #${obra.id} sem plano de quitacao consolidada.`)
  return quitacao
}

async function getAffectedObras() {
  const { from, to } = getDateWindow()
  const clientSearch = getClientSearch()
  const obraIds = parseObraIds()
  const where: Prisma.obrasWhereInput = {
    OR: [
      { data_criacao: { gte: from, lt: to } },
      {
        contas_receber: {
          some: {
            auto_gerado: true,
            origem_obra_tipo: "QUITACAO",
            total_parcelas: { gt: 1 },
            OR: [
              { created_at: { gte: from, lt: to } },
              { updated_at: { gte: from, lt: to } },
            ],
          },
        },
      },
    ],
    contas_receber: {
      some: {
        auto_gerado: true,
        origem_obra_tipo: "QUITACAO",
        total_parcelas: { gt: 1 },
      },
    },
  }

  if (clientSearch) {
    where.cliente = { nome: { contains: clientSearch, mode: "insensitive" } }
  }

  if (obraIds.length > 0) {
    where.id = { in: obraIds }
  }

  return prisma.obras.findMany({
    where,
    orderBy: [{ data_criacao: "asc" }, { id: "asc" }],
    select: {
      id: true,
      titulo: true,
      cliente_id: true,
      orcamento_id: true,
      pagamento_quitacao: true,
      forma_pagamento_quitacao: true,
      data_contrato: true,
      data_criacao: true,
      centro_custo: {
        where: { ativo: true },
        orderBy: { id: "asc" },
        select: { id: true },
      },
      contas_receber: {
        where: {
          auto_gerado: true,
          origem_obra_tipo: "QUITACAO",
        },
        orderBy: [{ total_parcelas: "desc" }, { parcela_atual: "asc" }, { id: "asc" }],
        select: {
          id: true,
          descricao: true,
          origem_obra_tipo: true,
          valor_total: true,
          valor_recebido: true,
          status: true,
          parcela_atual: true,
          total_parcelas: true,
          data_vencimento: true,
          lancamentos: {
            select: { id: true },
          },
        },
      },
    },
  })
}

async function consolidateObra(obra: ObraWithReceivables, apply: boolean, userId?: number) {
  const oldInstallments = obra.contas_receber.filter((row) => row.total_parcelas > 1)
  const partialRows = oldInstallments.filter(hasPartialOpenBalance)

  if (partialRows.length > 0) {
    return {
      obraId: obra.id,
      titulo: obra.titulo,
      status: "skipped_partial",
      reason: "Conta parcelada com baixa parcial precisa de revisao manual.",
      partialIds: partialRows.map((row) => row.id),
    }
  }

  const eligibleRows = oldInstallments.filter(isOpenWithoutMovement)
  const preservedRows = oldInstallments.filter((row) => !eligibleRows.includes(row))

  if (eligibleRows.length === 0) {
    return {
      obraId: obra.id,
      titulo: obra.titulo,
      status: "skipped_no_open_balance",
      reason: "Nao ha parcelas abertas e sem movimentacao para consolidar.",
      preservedIds: preservedRows.map((row) => row.id),
    }
  }

  const openTotal = eligibleRows.reduce((sum, row) => sum + toNumber(row.valor_total), 0)
  const fullTotal = toNumber(obra.pagamento_quitacao) || oldInstallments.reduce((sum, row) => sum + toNumber(row.valor_total), 0)
  const consolidatedValue = preservedRows.length === 0 ? fullTotal : openTotal
  const consolidatedPlan = getConsolidatedPlan(obra, consolidatedValue)
  const existingConsolidated = obra.contas_receber.find((row) =>
    row.origem_obra_tipo === "QUITACAO" &&
    row.parcela_atual === 1 &&
    row.total_parcelas === 1
  )
  const descricao = `Quitação - ${obra.titulo || `Obra #${obra.id}`}`
  const observacoes = preservedRows.length > 0
    ? `${buildObraReceivableObservation(obra.forma_pagamento_quitacao) ?? "Conta consolidada automaticamente pela obra."} Saldo aberto consolidado apos preservar parcelas ja baixadas/vinculadas.`
    : consolidatedPlan.observacoes

  if (existingConsolidated && !isOpenWithoutMovement(existingConsolidated)) {
    return {
      obraId: obra.id,
      titulo: obra.titulo,
      status: "skipped_existing_consolidated_locked",
      reason: "Conta consolidada existente ja possui baixa, lancamento ou status bloqueado.",
      consolidatedId: existingConsolidated.id,
    }
  }

  const report = {
    obraId: obra.id,
    titulo: obra.titulo,
    status: apply ? "applied" : "dry_run",
    mode: preservedRows.length > 0 ? "remaining_balance" : "full_balance",
    formaPagamento: obra.forma_pagamento_quitacao,
    consolidatedValue,
    dueDate: consolidatedPlan.vencimento.toISOString().slice(0, 10),
    cancelledIds: eligibleRows.map((row) => row.id),
    preservedIds: preservedRows.map((row) => row.id),
    consolidatedId: existingConsolidated?.id ?? null,
    action: existingConsolidated ? "update_consolidated" : "create_consolidated",
  }

  if (!apply) return report

  await prisma.$transaction(async (tx) => {
    const categoriaId = await getReceivableCategoryId(tx)
    const centroCustoId = obra.centro_custo[0]?.id ?? null
    const data = {
      descricao,
      valor_total: consolidatedValue,
      valor_recebido: 0,
      data_emissao: startOfDate(new Date()),
      data_vencimento: consolidatedPlan.vencimento,
      status: StatusFinanceiro.PENDENTE,
      cliente_id: obra.cliente_id,
      orcamento_id: obra.orcamento_id,
      obra_id: obra.id,
      origem_obra_tipo: "QUITACAO",
      auto_gerado: true,
      forma_pagamento_origem: obra.forma_pagamento_quitacao,
      observacoes,
      categoria_id: categoriaId,
      centro_custo_id: centroCustoId,
      parcela_atual: 1,
      total_parcelas: 1,
      updated_by: userId,
    }

    if (existingConsolidated) {
      await tx.contaReceber.update({
        where: { id: existingConsolidated.id },
        data,
      })
    } else {
      await tx.contaReceber.create({
        data: {
          ...data,
          created_by: userId,
        },
      })
    }

    await tx.contaReceber.updateMany({
      where: { id: { in: eligibleRows.map((row) => row.id) } },
      data: {
        status: StatusFinanceiro.CANCELADO,
        updated_by: userId,
      },
    })
  })

  return report
}

async function main() {
  const apply = hasFlag("--apply")
  const userId = parseUserId()
  const { from, to } = getDateWindow()
  const client = getClientSearch()
  const obraIds = parseObraIds()
  const obras = await getAffectedObras()
  const results = []

  for (const obra of obras) {
    results.push(await consolidateObra(obra, apply, userId))
  }

  console.log(JSON.stringify({
    apply,
    filters: {
      client,
      obraIds,
    },
    window: {
      from: from.toISOString().slice(0, 10),
      toExclusive: to.toISOString().slice(0, 10),
    },
    totalObras: obras.length,
    results,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error("[X] Falha ao consolidar contas a receber de obras:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
