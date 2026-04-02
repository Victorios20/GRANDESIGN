const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_ONLY_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/

function toDateOnlyStringUtc(value: Date) {
  const year = String(value.getUTCFullYear())
  const month = String(value.getUTCMonth() + 1).padStart(2, "0")
  const day = String(value.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toDateOnlyStringLocal(value: Date) {
  const year = String(value.getFullYear())
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function fromDateOnlyDb(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? toDateOnlyStringUtc(value) : null
  }

  const normalized = String(value).trim()
  if (!normalized) return null

  const exactMatch = normalized.match(DATE_ONLY_RE)
  if (exactMatch) {
    return `${exactMatch[1]}-${exactMatch[2]}-${exactMatch[3]}`
  }

  const prefixMatch = normalized.match(DATE_ONLY_PREFIX_RE)
  if (prefixMatch) {
    return `${prefixMatch[1]}-${prefixMatch[2]}-${prefixMatch[3]}`
  }

  const parsed = new Date(normalized)
  if (!Number.isFinite(parsed.getTime())) return null
  return toDateOnlyStringUtc(parsed)
}

export function parseDateOnlyInput(value: string | Date | null | undefined): Date | null {
  const ymd = fromDateOnlyDb(value)
  if (!ymd) return null

  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

export function toDateOnlyValue(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? toDateOnlyStringLocal(value) : null
  }

  return fromDateOnlyDb(value)
}

export function getTodayDateOnly(): string {
  return toDateOnlyStringLocal(new Date())
}

export function shiftDateOnly(value: string, days: number): string {
  const date = parseDateOnlyInput(value)
  if (!date) {
    throw new Error(`Invalid date-only value: ${value}`)
  }

  date.setUTCDate(date.getUTCDate() + days)
  return toDateOnlyStringUtc(date)
}

export function addDaysToDateOnly(value: string, days = 1): string {
  return shiftDateOnly(value, days)
}

export function subtractDaysFromDateOnly(value: string, days = 1): string {
  return shiftDateOnly(value, -days)
}

export function formatDateOnlyPtBr(value: string | Date | null | undefined): string {
  const ymd = fromDateOnlyDb(value)
  if (!ymd) return "-"

  const [year, month, day] = ymd.split("-")
  return `${day}/${month}/${year}`
}

export function formatDateOnlyLongPtBr(value: string | Date | null | undefined): string {
  const date = parseDateOnlyInput(value)
  if (!date) return "-"

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
