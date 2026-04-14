"use server"

import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"

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
      select: { id: true, lancado_obra: true, cliente_id: true }
    })

    let filteredOrcamentos = orcamentosRaw
    if (uniquePerClient) {
      const clientMap = new Map()
      for (const o of orcamentosRaw) {
        if (!clientMap.has(o.cliente_id)) {
          clientMap.set(o.cliente_id, o)
        } else {
          // Se o atual foi convertido, e o do mapa não, substitui pra ganhar a conversão
          if (o.lancado_obra && !clientMap.get(o.cliente_id).lancado_obra) {
            clientMap.set(o.cliente_id, o)
          }
        }
      }
      filteredOrcamentos = Array.from(clientMap.values())
    }

    const orcamentosCriados = filteredOrcamentos.length
    const orcamentosConvertidos = filteredOrcamentos.filter(o => o.lancado_obra).length
    const taxaConversao = orcamentosCriados > 0 ? (orcamentosConvertidos / orcamentosCriados) * 100 : 0

    // 3.3 Converted Value (Baseado nas obras criadas pelo usuário. A obra pode ter vários orçamentos, mas a obra é única)
    const valorConvertidoRaw = await prisma.obras.aggregate({
      where: {
        created_by: user.id,
        data_criacao: { gte: startParam, lte: endParam },
        status: { not: "FINALIZADO" } 
      },
      _sum: {
        valor_obra: true
      }
    })

    const valorConvertido = Number(valorConvertidoRaw._sum?.valor_obra || 0)
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
      ticketMedio
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

