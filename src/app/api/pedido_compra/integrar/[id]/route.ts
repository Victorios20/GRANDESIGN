import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  integrarPedidoCompraAoFinanceiro,
  PedidoCompraFinanceiroError,
} from "@/actions/pedido_compra/manage-finance-integration"

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

function json(body: unknown, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(body), { status, headers })
}

function mapErrorStatus(code: string) {
  const map: Record<string, number> = {
    PAYLOAD_INVALIDO: 400,
    PEDIDO_NAO_ENCONTRADO: 404,
    PEDIDOS_NAO_ENCONTRADOS: 404,
    PEDIDO_CANCELADO: 409,
    PEDIDO_JA_INTEGRADO: 409,
    PEDIDO_SEM_FORNECEDOR: 422,
    PEDIDO_SEM_VALOR: 422,
    CATEGORIA_FINANCEIRA_NAO_ENCONTRADA: 500,
    INTEGRACAO_FINANCEIRA_FALHOU: 500,
  }

  return map[code] ?? 500
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const session = (await getServerSession(authOptions)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const { id } = await params
    const pedidoId = Number(id)
    if (!Number.isFinite(pedidoId) || pedidoId <= 0) {
      return json({ error: "INVALID_ID", requestId }, 400, requestId)
    }

    const data = await integrarPedidoCompraAoFinanceiro(pedidoId, actorId)
    return json({ data, requestId }, 200, requestId)
  } catch (error) {
    if (error instanceof PedidoCompraFinanceiroError) {
      return json(
        { error: error.message, code: error.code, step: error.step, details: error.details, requestId },
        mapErrorStatus(error.code),
        requestId
      )
    }

    console.error("[POST /api/pedido_compra/integrar/[id]] unexpected", error)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
