"use client"

import * as React from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
} from "@/components/ui/date-picker-styles"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
    CASH_FLOW_PERIOD_OPTIONS,
    type CashFlowPeriodSelection,
    type CashFlowPresetKey,
    buildCashFlowCustomSelection,
    buildCashFlowPresetRange,
    buildCashFlowSelectionFromPreset,
    formatCashFlowRangeLabel,
} from "./cash-flow-view-model"

type Props = {
    selection: CashFlowPeriodSelection
    range: DateRange | undefined
    disabled?: boolean
    onApplySelection: (selection: CashFlowPeriodSelection, range: DateRange | undefined) => void
}

export function CashFlowPeriodControl({
    selection,
    range,
    disabled,
    onApplySelection,
}: Props) {
    const [open, setOpen] = React.useState(false)
    const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(range)
    const [months, setMonths] = React.useState(2)

    React.useEffect(() => {
        setDraftRange(range)
    }, [range])

    React.useEffect(() => {
        const syncMonths = () => setMonths(window.innerWidth >= 1024 ? 2 : 1)

        syncMonths()
        window.addEventListener("resize", syncMonths)

        return () => window.removeEventListener("resize", syncMonths)
    }, [])

    const triggerLabel = formatCashFlowRangeLabel(range)

    function handlePresetClick(key: Exclude<CashFlowPresetKey, "custom">) {
        const nextSelection = buildCashFlowSelectionFromPreset(key)
        const nextRange = buildCashFlowPresetRange(key)

        setDraftRange(nextRange)
        onApplySelection(nextSelection, nextRange)
        setOpen(false)
    }

    function handleApplyCustomRange() {
        if (!draftRange?.from) {
            return
        }

        const normalizedRange = {
            from: draftRange.from,
            to: draftRange.to ?? draftRange.from,
        }

        onApplySelection(buildCashFlowCustomSelection(normalizedRange), normalizedRange)
        setOpen(false)
    }

    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.62)]">
                Período
            </Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            datePickerTriggerClass,
                            "md:w-[320px]",
                            disabled && "opacity-60",
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className={datePickerTriggerIconWrapClass}>
                                <CalendarDays className="size-3.5 text-[#393316]" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
                        </span>
                        <span className="ml-3 flex shrink-0 items-center gap-2">
                            <span className="hidden text-xs text-[rgba(44,32,27,0.62)] md:inline">
                                {selection.label}
                            </span>
                            <ChevronDown className={getDatePickerChevronClass(open)} />
                        </span>
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={10}
                    className={cn(datePickerPopoverClass, "w-[min(92vw,760px)]")}
                >
                    <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className={cn(datePickerSidebarClass, "p-4")}>
                            <p className={datePickerSidebarTitleClass}>
                                Presets
                            </p>
                            <p className={cn(datePickerSidebarValueClass, "mt-1 text-xs font-normal text-[#6F6556]")}>
                                {selection.label}
                            </p>

                            <div className="mt-3 grid gap-2">
                                {CASH_FLOW_PERIOD_OPTIONS.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        className={getDatePickerShortcutClass(selection.key === option.key)}
                                        onClick={() => handlePresetClick(option.key)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                        Intervalo manual
                                    </p>
                                    <p className="mt-1 text-sm text-[rgba(44,32,27,0.72)]">
                                        Selecione data inicial e final para recalcular toda a projeção.
                                    </p>
                                </div>
                            </div>

                            <div className={cn(datePickerCalendarPanelClass, "mt-4")}>
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    numberOfMonths={months}
                                    selected={draftRange}
                                    onSelect={(nextRange) =>
                                        setDraftRange(
                                            nextRange?.from
                                                ? {
                                                      from: nextRange.from,
                                                      to: nextRange.to ?? nextRange.from,
                                                  }
                                                : undefined,
                                        )
                                    }
                                />
                            </div>

                            <div className={cn(datePickerFooterClass, "mt-4 pt-4")}>
                                <div className="text-sm text-[rgba(44,32,27,0.72)]">
                                    {formatCashFlowRangeLabel(draftRange)}
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-[#2c201b] text-[#2c201b] hover:bg-[rgba(44,32,27,0.05)]"
                                        onClick={() => {
                                            setDraftRange(range)
                                            setOpen(false)
                                        }}
                                    >
                                        Fechar
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-[#2c201b] text-[#FAF3E0] hover:bg-[#231a15]"
                                        disabled={!draftRange?.from}
                                        onClick={handleApplyCustomRange}
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
