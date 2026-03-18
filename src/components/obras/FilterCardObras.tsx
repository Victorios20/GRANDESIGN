// src/components/obras/FilterCardObras.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Filter, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type MotionProps } from "motion/react"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"

export type FilterStateObras = {
  q?: string
  telefone?: string
  bairro?: string
  tipoObra?: string
  ini?: string
  fim?: string
  // status foi movido para o cabeçalho principal como multi-select
  pageSize?: 10 | 20 | 25 | 50 | 100
}

export type FilterCardObrasProps = {
  value: FilterStateObras
  onChange: (next: FilterStateObras) => void
  onApply?: () => void
  onClear?: () => void
  pageSizeOptions?: number[]
  loading?: boolean
  className?: string
}

type StatusOpt = { value: string; label: string }

export const STATUS_OPTIONS: StatusOpt[] = [
  { value: "ASSINATURA_DE_CONTRATO", label: "Assinatura de contrato" },
  { value: "AGUARDANDO_VALIDACAO_TECNICA", label: "Aguardando validação técnica" },
  { value: "COMPRAS", label: "Compras" },
  { value: "A_INICIAR", label: "À iniciar" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento" },
  { value: "PENDENCIA", label: "Pendência" },
  { value: "FINALIZADO", label: "Finalizado" },
]

export default function FilterCardObras({
  value,
  onChange,
  onApply,
  onClear,
  pageSizeOptions = [10, 20, 25, 50, 100],
  loading,
  className,
}: FilterCardObrasProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterStateObras>(value)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open])

  const ymdToLocalDate = (ymd?: string) => {
    if (!ymd) return undefined
    const [y, m, d] = ymd.split("-").map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1)
  }

  const toYMD = (d?: Date) => {
    if (!d) return undefined
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const fromDate = ymdToLocalDate(draft.ini)
  const toDate = ymdToLocalDate(draft.fim)

  const smooth: MotionProps = {
    initial: { opacity: 0, scale: 0.98, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
  }

  function applyAndClose() {
    onChange({ ...value, ...draft })
    onApply?.()
    setOpen(false)
  }

  function clearAll() {
    onChange({
      q: "",
      telefone: "",
      bairro: "",
      tipoObra: "",
      ini: undefined,
      fim: undefined,
      pageSize: undefined,
    })
    onClear?.()
    setOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="gap-2 bg-[#EBF0EC] text-[#376139] border-none hover:bg-[#376139]/20 font-medium h-10 px-4 rounded-lg">
            <Filter className="h-4 w-4 shrink-0 opacity-80" />
            filtros
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className={cn(
            "w-[360px] p-3 sm:w-[400px] shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key="body" layout {...smooth} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Nome ou título</Label>
                <Input
                  className="h-9"
                  placeholder="Ex: João ou OBRA_MESSEJANA"
                  value={draft.q ?? ""}
                  onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Telefone</Label>
                <Input
                  className="h-9"
                  placeholder="DDD ou parte do número"
                  value={draft.telefone ?? ""}
                  onChange={(e) => setDraft({ ...draft, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Bairro</Label>
                <Input
                  className="h-9"
                  placeholder="Bairro"
                  value={draft.bairro ?? ""}
                  onChange={(e) => setDraft({ ...draft, bairro: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Tipo de obra</Label>
                <Input
                  className="h-9"
                  placeholder="Ex: Cobertura, Telhado, Reforma..."
                  value={draft.tipoObra ?? ""}
                  onChange={(e) => setDraft({ ...draft, tipoObra: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Período</Label>
                <SmartDateRangePicker
                  className="w-full"
                  range={{ from: fromDate, to: toDate }}
                  onChange={(r) =>
                    setDraft({
                      ...draft,
                      ini: toYMD(r?.from),
                      fim: toYMD(r?.to),
                    })
                  }
                />
              </div>



              <div className="space-y-1">
                <Label className="text-sm">Linhas por página</Label>
                <Select
                  value={draft.pageSize ? String(draft.pageSize) : ""}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      pageSize: (Number(v) as FilterStateObras["pageSize"]) || undefined,
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" className="text-green" onClick={() => setOpen(false)}>
                  cancelar
                </Button>
                <Button variant="outline" onClick={applyAndClose} disabled={loading} className="text-white border-green bg-green" >
                  aplicar
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </PopoverContent>
      </Popover>

      {/* Botão: LIMPAR FILTROS */}
      <Button
        type="button"
        variant="ghost"
        disabled={loading}
        onClick={clearAll}
        className="gap-2 bg-transparent border border-[#376139] text-[#376139] hover:bg-[#376139]/10 font-medium h-10 px-4 rounded-lg"
      >
        <MinusCircle className="h-4 w-4" />
        limpar filtros
      </Button>
    </div>
  )
}
