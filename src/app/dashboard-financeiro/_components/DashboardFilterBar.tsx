"use client"

import { useEffect, useState, useTransition } from "react"
import { endOfDay, format, startOfDay, startOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarIcon, ChevronDown, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { getRestartedRangeSelection, useResponsiveCalendarMonths } from "@/components/ui/calendar-range-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    getDatePickerCalendarPanelClass,
    getDatePickerChevronClass,
    getDatePickerFooterClass,
    getDatePickerPopoverClass,
    getDatePickerSidebarClass,
    getDatePickerSidebarTitleClass,
    getDatePickerSidebarValueClass,
    getDatePickerShortcutClass,
    getDatePickerTriggerClass,
    getDatePickerTriggerIconWrapClass,
} from "@/components/ui/date-picker-styles"
import { cn } from "@/lib/utils"
import {
    buildDashboardSearchParams,
    getDashboardShortcutOptions,
    resolveDashboardFilters,
} from "@/lib/financeiro-dashboard"
import type { DashboardAppliedFilters, DashboardPeriodPreset } from "@/types/financeiro"

interface DashboardFilterBarProps {
    filters: DashboardAppliedFilters
}

function parseDateRange(filters: DashboardAppliedFilters): DateRange {
    return {
        from: new Date(`${filters.period_start}T00:00:00`),
        to: new Date(`${filters.period_end}T00:00:00`),
    }
}

function formatRangeLabel(range: DateRange | undefined) {
    if (!range?.from) return "Selecione o período"
    if (!range.to) return format(range.from, "dd/MM/yyyy")
    return `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}`
}

export function DashboardFilterBar({ filters }: DashboardFilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => parseDateRange(filters))
    const [draftPreset, setDraftPreset] = useState<DashboardPeriodPreset>(filters.period_preset)
    const { months: calendarMonths, setCalendarPanelElement } = useResponsiveCalendarMonths()
    const shortcutOptions = getDashboardShortcutOptions()

    useEffect(() => {
        if (!open) {
            setDraftRange(parseDateRange(filters))
            setDraftPreset(filters.period_preset)
        }
    }, [filters, open])

    function navigate(nextFilters: DashboardAppliedFilters) {
        const nextSearch = buildDashboardSearchParams(nextFilters).toString()

        startTransition(() => {
            router.replace(`${pathname}?${nextSearch}`, { scroll: false })
        })
    }

    function handleApply() {
        if (!draftRange?.from || !draftRange.to) return

        if (draftPreset !== "custom") {
            navigate(
                resolveDashboardFilters({
                    period_preset: draftPreset,
                    account_ids: [],
                    analysis_status: filters.analysis_status,
                }),
            )
            setOpen(false)
            return
        }

        navigate(
            resolveDashboardFilters({
                period_preset: "custom",
                period_start: format(startOfDay(draftRange.from), "yyyy-MM-dd"),
                period_end: format(endOfDay(draftRange.to), "yyyy-MM-dd"),
                account_ids: [],
                analysis_status: filters.analysis_status,
            }),
        )
        setOpen(false)
    }

    function handleReset() {
        const nextRange: DateRange = {
            from: startOfMonth(new Date()),
            to: new Date(),
        }

        setDraftRange(nextRange)
        setDraftPreset("thisMonth")
    }

    function handleShortcutSelect(option: { key: DashboardPeriodPreset; range: DateRange }) {
        setDraftPreset(option.key)
        setDraftRange(option.range)
    }

    return (
        <div className={cn("w-full lg:w-auto", isPending && "opacity-70")}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="secondary"
                        className={cn(
                            getDatePickerTriggerClass("default"),
                            "md:w-[320px] lg:w-[340px]",
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className={getDatePickerTriggerIconWrapClass("default")}>
                                <CalendarIcon className="size-3.5" />
                            </span>
                            <span className="truncate">{formatRangeLabel(parseDateRange(filters))}</span>
                        </span>
                        <ChevronDown className={getDatePickerChevronClass(open)} />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="end"
                    sideOffset={10}
                    className={cn(getDatePickerPopoverClass("default"), "w-[min(calc(100vw-1.5rem),720px)]")}
                >
                    <div className="flex flex-col lg:flex-row">
                        <div className={cn(getDatePickerSidebarClass("default"), "lg:w-[210px]")}>
                            <div className="mb-3 space-y-1">
                                <p className={getDatePickerSidebarTitleClass("default")}>Período</p>
                                <p className={cn(getDatePickerSidebarValueClass("default"), "text-xs font-normal text-[#6F6556]")}>
                                    {formatRangeLabel(draftRange)}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                                {shortcutOptions.map((option) => {
                                    const isActive = draftPreset === option.key

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => handleShortcutSelect(option)}
                                            className={getDatePickerShortcutClass(isActive)}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div ref={setCalendarPanelElement} className="flex min-w-0 flex-1 flex-col p-3">
                            <div className={getDatePickerCalendarPanelClass("default")}>
                                <Calendar
                                    mode="range"
                                    numberOfMonths={calendarMonths}
                                    selected={draftRange}
                                    defaultMonth={draftRange?.from}
                                    onSelect={(nextRange, selectedDay) => {
                                        setDraftRange((currentRange) =>
                                            getRestartedRangeSelection(currentRange, nextRange || undefined, selectedDay),
                                        )
                                        setDraftPreset("custom")
                                    }}
                                    className="mx-auto"
                                    colorVariant="white-brown"
                                />
                            </div>

                            <div className={getDatePickerFooterClass("default")}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9 justify-center rounded-xl text-[#6F6556] hover:bg-[#F7F4ED] hover:text-[#2C201B] sm:justify-start"
                                    onClick={handleReset}
                                >
                                    <X className="mr-2 size-4" />
                                    Limpar
                                </Button>

                                <Button
                                    type="button"
                                    className="h-9 rounded-xl bg-[#2C201B] px-4 text-white hover:bg-[#1F1612]"
                                    onClick={handleApply}
                                    disabled={!draftRange?.from || !draftRange.to}
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
