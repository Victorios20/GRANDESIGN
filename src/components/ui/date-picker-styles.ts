import { cn } from "@/lib/utils"

export type DatePickerVariant = "default" | "operational"

const datePickerVariants = {
  default: {
    trigger:
      "h-11 w-full cursor-pointer justify-between rounded-xl border border-[#D9D1C2] bg-[#FFFCF7] px-3.5 text-left text-sm font-medium text-[#2C201B] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#CBBEAA] hover:bg-white focus-visible:ring-[#8E7658]/18",
    triggerIconWrap: "flex shrink-0 items-center justify-center text-[#6F6556]",
    popover:
      "rounded-2xl border border-[#D9D1C2] bg-[#FFFDF9] p-0 shadow-[0_24px_56px_rgba(44,32,27,0.16)]",
    sidebar:
      "border-b border-[#E6DCCF] bg-[#F6F0E5] p-3.5 lg:border-b-0 lg:border-r",
    sidebarTitle:
      "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A6C58]",
    sidebarValue: "text-sm font-medium text-[#2C201B]",
    calendarPanel:
      "overflow-x-auto md:overflow-x-hidden rounded-xl border border-[#E8DED0] bg-white p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    footer:
      "mt-3 flex flex-col-reverse gap-2 border-t border-[#E6DCCF] pt-3 sm:flex-row sm:items-center sm:justify-between",
    clearButton:
      "h-8 w-8 rounded-lg border border-transparent text-[#7B705F] shadow-none hover:border-[#DDD3C4] hover:bg-white",
    singleDayRow: "mt-4 flex items-center gap-2 border-t border-[#E7DED1] pt-3",
    singleDayLabel: "text-sm",
    chevronBase: "size-4 shrink-0 text-[#8A7F70] transition-transform duration-200",
    chevronOpen: "rotate-180 text-[#2C201B]",
    shortcutBase:
      "relative flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-all outline-none before:absolute before:bottom-1.5 before:left-1 before:top-1.5 before:w-0.5 before:rounded-full",
    shortcutActive:
      "bg-white font-medium text-[#2C201B] shadow-[0_1px_2px_rgba(16,24,40,0.05)] before:bg-[#8E6D47]",
    shortcutIdle:
      "text-[#6F6556] before:bg-transparent hover:bg-white/80 hover:text-[#2C201B] focus-visible:bg-white/80 focus-visible:text-[#2C201B]",
  },
  operational: {
    trigger:
      "h-10 w-full cursor-pointer justify-between rounded-lg border border-[#d9d3c8] bg-white px-3 text-left text-sm font-medium text-[#2c201b] shadow-none hover:border-[#c9bea4] hover:bg-[#fcfaf6] focus-visible:ring-[#393316]/15",
    triggerIconWrap: "flex shrink-0 items-center justify-center text-[#6f6556]",
    popover:
      "rounded-2xl border border-[#e8e1d6] bg-white p-0 shadow-[0_18px_40px_rgba(44,32,27,0.12)]",
    sidebar:
      "border-b border-[#ece6db] bg-[#faf8f3] p-3.5 lg:border-b-0 lg:border-r",
    sidebarTitle:
      "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]",
    sidebarValue: "text-sm font-medium text-[#2c201b]",
    calendarPanel:
      "overflow-x-auto md:overflow-x-hidden rounded-xl border border-[#ece6db] bg-[#fcfbf8] p-2.5 shadow-none",
    footer:
      "mt-3 flex flex-col-reverse gap-2 border-t border-[#ece6db] pt-3 sm:flex-row sm:items-center sm:justify-between",
    clearButton:
      "h-8 w-8 rounded-lg border border-transparent text-[#7b705f] shadow-none hover:border-[#ddd7cc] hover:bg-[#f4efe4] hover:text-[#2c201b]",
    singleDayRow: "mt-4 flex items-center gap-2 border-t border-[#ece6db] pt-3",
    singleDayLabel: "text-sm text-[#2c201b]",
    chevronBase: "size-4 shrink-0 text-[#8a7d69] transition-transform duration-200",
    chevronOpen: "rotate-180 text-[#2c201b]",
    shortcutBase:
      "relative flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors outline-none before:absolute before:bottom-1.5 before:left-1 before:top-1.5 before:w-0.5 before:rounded-full",
    shortcutActive:
      "bg-white font-medium text-[#2c201b] shadow-[0_1px_2px_rgba(16,24,40,0.04)] before:bg-[#393316]",
    shortcutIdle:
      "text-[#6f6556] before:bg-transparent hover:bg-white hover:text-[#2c201b] focus-visible:bg-white focus-visible:text-[#2c201b]",
  },
} satisfies Record<DatePickerVariant, Record<string, string>>

export function getDatePickerTriggerClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].trigger
}

export function getDatePickerTriggerIconWrapClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].triggerIconWrap
}

export function getDatePickerPopoverClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].popover
}

export function getDatePickerSidebarClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].sidebar
}

export function getDatePickerSidebarTitleClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].sidebarTitle
}

export function getDatePickerSidebarValueClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].sidebarValue
}

export function getDatePickerCalendarPanelClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].calendarPanel
}

export function getDatePickerFooterClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].footer
}

export function getDatePickerClearButtonClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].clearButton
}

export function getDatePickerSingleDayRowClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].singleDayRow
}

export function getDatePickerSingleDayLabelClass(variant: DatePickerVariant) {
  return datePickerVariants[variant].singleDayLabel
}

export function getDatePickerChevronClass(open: boolean, variant: DatePickerVariant = "default") {
  return cn(datePickerVariants[variant].chevronBase, open && datePickerVariants[variant].chevronOpen)
}

export function getDatePickerShortcutClass(active: boolean, variant: DatePickerVariant = "default") {
  return cn(
    datePickerVariants[variant].shortcutBase,
    active ? datePickerVariants[variant].shortcutActive : datePickerVariants[variant].shortcutIdle
  )
}
