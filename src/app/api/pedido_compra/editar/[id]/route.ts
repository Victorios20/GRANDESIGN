import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { editarPedidoCompraComItens, PedidoCompraEditError } from "@/actions/pedido_compra/edit-pedido-compra-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type SessionLike =
  | { user?: { id?: string | number | null } | null; userId?: string | number | null }
  | null
  | undefined

function getActorId(session: SessionLike): number | null {
  const raw = (session as any)?.user?.id ?? (session as any)?.userId
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function json(resBody: any, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(resBody), { status, headers })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const { id } = await params
    const pedidoCompraId = Number(id)

    if (!Number.isFinite(pedidoCompraId)) {
      return json(
        { error: "PAYLOAD_INVALIDO", code: "PARAM_INVALID", step: "validate", details: { param: "id" }, requestId },
        400,
        requestId
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: "INVALID_JSON", requestId }, 400, requestId)
    }

    if (!Number.isFinite(Number(body?.obra_id))) {
      return json(
        { error: "PAYLOAD_INVALIDO", code: "FIELD_INVALID_NUMBER", step: "validate", details: { field: "obra_id" }, requestId },
        400,
        requestId
      )
    }

    if (!String(body?.categoria ?? "").trim()) {
      return json(
        { error: "PAYLOAD_INVALIDO", code: "FIELD_REQUIRED", step: "validate", details: { field: "categoria" }, requestId },
        400,
        requestId
      )
    }

    if (!Array.isArray(body?.itens) || body.itens.length === 0) {
      return json(
        { error: "PAYLOAD_INVALIDO", code: "FIELD_REQUIRED", step: "validate", details: { field: "itens" }, requestId },
        400,
        requestId
      )
    }

    const result = await editarPedidoCompraComItens({
      pedidoCompraId,

      obra_id: Number(body.obra_id),
      categoria: body.categoria,
      status: body.status ?? null,

      valor_orcado: body.valor_orcado ?? null,
      valor_realizado: body.valor_realizado ?? null,
      frete: body.frete ?? null,

      descricao: body.descricao ?? null,
      observacoes: body.observacoes ?? null,

      fornecedor_id: body.fornecedor_id != null ? Number(body.fornecedor_id) : null,

      data_entrega: body.data_entrega ?? null,
      endereco_entrega: body.endereco_entrega ?? null,
      nome_receptor: body.nome_receptor ?? null,
      telefone_receptor: body.telefone_receptor ?? null,
      link_maps: body.link_maps ?? null,

      itens: body.itens,

      actorUserId: actorId,
    })

    return json({ data: result, requestId }, 200, requestId)
  } catch (err: any) {
    if (err instanceof PedidoCompraEditError) {
      const map: Record<string, number> = {
        PAYLOAD_INVALIDO: 400,
        PEDIDO_NAO_ENCONTRADO: 404,
        PEDIDO_INTEGRADO_FINANCEIRO: 409,
        OBRA_NAO_ENCONTRADA: 404,
        FORNECEDOR_NAO_ENCONTRADO: 404,
        PEDIDO_UPDATE_FAILED: 500,
        ITENS_REPLACE_FAILED: 500,
        AUDIT_FAILED: 500,
      }
      const status = map[err.code] ?? 500
      return json(
        { error: err.message, code: err.code, step: err.step, details: err.details, requestId },
        status,
        requestId
      )
    }

    console.error("[PUT /api/pedido_compra/editar/[id]] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
