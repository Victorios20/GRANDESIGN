import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { DateRange } from "react-day-picker"

interface Props {
  range: DateRange
  onChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ range, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="secondary"
          className={cn(
            "w-full justify-start text-left font-normal",
            !range.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {range.from ? (
            range.to ? (
              <>
                {format(range.from, "dd/MM/yyyy")} - {format(range.to, "dd/MM/yyyy")}
              </>
            ) : (
              format(range.from, "dd/MM/yyyy")
            )
          ) : (
            <span>Selecione o intervalo</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          selected={range}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
