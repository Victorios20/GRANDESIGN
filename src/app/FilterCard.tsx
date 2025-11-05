// FilterCard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { AnimatePresence, motion, type MotionProps } from "motion/react"
import { SmartDateRangePicker } from "@/components/ui/SmartDateRangePicker"

export type Option = { id: number; label: string }

export type FilterState = {
  q?: string
  telefone?: string
  bairro?: string
  cidadeId?: number | null
  tipoObraId?: number | null
  ini?: string
  fim?: string
  pageSize?: 5 | 10 | 20
}

export type FieldId =
  | "q"
  | "telefone"
  | "bairro"
  | "cidadeId"
  | "tipoObraId"
  | "dateRange"
  | "pageSize"

export type AvailableField =
  | { id: "q"; label: string; type: "text" }
  | { id: "telefone"; label: string; type: "text" }
  | { id: "bairro"; label: string; type: "text" }
  | { id: "cidadeId"; label: string; type: "select"; options: Option[] }
  | { id: "tipoObraId"; label: string; type: "select"; options: Option[] }
  | { id: "dateRange"; label: string; type: "dateRange" }
  | { id: "pageSize"; label: string; type: "select"; options: number[] }

export type FilterCardProps = {
  value: FilterState
  onChange: (next: FilterState) => void
  onApply?: () => void
  onClear?: () => void
  availableFields: AvailableField[]
  selectedFields: FieldId[]
  onSelectedFieldsChange: (ids: FieldId[]) => void
  persistKey?: string
  loading?: boolean
  rightExtra?: React.ReactNode
}

export default function FilterCard(props: FilterCardProps) {
  const {
    value,
    onChange,
    onApply,
    onClear,
    availableFields,
    selectedFields,
    onSelectedFieldsChange,
    persistKey,
    loading,
    rightExtra,
  } = props

  const [openEdit, setOpenEdit] = useState(false)

  // salva seleção de campos visíveis
  useEffect(() => {
    if (!persistKey) return
    try {
      if (selectedFields && selectedFields.length) {
        localStorage.setItem(persistKey, JSON.stringify(selectedFields))
      }
    } catch {}
  }, [persistKey, selectedFields])

  // restaura seleção de campos visíveis
  useEffect(() => {
    if (!persistKey) return
    try {
      const raw = localStorage.getItem(persistKey)
      if (!raw) return
      const savedRaw = JSON.parse(raw) as string[]
      const allow = ["q", "telefone", "bairro", "cidadeId", "tipoObraId", "dateRange", "pageSize"] as const
      const saved: FieldId[] = Array.isArray(savedRaw)
        ? savedRaw.filter((id): id is FieldId => (allow as readonly string[]).includes(id))
        : []
      if (JSON.stringify(saved) !== JSON.stringify(selectedFields)) {
        onSelectedFieldsChange(saved)
      }
    } catch {}
  }, [])

  const fieldMap = useMemo(() => {
    const m = new Map<FieldId, AvailableField>()
    availableFields.forEach((f) => m.set(f.id, f as AvailableField))
    return m
  }, [availableFields])

  function set(patch: Partial<FilterState>) {
    onChange({ ...value, ...patch })
  }

  // evita o bug de UTC: "YYYY-MM-DD" -> Date local
  function ymdToLocalDate(ymd?: string) {
    if (!ymd) return undefined
    const [y, m, d] = ymd.split("-").map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1)
  }

  // formata para "YYYY-MM-DD" em horário local
  function toYMD(d?: Date) {
    if (!d) return undefined
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const fromDate = ymdToLocalDate(value.ini)
  const toDate = ymdToLocalDate(value.fim)

  const smooth: MotionProps = {
    initial: { opacity: 0, scale: 0.98, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Filtros</CardTitle>
          <CardDescription>Preencha os campos para refinar a lista de orçamentos.</CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {rightExtra}
          <Popover open={openEdit} onOpenChange={setOpenEdit}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar campos
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[300px] p-3 shadow-md">
              <p className="mb-2 text-sm font-medium text-marromEscuro">Selecionar campos visíveis</p>
              <div className="grid grid-cols-1 gap-2">
                {availableFields.map((f) => {
                  const checked = selectedFields.includes(f.id)
                  return (
                    <div key={f.id} className="rounded-md border p-2 transition-colors hover:bg-muted/40">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            const setIds = new Set(selectedFields)
                            if (setIds.has(f.id)) setIds.delete(f.id)
                            else setIds.add(f.id)
                            onSelectedFieldsChange(Array.from(setIds))
                          }}
                          className="h-5 w-5 data-[state=checked]:bg-bege data-[state=checked]:border-bege"
                        />
                        <span className="text-marromEscuro">{f.label}</span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="secondary"
            onClick={onClear}
            disabled={loading}
            className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Limpar filtros
          </Button>

          {onApply ? (
            <Button size="sm" onClick={onApply} disabled={loading}>
              Aplicar
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {selectedFields.map((id) => {
              const meta = fieldMap.get(id)
              if (!meta) return null

              if (meta.type === "text" && (id === "q" || id === "telefone" || id === "bairro")) {
                const val = id === "q" ? value.q ?? "" : id === "telefone" ? value.telefone ?? "" : value.bairro ?? ""
                const setVal =
                  id === "q"
                    ? (v: string) => set({ q: v })
                    : id === "telefone"
                      ? (v: string) => set({ telefone: v })
                      : (v: string) => set({ bairro: v })
                const width = id === "q" ? "w-[280px]" : "w-[200px]"
                const placeholder =
                  id === "q"
                    ? "Ex: João ou João_Cobertura_Messejana"
                    : id === "telefone"
                      ? "DDD ou parte do número"
                      : "Bairro"

                return (
                  <motion.div key={id} layout {...smooth} className={cn("flex flex-col gap-1", width)}>
                    <Label className="text-sm font-medium text-marromEscuro">{meta.label}</Label>
                    <Input className="h-9 w-full" value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} />
                  </motion.div>
                )
              }

              if (id === "cidadeId" && meta.type === "select") {
                const opts = (meta as any).options as Option[]
                return (
                  <motion.div key={id} layout {...smooth} className="flex flex-col gap-1 w-[220px]">
                    <Label className="text-sm font-medium text-marromEscuro">{meta.label}</Label>
                    <Select
                      value={value.cidadeId != null ? String(value.cidadeId) : "0"}
                      onValueChange={(v) => set({ cidadeId: v === "0" ? null : Number(v) })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="0">Todas</SelectItem>
                        {opts?.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )
              }

              if (id === "tipoObraId" && meta.type === "select") {
                const opts = (meta as any).options as Option[]
                return (
                  <motion.div key={id} layout {...smooth} className="flex flex-col gap-1 w-[220px]">
                    <Label className="text-sm font-medium text-marromEscuro">{meta.label}</Label>
                    <Select
                      value={value.tipoObraId != null ? String(value.tipoObraId) : "0"}
                      onValueChange={(v) => set({ tipoObraId: v === "0" ? null : Number(v) })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="0">Todos</SelectItem>
                        {opts?.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )
              }

              if (id === "pageSize" && meta.type === "select") {
                const opts = (meta as any).options as number[]
                return (
                  <motion.div key={id} layout {...smooth} className="flex flex-col gap-1 w-[96px]">
                    <Label className="text-sm font-medium text-marromEscuro">{meta.label}</Label>
                    <Select
                      value={value.pageSize ? String(value.pageSize) : ""}
                      onValueChange={(v) => set({ pageSize: (Number(v) as 5 | 10 | 20) || undefined })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        {opts?.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )
              }

              if (id === "dateRange" && meta.type === "dateRange") {
                return (
                  <motion.div key={id} layout {...smooth} className="flex flex-col gap-1 w-[260px]">
                    <Label className="text-sm font-medium text-marromEscuro">Período da última atualização</Label>
                    <SmartDateRangePicker
                      className="w-[240px]"
                      range={{ from: fromDate, to: toDate }}
                      onChange={(r) =>
                        set({
                          ini: toYMD(r?.from),
                          fim: toYMD(r?.to),
                        })
                      }
                    />
                  </motion.div>
                )
              }

              return null
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
