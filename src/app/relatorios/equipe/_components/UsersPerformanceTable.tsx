"use client"

import React from "react"
import type { UserPerformanceDTO } from "@/actions/performance/get-team-performance"
import { formatDistanceToNow, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  users: UserPerformanceDTO[]
  onUserClick: (userId: number) => void
}

export default function UsersPerformanceTable({ users, onUserClick }: Props) {
  const fmtMonetario = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
  }

  const formatLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return "Nunca"
    return formatDistanceToNow(parseISO(lastLoginAt), { addSuffix: true, locale: ptBR })
  }

  return (
    <div className="bg-[#ffffff] border border-[#e8e1d6] shadow-[0_1px_2px_rgba(16,24,40,0.04)] rounded-2xl flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-[#e8e1d6]">
        <h3 className="text-base font-semibold text-[#393316]">Vendedores & Usuários</h3>
        <p className="text-sm text-[#6f6556] mt-1">Performance individual no período selecionado</p>
      </div>

      <div className="flex-1 overflow-auto">
        {users.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-[#faf8f3] z-10 border-b border-[#e7e0d4]">
              <tr>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap">Colaborador</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap">Último Acesso</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap text-right">Orçamentos</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap text-right">Viraram Obra</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap text-right">Conversão</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap text-right">Faturamento</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-[#6f6556] whitespace-nowrap text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efe8dc]">
              {users.map((user) => {
                const canOpenObras = user.convertedObras.length > 0

                return (
                  <tr
                    key={user.userId}
                    onClick={() => canOpenObras && onUserClick(user.userId)}
                    onKeyDown={(event) => {
                      if (!canOpenObras) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onUserClick(user.userId)
                      }
                    }}
                    tabIndex={canOpenObras ? 0 : undefined}
                    className={`bg-white transition-colors ${canOpenObras ? "cursor-pointer hover:bg-[#f3ecdc] focus-visible:bg-[#f3ecdc] focus-visible:outline-none" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#2c201b]">{user.userName}</div>
                      <div className="text-xs text-[#7b705f] mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#6f6556]">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-[#2c201b]">
                      {user.orcamentosCriados}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {user.orcamentosConvertidos > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cce8d6] bg-[#e6f3eb] text-[11px] font-semibold text-[#2f7a52]">
                          {user.orcamentosConvertidos} obras
                        </span>
                      ) : (
                        <span className="text-[#9a8f7c]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#6f6556]">
                      {user.taxaConversao.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-[#2f7a52]">
                      {fmtMonetario(user.valorConvertido)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#6f6556]">
                      {fmtMonetario(user.ticketMedio)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="h-40 flex items-center justify-center text-[#7b705f] text-sm">
            Nenhum usuário ativo encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
