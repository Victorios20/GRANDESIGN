import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  excluirPedidosCompra,
  PedidoCompraDeleteError,
} from "@/actions/pedido_compra/delete-pedido-compra-db"
import { isAdminOrDev } from "@/lib/rbac"

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

export async function DELETE(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const session = (await getServerSession(authOptions)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: "BODY_REQUIRED", requestId }, 400, requestId)

    const ids = Array.isArray(body?.ids) ? body.ids.map((id: unknown) => Number(id)) : []
    const force = (req.nextUrl.searchParams.get("force") === "1" || body?.force === true) && (await isAdminOrDev())
    const result = await excluirPedidosCompra(ids, actorId, force)

    return json({ data: result, requestId }, 200, requestId)
  } catch (error: unknown) {
    if (error instanceof PedidoCompraDeleteError) {
      const statusMap: Record<string, number> = {
        PAYLOAD_INVALIDO: 400,
        PEDIDO_NAO_ENCONTRADO: 404,
        PEDIDO_INTEGRADO_FINANCEIRO: 409,
        ITENS_DELETE_FAILED: 500,
        PEDIDO_DELETE_FAILED: 500,
        AUDIT_FAILED: 500,
      }

      return json(
        { error: error.message, code: error.code, step: error.step, details: error.details, requestId },
        statusMap[error.code] ?? 500,
        requestId
      )
    }

    console.error("[DELETE /api/pedido_compra/excluir/bulk] unexpected", error)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
