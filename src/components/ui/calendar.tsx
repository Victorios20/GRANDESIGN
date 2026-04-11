"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// mesmas variantes do ComboboxAdd
type ColorVariant = "white-brown" | "gray-green" | "gray-brown" | "white-green"

// classes utilitárias por variante (nav buttons e textos)
const variantToBtnClasses: Record<ColorVariant, string> = {
  "white-brown":
    "bg-white text-marromEscuro border-marromEscuro/30 hover:bg-marromEscuro/5",
  "gray-green":
    "bg-cinza text-green border-green/30 hover:bg-green/5",
  "gray-brown":
    "bg-cinza text-marromEscuro border-marromEscuro/30 hover:bg-marromEscuro/5",
  "white-green":
    "bg-white text-green border-green/30 hover:bg-green/5",
}

const variantToCaptionClasses: Record<ColorVariant, string> = {
  "white-brown": "text-marromEscuro",
  "gray-green": "text-green",
  "gray-brown": "text-marromEscuro",
  "white-green": "text-green",
}

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Variante de cor (default: "white-brown"). */
  colorVariant?: ColorVariant
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  colorVariant = "white-brown",
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row sm:gap-3",
        month: "flex flex-col gap-4",
        caption: "relative flex h-9 items-center justify-center px-9",
        caption_label: cn(
          "truncate text-sm font-semibold tracking-[0.01em]",
          variantToCaptionClasses[colorVariant]
        ),
        nav: "absolute inset-0 flex items-center justify-between",
        nav_button: cn(
          "inline-flex size-7 items-center justify-center rounded-full border border-[#ddd7cc] bg-white p-0 text-[#6f6556] shadow-none transition-colors hover:bg-[#f7f4ed] hover:text-[#2c201b] disabled:pointer-events-none disabled:opacity-40",
          variantToBtnClasses[colorVariant]
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
