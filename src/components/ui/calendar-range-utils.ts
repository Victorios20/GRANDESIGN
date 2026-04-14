import * as React from "react"
import type { DateRange } from "react-day-picker"

const TWO_MONTH_MIN_WIDTH = 640

export function getRestartedRangeSelection(
  currentRange: DateRange | undefined,
  nextRange: DateRange | undefined,
  selectedDay: Date | undefined
) {
  if (selectedDay && currentRange?.from && currentRange?.to) {
    return { from: selectedDay, to: undefined }
  }

  return nextRange ?? undefined
}

export function useResponsiveCalendarMonths(minWidth = TWO_MONTH_MIN_WIDTH) {
  const [months, setMonths] = React.useState(1)
  const [element, setElement] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!element) return

    const updateMonths = (width: number) => {
      setMonths(width >= minWidth ? 2 : 1)
    }

    updateMonths(element.getBoundingClientRect().width)

    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? element.getBoundingClientRect().width
      updateMonths(width)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [element, minWidth])

  return { months, setCalendarPanelElement: setElement }
}
