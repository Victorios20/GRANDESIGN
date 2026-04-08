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
import { CalendarIcon, ChevronDown, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { Label } from "./label"
import { Checkbox } from "./checkbox"
import {
  datePickerCalendarPanelClass,
  datePickerFooterClass,
  datePickerPopoverClass,
  datePickerSidebarClass,
  datePickerSidebarTitleClass,
  datePickerSidebarValueClass,
  datePickerTriggerClass,
  datePickerTriggerIconWrapClass,
  getDatePickerChevronClass,
  getDatePickerShortcutClass,
} from "./date-picker-styles"

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

function isSameRange(a: DateRange | undefined, b: DateRange | undefined) {
  if (!a?.from || !a?.to || !b?.from || !b?.to) return false
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to)
}

interface Props {
  range?: DateRange
  onChange: (range: DateRange | undefined) => void
  className?: string
}

export function SmartDateRangePicker({ range, onChange, className }: Props) {
  const [open, setOpen] = React.useState(false)
  const [months, setMonths] = React.useState(1)
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

  React.useEffect(() => {
    if (!range?.from || !range?.to) {
      setSingleDay(false)
      return
    }

    setSingleDay(isSameDay(range.from, range.to))
  }, [range])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const media = window.matchMedia("(min-width: 768px)")
    const sync = () => setMonths(media.matches ? 2 : 1)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="secondary"
          className={cn(
            datePickerTriggerClass,
            "w-[250px]",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={datePickerTriggerIconWrapClass}>
              <CalendarIcon className="size-3.5" />
            </span>
            <span className={cn("truncate", !range?.from && "text-[#8A7F70]")}>
              {triggerLabel}
            </span>
          </span>
          <ChevronDown className={getDatePickerChevronClass(open)} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className={cn(datePickerPopoverClass, "w-[min(calc(100vw-1.5rem),760px)]")}
      >
        <div className="flex flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className={cn(datePickerSidebarClass, "min-w-[220px]")}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className={datePickerSidebarTitleClass}>Atalhos</p>
                <p className={cn(datePickerSidebarValueClass, "text-xs font-normal text-[#6F6556]")}>
                  {triggerLabel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg border border-transparent text-[#7B705F] shadow-none hover:border-[#DDD3C4] hover:bg-white"
                onClick={() => onChange(undefined)}
                title="Limpar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-1">
              {presets.map((preset) => {
                const presetRange = preset.getRange()
                const isActive = isSameRange(range, presetRange)

                return (
                  <button
                    key={preset.key}
                    type="button"
                    className={getDatePickerShortcutClass(isActive)}
                    onClick={() => {
                      onChange(presetRange)
                      setSingleDay(
                        !!(
                          presetRange.from &&
                          presetRange.to &&
                          isSameDay(presetRange.from, presetRange.to)
                        )
                      )
                    }}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-[#E7DED1] pt-3">
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

          <div className="flex min-w-0 flex-1 flex-col p-3">
            <div className={datePickerCalendarPanelClass}>
              {singleDay ? (
                <Calendar
                  key="single"
                  initialFocus
                  mode="single"
                  numberOfMonths={months}
                  selected={range?.from}
                  onSelect={(date) => onChange(date ? { from: date, to: date } : undefined)}
                  className="mx-auto"
                />
              ) : (
                <Calendar
                  key="range"
                  initialFocus
                  mode="range"
                  numberOfMonths={months}
                  selected={range}
                  onSelect={(nextRange) => {
                    if (nextRange?.from && !nextRange?.to) {
                      onChange({ from: nextRange.from, to: nextRange.from })
                      return
                    }

                    onChange(nextRange || undefined)
                  }}
                  className="mx-auto"
                />
              )}
            </div>

            <div className={datePickerFooterClass}>
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
