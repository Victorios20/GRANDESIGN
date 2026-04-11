import { StatusFinanceiro } from "@prisma/client"
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns"

import { getCashFlowSettings } from "@/actions/financeiro/settings/cash-flow"
import { prisma } from "@/lib/prisma"
import type {
  CashFlowDayStatus,
  CashFlowProjectionAnalytics,
  CashFlowProjectionItem,
  CashFlowProjectionResponse,
  CashFlowScopeMode,
} from "@/types/financeiro"

interface CashFlowParams {
  scope_mode?: CashFlowScopeMode | string
  start_date?: string
  period_start?: string
  period_end?: string
  days?: number
  centro_custo_id?: string | null
}

type PendingKind = "receber" | "pagar"
type ScopeBucket = "before" | "after" | "in_scope"

interface PendingProjectionEntry {
  amount: number
  dueDate: Date
  isTransfer: boolean
  kind: PendingKind
}

interface ResolvedScope {
  mode: CashFlowScopeMode
  label: string
  startDate: Date
  endDate: Date
  days: number
}

interface ClassifiedEntry {
  bucket: ScopeBucket
  date: string | null
}

const STATUS_FILTER = {
  in: [
    StatusFinanceiro.PENDENTE,
    StatusFinanceiro.PARCIAL,
    StatusFinanceiro.ATRASADO,
  ],
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function isTransferCategory(name: string | null | undefined) {
  return normalizeText(name).includes("transferencia")
}

function getProjectionStatus(balance: number, safetyLimit: number): CashFlowDayStatus {
  if (balance <= 0) {
    return "CRITICO"
  }

  if (balance <= safetyLimit) {
    return "ATENCAO"
  }

  return "SAUDAVEL"
}

function resolveCostCenterId(value: string | null | undefined) {
  if (!value || value === "all") {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveScopeMode(params: CashFlowParams): CashFlowScopeMode {
  if (params.scope_mode === "preset_7") return "preset_7"
  if (params.scope_mode === "preset_14") return "preset_14"
  if (params.scope_mode === "preset_28") return "preset_28"
  if (params.scope_mode === "preset_30") return "preset_30"
  if (params.scope_mode === "preset_60") return "preset_60"
  if (params.scope_mode === "preset_90") return "preset_90"
  if (params.scope_mode === "all_open") return "all_open"
  if (params.scope_mode === "custom_range") return "custom_range"

  if (params.period_start || params.period_end) {
    return "custom_range"
  }

  if (params.days === 7) return "preset_7"
  if (params.days === 14) return "preset_14"
  if (params.days === 28) return "preset_28"
  if (params.days === 60) return "preset_60"
  if (params.days === 90) return "preset_90"
  if (params.days === 30 || !params.days) return "preset_30"

  return "custom_range"
}

function parseDateOrThrow(rawValue: string | undefined, fallback: Date, label: string) {
  const parsed = rawValue ? startOfDay(parseISO(rawValue)) : fallback

  if (!isValid(parsed)) {
    throw new Error(`${label} invalida`)
  }

  return parsed
}

function buildPresetScope(mode: CashFlowScopeMode, today: Date, days: number, label: string): ResolvedScope {
  return {
    mode,
    label,
    startDate: today,
    endDate: endOfDay(addDays(today, days - 1)),
    days,
  }
}

function resolveScope(
  params: CashFlowParams,
  today: Date,
  lastOpenDueDate: Date | null,
): ResolvedScope {
  const mode = resolveScopeMode(params)

  if (mode === "all_open") {
    const effectiveEndDate =
      lastOpenDueDate && isAfter(lastOpenDueDate, today) ? lastOpenDueDate : today

    return {
      mode,
      label: "Periodo todo",
      startDate: today,
      endDate: endOfDay(effectiveEndDate),
      days: differenceInCalendarDays(effectiveEndDate, today) + 1,
    }
  }

  if (mode === "preset_7") return buildPresetScope(mode, today, 7, "Proximos 7 dias")
  if (mode === "preset_14") return buildPresetScope(mode, today, 14, "Proximos 14 dias")
  if (mode === "preset_28") return buildPresetScope(mode, today, 28, "Proximos 28 dias")
  if (mode === "preset_60") return buildPresetScope(mode, today, 60, "Proximos 60 dias")
  if (mode === "preset_90") return buildPresetScope(mode, today, 90, "Proximos 90 dias")

  if (mode === "custom_range") {
    const requestedStart = parseDateOrThrow(
      params.period_start ?? params.start_date,
      today,
      "Data inicial",
    )
    const startDate = requestedStart < today ? today : requestedStart

    const fallbackEnd = endOfDay(addDays(startDate, (params.days ?? 30) - 1))
    const parsedEnd = params.period_end
      ? endOfDay(parseDateOrThrow(params.period_end, startDate, "Data final"))
      : fallbackEnd

    if (!isValid(parsedEnd) || parsedEnd < startDate) {
      throw new Error("Data final invalida")
    }

    return {
      mode,
      label: "Periodo personalizado",
      startDate,
      endDate: parsedEnd,
      days: differenceInCalendarDays(parsedEnd, startDate) + 1,
    }
  }

  return buildPresetScope("preset_30", today, 30, "Proximos 30 dias")
}

function classifyEntry(
  entry: PendingProjectionEntry,
  startDate: Date,
  endDate: Date,
  today: Date,
): ClassifiedEntry {
  if (startDate > today && entry.dueDate < startDate) {
    return {
      bucket: "before",
      date: null,
    }
  }

  if (entry.dueDate > endDate) {
    return {
      bucket: "after",
      date: null,
    }
  }

  const date =
    entry.dueDate < startDate ? format(startDate, "yyyy-MM-dd") : format(entry.dueDate, "yyyy-MM-dd")

  return {
    bucket: "in_scope",
    date,
  }
}

function normalizePendingDueDate(date: Date, today: Date) {
  return date < today ? today : date
}

function buildAnalytics(
  projection: CashFlowProjectionItem[],
): CashFlowProjectionAnalytics {
  if (projection.length === 0) {
    return {
      worst_day: { date: null, value: 0 },
      best_day: { date: null, value: 0 },
      biggest_inflow_day: { date: null, value: 0 },
      biggest_outflow_day: { date: null, value: 0 },
      critical_days_count: 0,
      attention_days_count: 0,
      healthy_days_count: 0,
    }
  }

  const worstDay = projection.reduce((lowest, item) =>
    item.saldo_final < lowest.saldo_final ? item : lowest,
  projection[0])
  const bestDay = projection.reduce((highest, item) =>
    item.saldo_final > highest.saldo_final ? item : highest,
  projection[0])
  const biggestInflowDay = projection.reduce((highest, item) =>
    item.entradas_previstas > highest.entradas_previstas ? item : highest,
  projection[0])
  const biggestOutflowDay = projection.reduce((highest, item) =>
    item.saidas_previstas > highest.saidas_previstas ? item : highest,
  projection[0])

  return {
    worst_day: {
      date: worstDay.date,
      value: worstDay.saldo_final,
    },
    best_day: {
      date: bestDay.date,
      value: bestDay.saldo_final,
    },
    biggest_inflow_day: {
      date: biggestInflowDay.date,
      value: biggestInflowDay.entradas_previstas,
    },
    biggest_outflow_day: {
      date: biggestOutflowDay.date,
      value: biggestOutflowDay.saidas_previstas,
    },
    critical_days_count: projection.filter((item) => item.status === "CRITICO").length,
    attention_days_count: projection.filter((item) => item.status === "ATENCAO").length,
    healthy_days_count: projection.filter((item) => item.status === "SAUDAVEL").length,
  }
}

export async function getCashFlowProjection(
  params: CashFlowParams,
): Promise<CashFlowProjectionResponse> {
  const today = startOfDay(new Date())
  const costCenterId = resolveCostCenterId(params.centro_custo_id)

  const [settings, bankAgg, receivables, payables] = await Promise.all([
    getCashFlowSettings(),
    prisma.contasBancaria.aggregate({
      _sum: { saldo_atual: true },
      where: { ativo: true },
    }),
    prisma.contaReceber.findMany({
      where: {
        status: STATUS_FILTER,
        ...(costCenterId ? { centro_custo_id: costCenterId } : {}),
      },
      select: {
        data_vencimento: true,
        valor_total: true,
        valor_recebido: true,
        categoria: {
          select: {
            nome: true,
          },
        },
      },
    }),
    prisma.contaPagar.findMany({
      where: {
        status: STATUS_FILTER,
        ...(costCenterId ? { centro_custo_id: costCenterId } : {}),
      },
      select: {
        data_vencimento: true,
        valor_total: true,
        valor_pago: true,
        categoria: {
          select: {
            nome: true,
          },
        },
      },
    }),
  ])

  const currentBalance = roundMoney(Number(bankAgg._sum.saldo_atual || 0))
  const safetyLimit = roundMoney(settings.safety_limit)

  const pendingEntries: PendingProjectionEntry[] = [
    ...receivables
      .map((item) => ({
        amount: roundMoney(Number(item.valor_total) - Number(item.valor_recebido)),
        dueDate: normalizePendingDueDate(startOfDay(item.data_vencimento), today),
        isTransfer: isTransferCategory(item.categoria?.nome),
        kind: "receber" as const,
      }))
      .filter((item) => item.amount > 0),
    ...payables
      .map((item) => ({
        amount: roundMoney(Number(item.valor_total) - Number(item.valor_pago)),
        dueDate: normalizePendingDueDate(startOfDay(item.data_vencimento), today),
        isTransfer: isTransferCategory(item.categoria?.nome),
        kind: "pagar" as const,
      }))
      .filter((item) => item.amount > 0),
  ]

  const nonTransferEntries = pendingEntries.filter((entry) => !entry.isTransfer)
  const lastOpenDueDate =
    nonTransferEntries.length > 0
      ? nonTransferEntries.reduce((latest, entry) =>
          entry.dueDate > latest ? entry.dueDate : latest,
        nonTransferEntries[0].dueDate)
      : null

  const scope = resolveScope(params, today, lastOpenDueDate)

  const dailyBuckets = new Map<string, { entradas: number; saidas: number }>()

  for (let index = 0; index < scope.days; index += 1) {
    const day = format(addDays(scope.startDate, index), "yyyy-MM-dd")
    dailyBuckets.set(day, { entradas: 0, saidas: 0 })
  }

  let beforeScopeEntradas = 0
  let beforeScopeSaidas = 0
  let afterScopeEntradas = 0
  let afterScopeSaidas = 0
  let excludedTransferEntradas = 0
  let excludedTransferSaidas = 0
  let excludedTransferCount = 0

  for (const entry of pendingEntries) {
    const classification = classifyEntry(
      entry,
      scope.startDate,
      scope.endDate,
      today,
    )

    if (entry.isTransfer) {
      if (classification.bucket === "in_scope") {
        if (entry.kind === "receber") {
          excludedTransferEntradas += entry.amount
        } else {
          excludedTransferSaidas += entry.amount
        }
        excludedTransferCount += 1
      }
      continue
    }

    if (classification.bucket === "before") {
      if (entry.kind === "receber") {
        beforeScopeEntradas += entry.amount
      } else {
        beforeScopeSaidas += entry.amount
      }
      continue
    }

    if (classification.bucket === "after") {
      if (entry.kind === "receber") {
        afterScopeEntradas += entry.amount
      } else {
        afterScopeSaidas += entry.amount
      }
      continue
    }

    const bucket = dailyBuckets.get(classification.date!)
    if (!bucket) {
      continue
    }

    if (entry.kind === "receber") {
      bucket.entradas += entry.amount
    } else {
      bucket.saidas += entry.amount
    }
  }

  const startingBalance =
    scope.startDate > today
      ? roundMoney(currentBalance + beforeScopeEntradas - beforeScopeSaidas)
      : currentBalance

  const projection: CashFlowProjectionItem[] = []
  let runningBalance = startingBalance

  for (let index = 0; index < scope.days; index += 1) {
    const currentDate = format(addDays(scope.startDate, index), "yyyy-MM-dd")
    const bucket = dailyBuckets.get(currentDate) ?? { entradas: 0, saidas: 0 }
    const saldoInicial = roundMoney(runningBalance)
    const saldoDia = roundMoney(bucket.entradas - bucket.saidas)
    const saldoFinal = roundMoney(saldoInicial + saldoDia)

    projection.push({
      date: currentDate,
      saldo_inicial: saldoInicial,
      entradas_previstas: roundMoney(bucket.entradas),
      saidas_previstas: roundMoney(bucket.saidas),
      saldo_dia: saldoDia,
      saldo_final: saldoFinal,
      status: getProjectionStatus(saldoFinal, safetyLimit),
    })

    runningBalance = saldoFinal
  }

  const totalEntradasPrevistas = roundMoney(
    projection.reduce((total, item) => total + item.entradas_previstas, 0),
  )
  const totalSaidasPrevistas = roundMoney(
    projection.reduce((total, item) => total + item.saidas_previstas, 0),
  )
  const analytics = buildAnalytics(projection)

  return {
    safety_limit: safetyLimit,
    scope: {
      mode: scope.mode,
      label: scope.label,
      period_start: format(scope.startDate, "yyyy-MM-dd"),
      period_end: format(scope.endDate, "yyyy-MM-dd"),
      days: scope.days,
      last_open_due_date: lastOpenDueDate
        ? format(lastOpenDueDate, "yyyy-MM-dd")
        : null,
    },
    summary: {
      saldo_atual: currentBalance,
      entradas_previstas: totalEntradasPrevistas,
      saidas_previstas: totalSaidasPrevistas,
      saldo_final_previsto:
        projection.length > 0
          ? projection[projection.length - 1].saldo_final
          : currentBalance,
      pior_saldo: analytics.worst_day.value,
      data_pior_saldo: analytics.worst_day.date,
      pico_caixa: analytics.best_day.value,
      data_pico_caixa: analytics.best_day.date,
    },
    analytics,
    excluded_internal_transfers: {
      entradas: roundMoney(excludedTransferEntradas),
      saidas: roundMoney(excludedTransferSaidas),
      quantidade: excludedTransferCount,
    },
    outside_scope: {
      entradas_antes: roundMoney(beforeScopeEntradas),
      saidas_antes: roundMoney(beforeScopeSaidas),
      entradas_depois: roundMoney(afterScopeEntradas),
      saidas_depois: roundMoney(afterScopeSaidas),
      total_entradas: roundMoney(beforeScopeEntradas + afterScopeEntradas),
      total_saidas: roundMoney(beforeScopeSaidas + afterScopeSaidas),
      has_values:
        beforeScopeEntradas > 0 ||
        beforeScopeSaidas > 0 ||
        afterScopeEntradas > 0 ||
        afterScopeSaidas > 0,
    },
    projection,
  }
}
