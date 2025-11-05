//smartdate
"use client"

import * as React from "react"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { Label } from "./label"
import { Checkbox } from "./checkbox"

type Preset = {
  key: string
  label: string
  getRange: () => DateRange
}

const presets: Preset[] = [
  {
    key: "today",
    label: "Hoje",
    getRange: () => {
      const d = new Date()
      return { from: d, to: d }
    },
  },
  {
    key: "yesterday",
    label: "Ontem",
    getRange: () => {
      const d = subDays(new Date(), 1)
      return { from: d, to: d }
    },
  },
  {
    key: "last7",
    label: "Últimos 7 dias",
    getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    key: "last30",
    label: "Últimos 30 dias",
    getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    key: "thisMonth",
    label: "Este mês",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    key: "lastMonth",
    label: "Mês passado",
    getRange: () => {
      const last = subMonths(new Date(), 1)
      return { from: startOfMonth(last), to: endOfMonth(last) }
    },
  },
  {
    key: "thisYear",
    label: "Este ano",
    getRange: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
]

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface Props {
  range?: DateRange
  onChange: (range: DateRange | undefined) => void
  className?: string
}

export function SmartDateRangePicker({ range, onChange, className }: Props) {
  const [open, setOpen] = React.useState(false)
  const [singleDay, setSingleDay] = React.useState<boolean>(() => {
    if (!range?.from || !range?.to) return false
    return isSameDay(range.from, range.to)
  })

  const triggerLabel = range?.from
    ? range?.to
      ? isSameDay(range.from, range.to)
        ? format(range.from, "dd/MM/yyyy")
        : `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`
      : format(range.from, "dd/MM/yyyy")
    : "Selecione o período"

  const months =
    typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="secondary"
          className={cn(
            "justify-start text-left font-normal h-9 px-3 w-[240px]",
            !range?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col md:flex-row">
          {/* Presets */}
          <div className="p-3 border-b md:border-b-0 md:border-r min-w-[220px]">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Atalhos</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onChange(undefined)}
                title="Limpar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-1">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  variant="ghost"
                  className="justify-start h-8"
                  onClick={() => {
                    const r = p.getRange()
                    onChange(r)
                    setSingleDay(
                      !!(r.from && r.to && isSameDay(r.from, r.to))
                    )
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Checkbox
                id="single-day"
                checked={singleDay}
                onCheckedChange={(v) => setSingleDay(Boolean(v))}
              />
              <Label htmlFor="single-day" className="text-sm">
                Apenas 1 dia
              </Label>
            </div>
          </div>

          {/* Calendário: render separado por modo para não quebrar o TS */}
          <div className="p-3">
            {singleDay ? (
              <Calendar
                key="single"
                initialFocus
                mode="single"
                numberOfMonths={months}
                selected={range?.from}
                onSelect={(d) => onChange(d ? { from: d, to: d } : undefined)}
              />
            ) : (
              <Calendar
                key="range"
                initialFocus
                mode="range"
                numberOfMonths={months}
                selected={range}
                onSelect={(r) => {
                  if (r?.from && !r?.to) {
                    onChange({ from: r.from, to: r.from })
                  } else {
                    onChange(r || undefined)
                  }
                }}
              />
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => onChange(undefined)}>
                Limpar
              </Button>
              <Button
                onClick={() => setOpen(false)}
                disabled={!range?.from || !range?.to}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
