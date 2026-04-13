import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { getRestartedRangeSelection } from "./calendar-range-utils"
import { DateRange } from "react-day-picker"
import {
  getDatePickerCalendarPanelClass,
  getDatePickerChevronClass,
  getDatePickerPopoverClass,
  getDatePickerTriggerClass,
  getDatePickerTriggerIconWrapClass,
} from "./date-picker-styles"

interface Props {
  range: DateRange
  onChange: (range: DateRange | undefined) => void
  className?: string
  compact?: boolean
}

export function DateRangePicker({ range, onChange, className, compact }: Props) {
  const [open, setOpen] = React.useState(false)

  const triggerLabel = range?.from
    ? range.to
      ? `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`
      : format(range.from, "dd/MM/yyyy")
    : "Selecione o intervalo"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="secondary"
          className={cn(
            getDatePickerTriggerClass("default"),
            compact ? "h-10 w-[220px]" : "w-[240px]",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={getDatePickerTriggerIconWrapClass("default")}>
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
        className={cn(getDatePickerPopoverClass("default"), "w-auto max-w-[calc(100vw-1.5rem)] p-2.5")}
        align="start"
      >
        <div className={getDatePickerCalendarPanelClass("default")}>
          <Calendar
            initialFocus
            mode="range"
            selected={range}
            onSelect={(nextRange, selectedDay) =>
              onChange(getRestartedRangeSelection(range, nextRange || undefined, selectedDay))
            }
            numberOfMonths={1}
            className="mx-auto"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
