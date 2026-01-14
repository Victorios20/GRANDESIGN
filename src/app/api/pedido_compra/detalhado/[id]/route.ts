import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPedidoCompraDetalhado, PedidoCompraDetalhadoError } from "@/actions/pedido_compra/get-pedido-compra-detalhado-db"

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

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const { id } = await ctx.params
    const pedidoCompraId = Number(id)
    if (!Number.isFinite(pedidoCompraId)) {
      return json(
        { error: "PAYLOAD_INVALIDO", code: "PARAM_INVALID", step: "validate", details: { param: "id" }, requestId },
        400,
        requestId
      )
    }

    const data = await getPedidoCompraDetalhado(pedidoCompraId)
    return json({ data, requestId }, 200, requestId)
  } catch (err: any) {
    if (err instanceof PedidoCompraDetalhadoError) {
      const map: Record<string, number> = {
        PAYLOAD_INVALIDO: 400,
        PEDIDO_NAO_ENCONTRADO: 404,
        LOAD_FAILED: 500,
      }
      const status = map[err.code] ?? 500
      return json({ error: err.message, code: err.code, step: err.step, details: err.details, requestId }, status, requestId)
    }

    console.error("[GET /api/pedido_compra/detalhado/[id]] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}