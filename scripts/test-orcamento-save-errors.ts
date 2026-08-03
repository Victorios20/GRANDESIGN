import assert from "node:assert/strict"

import { escapeHtml } from "../src/lib/email/html"
import {
    ApiRequestError,
    CONNECTION_LOST_MESSAGE,
    ConnectionLostError,
    isConnectionLost,
    isDuplicateTitleError,
    messageForOrcamentoFailure,
    parseExistente,
} from "../src/lib/orcamento/save-errors"

// --- escapeHtml -------------------------------------------------------------

assert.equal(escapeHtml("Aluguel & Cia <Matriz>"), "Aluguel &amp; Cia &lt;Matriz&gt;")
assert.equal(escapeHtml(null), "")
assert.equal(escapeHtml(undefined), "")
assert.equal(escapeHtml(1720.5), "1720.5")
assert.equal(escapeHtml('a"b\'c'), "a&quot;b&#39;c")

// --- o sintoma que originou tudo: "Failed to fetch" no toast ---------------

// fetch nativo estoura TypeError; a mensagem crua não pode chegar ao usuário.
assert.notEqual(messageForOrcamentoFailure(new TypeError("Failed to fetch")), "Failed to fetch")
assert.equal(messageForOrcamentoFailure(new TypeError("Failed to fetch")), CONNECTION_LOST_MESSAGE)
assert.equal(messageForOrcamentoFailure(new ConnectionLostError()), CONNECTION_LOST_MESSAGE)
assert.ok(isConnectionLost(new ConnectionLostError()))
assert.ok(!isConnectionLost(new Error("qualquer outra")))

// A mensagem avisa que o orçamento pode ter sido salvo — esse é o ponto dela.
assert.match(CONNECTION_LOST_MESSAGE, /pode já ter sido salvo/)

// --- 409 de título duplicado ----------------------------------------------

const dup = new ApiRequestError("Falha ao salvar rascunho: título já existe.", {
    status: 409,
    code: "DUPLICATE_TITLE",
    existente: { id: 3223, slideUrl: "https://slide", pdfUrl: "https://pdf" },
})

assert.ok(isDuplicateTitleError(dup))
assert.equal(messageForOrcamentoFailure(dup), "Já existe o orçamento #3223 com esse título.")

const dupSemId = new ApiRequestError("Já existe um orçamento com esse título.", {
    status: 409,
    code: "DUPLICATE_TITLE",
})
assert.equal(messageForOrcamentoFailure(dupSemId), "Já existe um orçamento com esse título.")

// 409 sem ser duplicidade não deve ser tratado como tal.
assert.ok(!isDuplicateTitleError(new ApiRequestError("outro", { status: 409, code: "OUTRO" })))

// --- parseExistente -------------------------------------------------------

assert.deepEqual(parseExistente({ id: 10, slideUrl: "s", pdfUrl: "p" }), {
    id: 10,
    slideUrl: "s",
    pdfUrl: "p",
})

// aceita o formato cru do banco
assert.deepEqual(parseExistente({ id: 11, link_slide: "s", link_pdf: "p" }), {
    id: 11,
    slideUrl: "s",
    pdfUrl: "p",
})

// rascunho existente: sem links
assert.deepEqual(parseExistente({ id: 12, link_slide: "", link_pdf: null }), {
    id: 12,
    slideUrl: null,
    pdfUrl: null,
})

// formato que a rota realmente devolve: details.existente
assert.deepEqual(parseExistente({ titulo: "x", existente: { id: 13, slideUrl: "s", pdfUrl: "p" } }), {
    id: 13,
    slideUrl: "s",
    pdfUrl: "p",
})

assert.equal(parseExistente(undefined), undefined)
assert.equal(parseExistente({ titulo: "sem id" }), undefined)
assert.equal(parseExistente({ id: 0 }), undefined)
assert.equal(parseExistente("nada"), undefined)

// --- demais erros do servidor passam a mensagem do servidor ---------------

assert.equal(
    messageForOrcamentoFailure(
        new ApiRequestError("Cliente não encontrado.", { status: 404, code: "CLIENT_NOT_FOUND" }),
    ),
    "Cliente não encontrado.",
)
assert.equal(messageForOrcamentoFailure(new Error("boom")), "boom")
assert.equal(messageForOrcamentoFailure({}), "Erro inesperado ao gerar proposta.")
assert.equal(messageForOrcamentoFailure(new Error("   ")), "Erro inesperado ao gerar proposta.")

console.log("test-orcamento-save-errors: ok")
