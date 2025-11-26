// src/app/api/Orcamentos/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrcamentoById, updateOrcamento } from "@/actions/edit-orcamento-db/edit-orcamento-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

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
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (err: any) {
    console.error("GET /api/Orcamentos/[id] erro:", err)
    const msg = String(err?.message ?? "")
    const status = /n(ã|a)o encontrado|not found/i.test(msg) ? 404 : 500
    return NextResponse.json({ error: msg || "erro interno" }, { status })
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

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

  // Nunca permitimos trocar cliente por aqui (mantém seu comportamento atual)
  const { cliente, clienteId, cliente_id, ...safeBody } = body

  // Normalização tolerante do fornecedor (sem quebrar nada existente)
  const rawFornecedorId =
    body?.fornecedorId ?? body?.fornecedor_id ?? body?.id_fornecedor ?? body?.fornecedor?.id ?? null
  const parsedFornecedor = Number(rawFornecedorId)
  const fornecedorId = Number.isFinite(parsedFornecedor) ? parsedFornecedor : null

  const actorUserId = Number((session.user as any).id)

  try {
    // Passamos ambas as chaves para a camada DB aceitar qualquer forma:
    // - fornecedorId (camelCase)
    // - id_fornecedor (snake) — caso sua função espere esse nome
    const updatedId = await updateOrcamento(id, {
      ...safeBody,
      fornecedorId,
      id_fornecedor: fornecedorId,
      actorUserId,
    })
    return NextResponse.json({ id: updatedId ?? id }, { status: 200 })
  } catch (err: any) {
    const code = typeof err?.code === "string" ? err.code : undefined
    const msg = String(err?.message ?? "")

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
