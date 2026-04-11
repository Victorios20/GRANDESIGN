import { cn } from "@/lib/utils"

export const datePickerTriggerClass =
  "h-11 w-full cursor-pointer justify-between rounded-xl border border-[#D9D1C2] bg-[#FFFCF7] px-3.5 text-left text-sm font-medium text-[#2C201B] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#CBBEAA] hover:bg-white focus-visible:ring-[#8E7658]/18"

export const datePickerTriggerIconWrapClass =
  "flex shrink-0 items-center justify-center text-[#6F6556]"

export const datePickerPopoverClass =
  "rounded-2xl border border-[#D9D1C2] bg-[#FFFDF9] p-0 shadow-[0_24px_56px_rgba(44,32,27,0.16)]"

export const datePickerSidebarClass =
  "border-b border-[#E6DCCF] bg-[#F6F0E5] p-3.5 lg:border-b-0 lg:border-r"

export const datePickerSidebarTitleClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A6C58]"

export const datePickerSidebarValueClass = "text-sm font-medium text-[#2C201B]"

export const datePickerCalendarPanelClass =
  "overflow-x-auto rounded-xl border border-[#E8DED0] bg-white p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"

export const datePickerFooterClass =
  "mt-3 flex flex-col-reverse gap-2 border-t border-[#E6DCCF] pt-3 sm:flex-row sm:items-center sm:justify-between"

export function getDatePickerChevronClass(open: boolean) {
  return cn(
    "size-4 shrink-0 text-[#8A7F70] transition-transform duration-200",
    open && "rotate-180 text-[#2C201B]"
  )
}

export function getDatePickerShortcutClass(active: boolean) {
  return cn(
    "relative flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-all outline-none before:absolute before:bottom-1.5 before:left-1 before:top-1.5 before:w-0.5 before:rounded-full",
    active
      ? "bg-white font-medium text-[#2C201B] shadow-[0_1px_2px_rgba(16,24,40,0.05)] before:bg-[#8E6D47]"
      : "text-[#6F6556] before:bg-transparent hover:bg-white/80 hover:text-[#2C201B] focus-visible:bg-white/80 focus-visible:text-[#2C201B]"
  )
}
