"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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

function getPresetButtonClass(active: boolean) {
    return active
        ? "border-[#2c201b] bg-[#2c201b] text-[#FAF3E0] hover:bg-[#231a15]"
        : "border-[rgba(44,32,27,0.12)] bg-white text-[#2c201b] hover:bg-[rgba(44,32,27,0.05)]"
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
                Periodo
            </Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "h-11 w-full justify-between rounded-lg border-[#2c201b] bg-transparent px-3 text-left font-normal text-[#2c201b] hover:bg-[rgba(44,32,27,0.05)] md:w-[320px]",
                            disabled && "opacity-60",
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <CalendarDays className="h-4 w-4 shrink-0 text-[#393316]" />
                            <span className="truncate">{triggerLabel}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-xs text-[rgba(44,32,27,0.62)]">
                            {selection.label}
                        </span>
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    className="w-[min(92vw,760px)] rounded-2xl border-[rgba(44,32,27,0.10)] bg-[#FAF3E0] p-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                    <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="border-b border-[rgba(44,32,27,0.10)] p-4 lg:border-b-0 lg:border-r">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(44,32,27,0.58)]">
                                Presets
                            </p>

                            <div className="mt-3 grid gap-2">
                                {CASH_FLOW_PERIOD_OPTIONS.map((option) => (
                                    <Button
                                        key={option.key}
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "justify-start rounded-lg px-3 text-sm font-medium",
                                            getPresetButtonClass(selection.key === option.key),
                                        )}
                                        onClick={() => handlePresetClick(option.key)}
                                    >
                                        {option.label}
                                    </Button>
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

                            <div className="mt-4 overflow-auto rounded-xl border border-[rgba(44,32,27,0.10)] bg-white p-2">
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

                            <div className="mt-4 flex flex-col gap-3 border-t border-[rgba(44,32,27,0.10)] pt-4 md:flex-row md:items-center md:justify-between">
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
