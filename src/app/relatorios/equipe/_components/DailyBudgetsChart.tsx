"use client"

import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  data: { date: string; count: number }[]
}

export default function DailyBudgetsChart({ data }: Props) {
  // Format labels for X axis
  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MMM", { locale: ptBR }),
  }))

  return (
    <div className="bg-[#ffffff] border border-[#e8e1d6] shadow-[0_1px_2px_rgba(16,24,40,0.04)] rounded-2xl flex flex-col h-full overflow-hidden p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-[#393316]">Histórico de Orçamentos</h3>
        <p className="text-sm text-[#6f6556] mt-1">Volume de novos orçamentos criados por dia</p>
      </div>
      
      <div className="flex-1 min-h-[300px]">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efe8dc" />
              <XAxis 
                dataKey="label" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                tick={{ fill: "#9a8f7c" }}
              />
              <YAxis 
                allowDecimals={false} 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: "#9a8f7c" }}
              />
              <Tooltip 
                cursor={{ fill: "#faf8f3" }} 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #e8e1d6',
                  backgroundColor: '#ffffff',
                  color: '#2c201b',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: '#2c201b', fontWeight: 600 }}
              />
              <Bar 
                dataKey="count" 
                fill="#393316" 
                radius={[4, 4, 0, 0]} 
                name="Orçamentos" 
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[#7b705f] text-sm">
            Sem dados para o período informado.
          </div>
        )}
      </div>
    </div>
  )
}
