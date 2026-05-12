import { Prisma, PrismaClient, StatusFinanceiro } from "@prisma/client"

import {
  buildObraReceivableObservation,
  buildPlan,
  getReceivableCategoryId,
} from "@/actions/financeiro/receivables/sync-obra-receivables"

const prisma = new PrismaClient()
const FROM = new Date(2026, 4, 4)
const TO = new Date(2026, 4, 18)
const OPEN_STATUSES: StatusFinanceiro[] = [StatusFinanceiro.PENDENTE, StatusFinanceiro.ATRASADO]

type ObraWithReceivables = Awaited<ReturnType<typeof getAffectedObras>>[number]
type ReceivableRow = ObraWithReceivables["contas_receber"][number]

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function parseUserId() {
  const index = process.argv.findIndex((arg) => arg === "--user-id")
  const value = index >= 0 ? Number(process.argv[index + 1]) : NaN
  return Number.isFinite(value) && value > 0 ? value : undefined
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
  return prisma.obras.findMany({
    where: {
      OR: [
        { data_criacao: { gte: FROM, lt: TO } },
        {
          contas_receber: {
            some: {
              auto_gerado: true,
              origem_obra_tipo: "QUITACAO",
              total_parcelas: { gt: 1 },
              OR: [
                { created_at: { gte: FROM, lt: TO } },
                { updated_at: { gte: FROM, lt: TO } },
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
    },
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
  const obras = await getAffectedObras()
  const results = []

  for (const obra of obras) {
    results.push(await consolidateObra(obra, apply, userId))
  }

  console.log(JSON.stringify({
    apply,
    window: {
      from: FROM.toISOString().slice(0, 10),
      toExclusive: TO.toISOString().slice(0, 10),
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
