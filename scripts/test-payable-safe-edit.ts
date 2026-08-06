import assert from "node:assert/strict"

import { assertLockedEditIsSafe } from "../src/actions/financeiro/payables/update"

const current = {
    valor_total: 3250,
    data_emissao: new Date("2026-07-01T12:00:00.000Z"),
    data_vencimento: new Date("2026-07-20T12:00:00.000Z"),
}

// campos seguros mudando: passa
assert.doesNotThrow(() =>
    assertLockedEditIsSafe(
        { valor: 3250, data_emissao: new Date("2026-07-01T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

// valor mudou: bloqueia
assert.throws(() =>
    assertLockedEditIsSafe(
        { valor: 3000, data_emissao: new Date("2026-07-01T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

// data_emissao mudou: bloqueia
assert.throws(() =>
    assertLockedEditIsSafe(
        { valor: 3250, data_emissao: new Date("2026-07-02T12:00:00.000Z"), data_vencimento: new Date("2026-07-20T12:00:00.000Z") },
        current,
    ),
)

// data_vencimento mudou: bloqueia
assert.throws(() =>
    assertLockedEditIsSafe(
        { valor: 3250, data_emissao: new Date("2026-07-01T12:00:00.000Z"), data_vencimento: new Date("2026-07-21T12:00:00.000Z") },
        current,
    ),
)

console.log("payable safe edit rules: ok")
