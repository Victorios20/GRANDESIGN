"use client"

import React from "react"
import Link from "next/link"
import type { ConvertedObraDTO } from "@/actions/performance/get-team-performance"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, FileText, Landmark } from "lucide-react"

interface Props {
  userName: string
  obras: ConvertedObraDTO[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserConvertedObrasDrawer({ userName, obras, open, onOpenChange }: Props) {
  const fmtMonetario = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Data não informada"
    return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase()
  }

  const total = obras.reduce((sum, obra) => sum + obra.valorObra, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col border-l border-[#e8e1d6] bg-[#faf8f3] p-6 text-[#2c201b] shadow-2xl sm:max-w-xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl font-bold tracking-tight text-[#393316]">
            Obras fechadas de {userName}
          </SheetTitle>
          <SheetDescription className="text-[#6f6556]">
            Obras originadas de orçamentos criados pelo usuário no período selecionado.
          </SheetDescription>
        </SheetHeader>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#e8e1d6] bg-white p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">
              Obras
              <FileText className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#393316]">{obras.length}</div>
          </div>
          <div className="rounded-xl border border-[#e8e1d6] bg-white p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">
              Total
              <Landmark className="h-4 w-4 text-[#7b705f]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#2f7a52]">{fmtMonetario(total)}</div>
          </div>
        </div>

        <div className="relative -mx-6 flex-1 overflow-hidden px-6">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3 pb-6">
              {obras.map((obra) => (
                <div key={`${obra.obraId}-${obra.orcamentoId}`} className="rounded-xl border border-[#e8e1d6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#2c201b]">{obra.titulo}</p>
                      <p className="mt-1 text-xs text-[#7b705f]">{obra.cliente}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-[#cce8d6] bg-[#e6f3eb] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#2f7a52]">
                      {formatStatus(obra.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">Valor</p>
                      <p className="mt-1 font-semibold text-[#2f7a52]">{fmtMonetario(obra.valorObra)}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">Fechamento</p>
                      <p className="mt-1 text-[#6f6556]">{formatDate(obra.dataFechamento)}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">Obra</p>
                      <p className="mt-1 text-[#6f6556]">#{obra.obraId}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-[0.08em] text-[#9a8f7c]">Orçamento</p>
                      <p className="mt-1 text-[#6f6556]">#{obra.orcamentoId}</p>
                    </div>
                  </div>

                  <Link
                    href={obra.obraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#d9cdbb] bg-[#faf8f3] px-3 text-xs font-semibold text-[#393316] transition-colors hover:bg-[#f3ecdc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b89967]"
                  >
                    Abrir obra
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
