import assert from "node:assert/strict"

import { buildSearchWhere } from "../src/actions/financeiro/shared/search"

assert.deepEqual(buildSearchWhere("madeira"), {
    OR: [{ descricao: { contains: "madeira", mode: "insensitive" } }],
})

assert.deepEqual(buildSearchWhere("482"), {
    OR: [{ descricao: { contains: "482", mode: "insensitive" } }, { id: 482 }],
})

assert.deepEqual(buildSearchWhere("#482"), {
    OR: [{ descricao: { contains: "#482", mode: "insensitive" } }, { id: 482 }],
})

assert.deepEqual(buildSearchWhere("48.2"), {
    OR: [{ descricao: { contains: "48.2", mode: "insensitive" } }],
})

console.log("search filter rules: ok")
