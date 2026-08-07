import assert from "node:assert/strict"

import {
    formatDateOnlyPtBr,
    fromDateOnlyDb,
    getTodayDateOnly,
    getTodayDateOnlyDate,
    parseDateOnlyInput,
    shiftDateOnly,
} from "../src/lib/date-only"

const today = getTodayDateOnlyDate()
assert.equal(today.getUTCHours(), 12, "dia de hoje deve ser meio-dia UTC")
assert.equal(fromDateOnlyDb(today), getTodayDateOnly(), "round-trip do dia de hoje")

assert.equal(parseDateOnlyInput("2026-07-29")!.toISOString(), "2026-07-29T12:00:00.000Z")
assert.equal(fromDateOnlyDb(new Date(Date.UTC(2026, 6, 29, 23, 59))), "2026-07-29")
assert.equal(shiftDateOnly("2026-07-31", 1), "2026-08-01")
assert.equal(formatDateOnlyPtBr("2026-07-29"), "29/07/2026")

console.log("date-only rules: ok")
