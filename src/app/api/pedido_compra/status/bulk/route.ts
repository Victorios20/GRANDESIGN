import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  atualizarStatusPedidosCompra,
  PedidoCompraStatusError,
} from "@/actions/pedido_compra/update-pedido-compra-status-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type SessionLike =
  | { user?: { id?: string | number | null } | null; userId?: string | number | null }
  | null
  | undefined

function getActorId(session: SessionLike): number | null {
  const raw = session?.user?.id ?? session?.userId
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function json(resBody: unknown, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(resBody), { status, headers })
}

export async function PATCH(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const session = (await getServerSession(authOptions)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: "BODY_REQUIRED", requestId }, 400, requestId)

    const ids = Array.isArray(body?.ids) ? body.ids.map((id: unknown) => Number(id)) : []
    const result = await atualizarStatusPedidosCompra(ids, body?.status, actorId)

    return json({ data: result, requestId }, 200, requestId)
  } catch (error: unknown) {
    if (error instanceof PedidoCompraStatusError) {
      const statusMap: Record<string, number> = {
        PAYLOAD_INVALIDO: 400,
        STATUS_INVALIDO: 400,
        PEDIDO_NAO_ENCONTRADO: 404,
        PEDIDOS_NAO_ENCONTRADOS: 404,
        PEDIDO_INTEGRADO_FINANCEIRO: 409,
        PEDIDO_SEM_FORNECEDOR: 422,
        PEDIDO_SEM_VALOR: 422,
        INTEGRACAO_AUTOMATICA_FALHOU: 500,
        STATUS_UPDATE_FAILED: 500,
      }

      return json(
        { error: error.message, code: error.code, step: error.step, details: error.details, requestId },
        statusMap[error.code] ?? 500,
        requestId
      )
    }

    console.error("[PATCH /api/pedido_compra/status/bulk] unexpected", error)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
