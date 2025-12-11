// FilterCard.tsx — com filtro de Situação (ativos / excluídos / todos)
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

export type Option = { id: number; label: string }

export type FilterState = {
  q?: string
  telefone?: string
  bairro?: string
  tipoObraId?: number | null
  ini?: string
  fim?: string
  pageSize?: 10 | 20 | 25 | 50 | 100
  // NOVO: situação do orçamento (para ativos / excluídos / todos)
  statusExcluido?: "ativos" | "excluidos" | "todos"
}

export type FilterCardProps = {
  /** estado atual dos filtros (controlado pela página) */
  value: FilterState
  /** aplica patch no estado controlado (sem chamar busca ainda) */
  onChange: (next: FilterState) => void
  /** dispara a busca/tableSearch com o estado atual */
  onApply?: () => void
  /** limpa filtros e dispara a busca vazia */
  onClear?: () => void
  /** opções do select “Tipo de Obra” */
  tipoObraOptions: Option[]
  /** opções de “Linhas por página” (default: [10,20,25,50,100]) */
  pageSizeOptions?: number[]
  /** desabilita botões quando estiver carregando */
  loading?: boolean
  /** classe extra para estilizar o grupo de botões no header */
  className?: string
}

/**
 * Renderiza:
 *  - Botão “filtros” (abre Popover)
 *  - Botão “limpar filtros”
 *  - Popover com os campos: q, telefone, bairro, tipoObraId, período, pageSize, statusExcluido
 *
 * Pensado para ser passado direto no header do PageLayout.
 */
export default function FilterCard({
  value,
  onChange,
  onApply,
  onClear,
  tipoObraOptions,
  pageSizeOptions = [10, 20, 25, 50, 100],
  loading,
  className,
}: FilterCardProps) {
  const [open, setOpen] = useState(false)

  // estado “rascunho” enquanto o popover está aberto (evita aplicar a cada digitação)
  const [draft, setDraft] = useState<FilterState>(value)

  // sempre que abrir, sincroniza o draft com o value controlado
  useEffect(() => {
    if (open) setDraft(value)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // helpers de data: “YYYY-MM-DD” <-> Date local
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
      tipoObraId: null,
      ini: undefined,
      fim: undefined,
      pageSize: undefined,
      // reset padrão: só mostrar orçamentos ativos
      statusExcluido: "ativos",
    })
    onClear?.()
    setOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Botão: FILTROS */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
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
                  placeholder="Ex: João ou COBERTURA_MESSEJANA"
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
                <Label className="text-sm">Tipo de Obra</Label>
                <Select
                  value={draft.tipoObraId != null ? String(draft.tipoObraId) : "0"}
                  onValueChange={(v) =>
                    setDraft({ ...draft, tipoObraId: v === "0" ? null : Number(v) })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="0">Todos</SelectItem>
                    {tipoObraOptions?.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* NOVO BLOCO: Situação (ativos / excluídos / todos) */}
              <div className="space-y-1">
                <Label className="text-sm">Situação</Label>
                <Select
                  value={draft.statusExcluido ?? "ativos"}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      statusExcluido: v as FilterState["statusExcluido"],
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Ativos</SelectItem>
                    <SelectItem value="excluidos">Excluídos</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Linhas por página</Label>
                <Select
                  value={draft.pageSize ? String(draft.pageSize) : ""}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      pageSize: (Number(v) as FilterState["pageSize"]) || undefined,
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
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  cancelar
                </Button>
                <Button variant="outline" onClick={applyAndClose} disabled={loading}>
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
        variant="outlined-bege"
        disabled={loading}
        onClick={clearAll}
        className="gap-2"
      >
        <MinusCircle className="h-4 w-4" />
        limpar filtros
      </Button>
    </div>
  )
}
