"use server"

import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"

export type ConvertedObraDTO = {
  obraId: number
  orcamentoId: number
  titulo: string
  cliente: string
  valorObra: number
  status: string
  dataFechamento: string | null
  obraUrl: string
}

export type UserPerformanceDTO = {
  userId: number
  userName: string
  email: string
  lastLoginAt: string | null
  orcamentosCriados: number
  orcamentosConvertidos: number
  taxaConversao: number // 0 a 100
  valorConvertido: number
  ticketMedio: number
  convertedObras: ConvertedObraDTO[]
}

export type GlobalPerformanceSummary = {
  totalOrcamentos: number
  totalConvertidos: number
  taxaConversaoGlobal: number
  faturamentoTotal: number
  ticketMedioGlobal: number
}

export type TeamPerformanceResult = {
  globalSummary: GlobalPerformanceSummary
  dailyBudgets: { date: string; count: number }[]
  usersPerformance: UserPerformanceDTO[]
}

export async function getTeamPerformance(
  startDate?: Date, 
  endDate?: Date, 
  uniquePerClient: boolean = false
): Promise<TeamPerformanceResult> {
  const baseDate = new Date()
  const startParam = startDate ? startOfDay(startDate) : startOfMonth(baseDate)
  const endParam = endDate ? endOfDay(endDate) : endOfMonth(baseDate)

  // 1. Daily Budgets in the period
  let dailyBudgetsRaw
  if (uniquePerClient) {
    dailyBudgetsRaw = await prisma.$queryRaw<{ date: Date; count: number | bigint }[]>`
      SELECT DATE(data_criacao) AS date, COUNT(DISTINCT cliente_id) as count
      FROM orcamento
      WHERE excluido = false
        AND data_criacao >= ${startParam}
        AND data_criacao <= ${endParam}
      GROUP BY DATE(data_criacao)
      ORDER BY date ASC
    `
  } else {
    dailyBudgetsRaw = await prisma.$queryRaw<{ date: Date; count: number | bigint }[]>`
      SELECT DATE(data_criacao) AS date, COUNT(*) as count
      FROM orcamento
      WHERE excluido = false
        AND data_criacao >= ${startParam}
        AND data_criacao <= ${endParam}
      GROUP BY DATE(data_criacao)
      ORDER BY date ASC
    `
  }

  const dailyBudgets = dailyBudgetsRaw.map((row) => ({
    date: row.date.toISOString(),
    count: Number(row.count)
  }))

  // 2. Fetch Users (Vendedores / Admins - Active)
  const users = await prisma.user.findMany({
    where: { is_active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  })

  // 3. For each user, get stats
  let usersPerformance: UserPerformanceDTO[] = []

  let globalTotalOrcamentos = 0
  let globalTotalConvertidos = 0
  let globalFaturamento = 0

  for (const user of users) {
    // 3.1 Last Login
    const lastLog = await prisma.auditLog.findFirst({
      where: { user_id: user.id, action: "LOGIN" },
      orderBy: { created_at: "desc" },
      select: { created_at: true }
    })

    // 3.2 Budgets This Period
    const orcamentosRaw = await prisma.orcamento.findMany({
      where: {
        created_by: user.id,
        excluido: false,
        data_criacao: { gte: startParam, lte: endParam }
      },
      select: {
        id: true,
        titulo: true,
        lancado_obra: true,
        lancado_obra_em: true,
        cliente_id: true,
        cliente: {
          select: {
            nome: true
          }
        },
        obra: {
          select: {
            id: true,
            titulo: true,
            valor_obra: true,
            status: true,
            data_criacao: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      },
      orderBy: [
        { data_criacao: "asc" },
        { id: "asc" }
      ]
    })

    let filteredOrcamentos = orcamentosRaw
    if (uniquePerClient) {
      const clientMap = new Map<number, (typeof orcamentosRaw)[number]>()
      for (const o of orcamentosRaw) {
        if (!clientMap.has(o.cliente_id)) {
          clientMap.set(o.cliente_id, o)
        } else {
          // Se o atual foi convertido, e o do mapa não, substitui pra ganhar a conversão
          const current = clientMap.get(o.cliente_id)
          const currentConverted = Boolean(current?.obra || current?.lancado_obra)
          const nextConverted = Boolean(o.obra || o.lancado_obra)

          if (nextConverted && !currentConverted) {
            clientMap.set(o.cliente_id, o)
          }
        }
      }
      filteredOrcamentos = Array.from(clientMap.values())
    }

    const orcamentosCriados = filteredOrcamentos.length
    const convertedObras = filteredOrcamentos
      .filter(o => o.obra)
      .map((o) => ({
        obraId: o.obra!.id,
        orcamentoId: o.id,
        titulo: o.obra!.titulo || o.titulo || `Obra #${o.obra!.id}`,
        cliente: o.obra!.cliente?.nome || o.cliente?.nome || "Cliente não informado",
        valorObra: Number(o.obra!.valor_obra || 0),
        status: o.obra!.status,
        dataFechamento: (o.lancado_obra_em || o.obra!.data_criacao)?.toISOString() ?? null,
        obraUrl: `/obras/${o.obra!.id}`
      }))
    const orcamentosConvertidos = convertedObras.length
    const taxaConversao = orcamentosCriados > 0 ? (orcamentosConvertidos / orcamentosCriados) * 100 : 0

    // 3.3 Converted Value (baseado nas obras originadas pelos orçamentos do usuário)
    const valorConvertido = convertedObras.reduce((total, obra) => total + obra.valorObra, 0)
    const ticketMedio = orcamentosConvertidos > 0 ? valorConvertido / orcamentosConvertidos : 0

    // Agrega ao global
    globalTotalOrcamentos += orcamentosCriados
    globalTotalConvertidos += orcamentosConvertidos
    globalFaturamento += valorConvertido

    usersPerformance.push({
      userId: user.id,
      userName: user.name,
      email: user.email,
      lastLoginAt: lastLog ? lastLog.created_at.toISOString() : null,
      orcamentosCriados,
      orcamentosConvertidos,
      taxaConversao,
      valorConvertido,
      ticketMedio,
      convertedObras
    })
  }

  // Filtrar apenas usuários com orçamento
  usersPerformance = usersPerformance.filter(u => u.orcamentosCriados > 0)
  usersPerformance.sort((a, b) => b.orcamentosCriados - a.orcamentosCriados)

  const taxaConversaoGlobal = globalTotalOrcamentos > 0 ? (globalTotalConvertidos / globalTotalOrcamentos) * 100 : 0
  const ticketMedioGlobal = globalTotalConvertidos > 0 ? globalFaturamento / globalTotalConvertidos : 0

  return {
    globalSummary: {
      totalOrcamentos: globalTotalOrcamentos,
      totalConvertidos: globalTotalConvertidos,
      taxaConversaoGlobal,
      faturamentoTotal: globalFaturamento,
      ticketMedioGlobal
    },
    dailyBudgets,
    usersPerformance
  }
}

