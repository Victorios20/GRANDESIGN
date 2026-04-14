"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

type ColorVariant = "white-brown" | "gray-green" | "gray-brown" | "white-green"
type CalendarAppearance = "default" | "operational"

const variantToNavClasses: Record<ColorVariant, string> = {
  "white-brown": "text-[#6f6556]",
  "gray-green": "text-green",
  "gray-brown": "text-marromEscuro",
  "white-green": "text-green",
}

const variantToCaptionClasses: Record<ColorVariant, string> = {
  "white-brown": "text-[#8b623e]",
  "gray-green": "text-green",
  "gray-brown": "text-marromEscuro",
  "white-green": "text-green",
}

const appearanceToClasses: Record<
  CalendarAppearance,
  {
    months: string
    month: string
    caption: string
    navButton: string
    headCell: string
    row: string
    cellBase: string
    cellRange: string
    cellSingle: string
    day: string
    selected: string
    today: string
    outside: string
    disabled: string
    rangeMiddle: string
  }
> = {
  default: {
    months: "mx-auto flex w-fit flex-col gap-4 md:flex-row md:items-start md:gap-6",
    month: "w-fit shrink-0 space-y-4",
    caption: "relative flex h-10 items-center justify-center px-10",
    navButton:
      "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-[#ddd7cc] bg-white p-0 shadow-none transition-colors hover:bg-[#f7f4ed] hover:text-[#2c201b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393316]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-35",
    headCell: "h-8 w-9 rounded-md text-[11px] font-medium tracking-[0.01em] text-[#8a7d69]",
    row: "mt-1.5 flex",
    cellBase: "relative h-9 w-9 p-0 text-center text-sm align-middle",
    cellRange:
      "[&:has(.day-range-middle)]:bg-[#f1e6d3] [&:has(.day-range-start)]:bg-[#f1e6d3] [&:has(.day-range-end)]:bg-[#f1e6d3] [&:has(.day-range-start)]:rounded-l-lg [&:has(.day-range-end)]:rounded-r-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
    cellSingle: "[&:has(.day-selected)]:rounded-md",
    day: "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium text-[#8b623e] transition-colors hover:bg-[#f6efe1] hover:text-[#2c201b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8e7658]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white aria-selected:opacity-100",
    selected:
      "bg-[#5a4920] text-[#fffaf0] hover:bg-[#4d3f1b] hover:text-[#fffaf0] focus:bg-[#4d3f1b] focus:text-[#fffaf0]",
    today: "border border-[#d8c8af] bg-[#fbf7ee] text-[#2c201b]",
    outside: "text-[#c0b3a1] opacity-70 aria-selected:text-[#9c907d]",
    disabled: "text-[#c9bead] opacity-45",
    rangeMiddle:
      "day-range-middle rounded-none bg-transparent text-[#5a4b36] aria-selected:!bg-transparent aria-selected:!text-[#5a4b36] hover:bg-transparent hover:text-[#2c201b] focus:bg-transparent focus:text-[#2c201b]",
  },
  operational: {
    months: "mx-auto flex w-fit flex-col gap-4 md:flex-row md:items-start md:gap-6",
    month: "w-fit shrink-0 space-y-4",
    caption: "relative flex h-10 items-center justify-center px-10",
    navButton:
      "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-[#ddd7cc] bg-white p-0 shadow-none transition-colors hover:bg-[#f4efe4] hover:text-[#2c201b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393316]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfbf8] disabled:pointer-events-none disabled:opacity-35",
    headCell: "h-8 w-9 rounded-md text-[11px] font-medium tracking-[0.01em] text-[#8a7d69]",
    row: "mt-1.5 flex",
    cellBase: "relative h-9 w-9 p-0 text-center text-sm align-middle",
    cellRange:
      "[&:has(.day-range-middle)]:bg-[#efe3ce] [&:has(.day-range-start)]:bg-[#efe3ce] [&:has(.day-range-end)]:bg-[#efe3ce] [&:has(.day-range-start)]:rounded-l-lg [&:has(.day-range-end)]:rounded-r-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
    cellSingle: "[&:has(.day-selected)]:rounded-md",
    day: "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium text-[#8b623e] transition-colors hover:bg-[#f4eee2] hover:text-[#2c201b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393316]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfbf8] aria-selected:opacity-100",
    selected:
      "bg-[#5a4920] text-[#fffaf0] shadow-none hover:bg-[#4d3f1b] hover:text-[#fffaf0] focus:bg-[#4d3f1b] focus:text-[#fffaf0]",
    today: "border border-[#c9bea4] bg-[#f8f4eb] text-[#2c201b]",
    outside: "text-[#b7ab98] opacity-75 aria-selected:text-[#8f826e]",
    disabled: "text-[#c8bcab] opacity-45",
    rangeMiddle:
      "day-range-middle rounded-none bg-transparent text-[#54462f] aria-selected:!bg-transparent aria-selected:!text-[#54462f] hover:bg-transparent hover:text-[#2c201b] focus:bg-transparent focus:text-[#2c201b]",
  },
}

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  colorVariant?: ColorVariant
  appearance?: CalendarAppearance
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  colorVariant = "white-brown",
  appearance = "default",
  ...props
}: CalendarProps) {
  const appearanceClasses = appearanceToClasses[appearance]

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2.5 md:p-3", className)}
      classNames={{
        months: appearanceClasses.months,
        month: appearanceClasses.month,
        caption: appearanceClasses.caption,
        caption_label: cn(
          "truncate text-sm font-semibold tracking-[0.01em]",
          variantToCaptionClasses[colorVariant]
        ),
        nav: "pointer-events-none absolute inset-0 flex items-center justify-between",
        nav_button: cn(appearanceClasses.navButton, variantToNavClasses[colorVariant]),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-fit border-collapse",
        head_row: "flex",
        head_cell: appearanceClasses.headCell,
        row: appearanceClasses.row,
        cell: cn(
          appearanceClasses.cellBase,
          props.mode === "range" ? appearanceClasses.cellRange : appearanceClasses.cellSingle
        ),
        day: appearanceClasses.day,
        day_range_start: cn("day-range-start", appearanceClasses.selected),
        day_range_end: cn("day-range-end", appearanceClasses.selected),
        day_selected: cn("day-selected", appearanceClasses.selected),
        day_today: appearanceClasses.today,
        day_outside: cn("day-outside", appearanceClasses.outside),
        day_disabled: appearanceClasses.disabled,
        day_range_middle: appearanceClasses.rangeMiddle,
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...iconProps }) => (
          <ChevronLeft className={cn("size-4", className)} {...iconProps} />
        ),
        IconRight: ({ className, ...iconProps }) => (
          <ChevronRight className={cn("size-4", className)} {...iconProps} />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
