"use client"

import React, { useEffect, useState } from "react"
import { getUserTimeline, type UserTimelineAction } from "@/actions/performance/get-user-timeline"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, LogIn, FileEdit, PlusCircle, CheckCircle2 } from "lucide-react"

interface Props {
  userId: number
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserTimelineDrawer({ userId, userName, open, onOpenChange }: Props) {
  const [timeline, setTimeline] = useState<UserTimelineAction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (open && userId) {
      setLoading(true)
      getUserTimeline(userId).then(data => {
        if (active) setTimeline(data)
      }).finally(() => {
        if (active) setLoading(false)
      })
    }
    return () => { active = false }
  }, [userId, open])

  // Helpers to pick icons/colors based on action/entity
  const getActionIcon = (action: string, entity: string) => {
    const a = action.toUpperCase()
    if (a.includes("LOGIN")) return <LogIn className="text-[#6f6556] w-4 h-4" />
    if (a.includes("CREATE")) return <PlusCircle className="text-[#2f7a52] w-4 h-4" />
    if (a.includes("UPDATE") || a.includes("EDIT")) return <FileEdit className="text-[#9b4b1d] w-4 h-4" />
    if (a.includes("FINALIZE") || a.includes("CONVERT")) return <CheckCircle2 className="text-[#393316] w-4 h-4" />
    return <Activity className="text-[#9a8f7c] w-4 h-4" />
  }

  const formatActionName = (action: string, entity: string) => {
    return `${action} ${entity}`.replace(/_/g, " ")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md bg-[#faf8f3] border-l border-[#e8e1d6] shadow-2xl flex flex-col p-6 text-[#2c201b]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl font-bold tracking-tight text-[#393316]">Timeline de Atividades</SheetTitle>
          <SheetDescription className="text-[#6f6556]">
            Últimas ações recentes de {userName} no sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 relative -mx-6 px-6 overflow-hidden">
          {loading ? (
            <div className="space-y-4 py-4 w-full">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-full bg-[#efe8dc] animate-pulse" />
                    <div className="flex-1 space-y-2">
                       <div className="h-4 w-3/4 bg-[#efe8dc] animate-pulse rounded" />
                       <div className="h-3 w-1/4 bg-[#efe8dc] animate-pulse rounded" />
                    </div>
                 </div>
               ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#7b705f] text-center">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Nenhuma atividade recente encontrada.</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="relative border-l border-[#e8e1d6] ml-3 space-y-6 pb-6 pt-2">
                {timeline.map((act) => (
                  <div key={act.id} className="relative pl-6">
                    <span className="absolute -left-[1.1rem] top-1 rounded-full bg-[#ffffff] border border-[#e8e1d6] p-1 shadow-sm">
                      {getActionIcon(act.action, act.entity)}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold capitalize text-[#2c201b]">
                        {formatActionName(act.action, act.entity)}
                      </span>
                      {act.entityId && (
                        <span className="text-xs text-[#7b705f]">
                          Referência ID: {act.entityId}
                        </span>
                      )}
                      <span className="text-xs font-medium text-[#9a8f7c] mt-1">
                        {format(parseISO(act.date), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
