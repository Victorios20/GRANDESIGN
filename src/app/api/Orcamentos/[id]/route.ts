// src/app/api/Orcamentos/[id]/route.ts
import { NextResponse } from "next/server"
import { getOrcamentoById, updateOrcamento } from "@/actions/edit-orcamento-db/edit-orcamento-db"

// >>> melhorias de runtime/caching (não interferem no PUT)
export const runtime = "nodejs"          // evita intermitência do Edge
export const dynamic = "force-dynamic"   // garante execução dinâmica
export const revalidate = 0              // sem cache estático do Next

// GET /api/Orcamentos/[id]
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  try {
    const data = await getOrcamentoById(id)
    if (!data) return NextResponse.json({ error: "não encontrado" }, { status: 404 })
    // cache privado curtinho: reabrir o mesmo modal fica mais rápido
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (err: any) {
    console.error("GET /api/Orcamentos/[id] erro:", err)
    // mantém sua semântica anterior
    const msg = String(err?.message ?? "")
    const status = /n(ã|a)o encontrado|not found/i.test(msg) ? 404 : 500
    return NextResponse.json({ error: msg || "erro interno" }, { status })
  }
}

// PUT /api/Orcamentos/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido", code: "VALIDACAO" }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido", code: "VALIDACAO" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload vazio", code: "VALIDACAO" }, { status: 422 })
  }

  // ⚠️ editar NÃO mexe em cliente; descartamos quaisquer campos de cliente
  // (se a action já ignora, beleza; isso aqui é só uma rede de segurança)
  const { cliente, clienteId, cliente_id, ...safeBody } = body

  try {
    const updatedId = await updateOrcamento(id, safeBody)
    return NextResponse.json({ id: updatedId ?? id }, { status: 200 })
  } catch (err: any) {
    const code = typeof err?.code === "string" ? err.code : undefined
    const msg = String(err?.message ?? "")

    // ▶ mapeamento por code (preferência)
    if (code === "ORCAMENTO_NOT_FOUND" || code === "CLIENT_NOT_FOUND") {
      return NextResponse.json({ error: "não encontrado", code }, { status: 404 })
    }
    if (code === "VALIDACAO") {
      return NextResponse.json({ error: msg || "payload inválido", code }, { status: 422 })
    }
    if (code === "INSERT_ORCAMENTO_FAILED" || code === "INSERT_MATERIAL_FAILED" || code === "INSERT_PAGAMENTO_FAILED") {
      console.error("PUT /api/Orcamentos/[id] erro:", err)
      return NextResponse.json({ error: "erro interno", code }, { status: 500 })
    }

    // ▶ fallback antigo por mensagem (se a action não setou code)
    if (/\bn(ã|a)o encontrado\b|not found/i.test(msg)) {
      return NextResponse.json({ error: "não encontrado" }, { status: 404 })
    }
    if (/payload|inv[áa]lido/i.test(msg)) {
      return NextResponse.json({ error: msg, code: "VALIDACAO" }, { status: 422 })
    }

    console.error("PUT /api/Orcamentos/[id] erro:", err)
    return NextResponse.json({ error: "erro interno" }, { status: 500 })
  }
}

