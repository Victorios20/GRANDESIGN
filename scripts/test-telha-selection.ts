import assert from "node:assert/strict"

import {
    custoTelha,
    linhasProposta,
    marcarMaisBaratas,
    selecionarFornecedor,
} from "../src/lib/orcamento/telha-selection"

const rows = [
    { nome: "Americana", fornecedorId: 1, fornecedorNome: "São Bento", quantidade: 370, preco: 2.1, frete: 100 },
    { nome: "Americana", fornecedorId: 2, fornecedorNome: "Telhas Norte", quantidade: 370, preco: 2.45, frete: 0 },
    { nome: "Colonial", fornecedorId: 1, fornecedorNome: "São Bento", quantidade: 1000, preco: 1.8 },
    { nome: "Maxxi", fornecedorId: null, quantidade: 250, preco: 4.0 },
]

assert.equal(custoTelha(rows[0]), 370 * 2.1 + 100)
assert.equal(custoTelha(rows[2]), 1800)

const marcadas = marcarMaisBaratas(rows)
// Americana: São Bento (877) < Telhas Norte (906.5)
assert.equal(marcadas[0].proposta, true)
assert.equal(marcadas[1].proposta, false)
// Fornecedor único e legado (null) sempre marcados
assert.equal(marcadas[2].proposta, true)
assert.equal(marcadas[3].proposta, true)

// Trocar Americana para Telhas Norte: só o grupo Americana muda
const trocadas = selecionarFornecedor(marcadas, "Americana", 2)
assert.equal(trocadas[0].proposta, false)
assert.equal(trocadas[1].proposta, true)
assert.equal(trocadas[2].proposta, true)

// Proposta: exatamente uma linha por nome
const proposta = linhasProposta(trocadas)
assert.deepEqual(proposta.map((r) => [r.nome, r.fornecedorId]), [
    ["Americana", 2],
    ["Colonial", 1],
    ["Maxxi", null],
])

// Empate de custo: primeira vence
const empate = marcarMaisBaratas([
    { nome: "Romana", fornecedorId: 1, quantidade: 10, preco: 5 },
    { nome: "Romana", fornecedorId: 2, quantidade: 10, preco: 5 },
])
assert.equal(empate[0].proposta, true)
assert.equal(empate[1].proposta, false)

console.log("telha selection rules: ok")
