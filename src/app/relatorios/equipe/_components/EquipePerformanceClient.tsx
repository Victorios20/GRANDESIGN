"use client"

import React, { useState, useEffect } from "react"
import { type TeamPerformanceResult, getTeamPerformance } from "@/actions/performance/get-team-performance"
import DailyBudgetsChart from "./DailyBudgetsChart"
import UsersPerformanceTable from "./UsersPerformanceTable"
import UserConvertedObrasDrawer from "./UserConvertedObrasDrawer"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"
import { PageLayout } from "@/components/ui/pageLayout"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth } from "date-fns"
import { BarChart3, Users, Landmark, Banknote, Percent, Loader2, HelpCircle } from "lucide-react"

interface Props {
  initialData: TeamPerformanceResult
}

export default function EquipePerformanceClient({ initialData }: Props) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TeamPerformanceResult>(initialData)
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [uniquePerClient, setUniquePerClient] = useState(false)

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  
  // Reload data when date changes
  useEffect(() => {
    let active = true
    async function loadData() {
      if (!dateRange?.from) return
      setLoading(true)
      try {
        const result = await getTeamPerformance(dateRange.from, dateRange.to || dateRange.from, uniquePerClient)
        if (active) setData(result)
      } catch (error) {
        console.error("Erro ao carregar dados", error)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [dateRange, uniquePerClient])

  const fmtMonetario = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
  }

  const { totalOrcamentos, totalConvertidos, taxaConversaoGlobal, faturamentoTotal, ticketMedioGlobal } = data.globalSummary
  const selectedUser = selectedUserId ? data.usersPerformance.find(u => u.userId === selectedUserId) : null

  // --- Utility CSS Classes (from brand.md) ---
  const shellClass = "bg-[#ffffff] border border-[#e8e1d6] shadow-[0_1px_2px_rgba(16,24,40,0.04)] rounded-2xl"

  return (
    <PageLayout title="Performance da Equipe">
      <div className="mx-auto max-w-[1480px] space-y-6 pb-10">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Performance da Equipe</h1>
            <p className="text-sm text-[#7b705f]">Acompanhamento da produtividade de vendas e orçamentos.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-[#e8e1d6] shadow-[0_1px_2px_rgba(16,24,40,0.04)] h-9">
              <Checkbox 
                id="unique-client" 
                checked={uniquePerClient} 
                onCheckedChange={(v) => setUniquePerClient(Boolean(v))}
              />
              <Label htmlFor="unique-client" className="text-sm cursor-pointer whitespace-nowrap text-[#393316] hover:text-[#2c201b] transition-colors leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium">
                Único por cliente
              </Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-[#c5bdb3] hover:text-[#7b705f] focus-visible:outline-none">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] rounded-xl border border-[#e8e1d6] bg-white p-4 text-left shadow-[0_4px_16px_rgba(44,32,27,0.10)] text-[#6f6556] z-50">
                    <p className="mb-2 text-xs font-semibold text-[#2c201b]">Orçamento único por cliente</p>
                    <p className="text-[11px] leading-[1.6]">Ao marcar esta opção, caso o mesmo cliente tenha mais de um orçamento no período, apenas o primeiro gerado será contado (ou o convertido, se houver).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="w-full sm:w-auto">
              <SmartDateRangePicker 
                range={dateRange} 
                onChange={setDateRange} 
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e1d6] bg-white px-4 py-2 text-xs text-[#7b705f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <Loader2 className="size-3.5 animate-spin text-[#9a8f7c]" />
              Atualizando métricas...
            </div>
          </div>
        )}

        {/* Cards de Métricas Globais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`${shellClass} p-4 flex flex-col gap-2 transition-all hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)]`}>
            <div className="flex flex-row items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a8f7c]">Orçamentos Gerados</span>
              <BarChart3 className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="text-2xl font-bold text-[#393316]">{totalOrcamentos}</div>
          </div>
          
          <div className={`${shellClass} p-4 flex flex-col gap-2 transition-all hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)]`}>
            <div className="flex flex-row items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a8f7c]">Convertidos (Obras)</span>
              <Users className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="text-2xl font-bold text-[#393316]">{totalConvertidos}</div>
          </div>

          <div className={`${shellClass} p-4 flex flex-col gap-2 transition-all hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)]`}>
            <div className="flex flex-row items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a8f7c]">Tx. de Conversão</span>
              <Percent className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="text-2xl font-bold text-[#393316]">{taxaConversaoGlobal.toFixed(1)}%</div>
          </div>

          <div className={`${shellClass} p-4 flex flex-col gap-2 transition-all hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)]`}>
            <div className="flex flex-row items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a8f7c]">Faturamento Bruto</span>
              <Landmark className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="text-2xl font-bold text-[#2f7a52]">{fmtMonetario(faturamentoTotal)}</div>
          </div>

          <div className={`${shellClass} p-4 flex flex-col gap-2 transition-all hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)]`}>
            <div className="flex flex-row items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a8f7c]">Ticket Médio</span>
              <Banknote className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="text-2xl font-bold text-[#393316]">{fmtMonetario(ticketMedioGlobal)}</div>
          </div>
        </div>

        {/* Grid Central */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* Gráfico de Evolução (1/3 espaço pra não espremer tabela) */}
          <div className="lg:col-span-1 min-h-[400px] flex flex-col">
            <DailyBudgetsChart data={data.dailyBudgets} />
          </div>

          {/* Tabela de Performance por Usuário (2/3 espaço) */}
          <div className="lg:col-span-2 flex flex-col">
            <UsersPerformanceTable 
              users={data.usersPerformance} 
              onUserClick={(userId: number) => setSelectedUserId(userId)} 
            />
          </div>

        </div>

        {selectedUser && selectedUser.convertedObras.length > 0 && (
          <UserConvertedObrasDrawer
            open={!!selectedUserId}
            onOpenChange={(open: boolean) => !open && setSelectedUserId(null)}
            userName={selectedUser.userName}
            obras={selectedUser.convertedObras}
          />
        )}

      </div>
    </PageLayout>
  )
}

