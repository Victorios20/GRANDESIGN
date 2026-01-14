import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PedidoCompraStatus } from "@prisma/client"

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

function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function mapStatus(raw: any): PedidoCompraStatus | null {
  const s = String(raw ?? "").trim()
  if (!s) return null

  if (Object.values(PedidoCompraStatus).includes(s as PedidoCompraStatus)) {
    return s as PedidoCompraStatus
  }

  const n = normalizeStr(s)

  if (n === "rascunho") return PedidoCompraStatus.RASCUNHO
  if (n === "pendente") return PedidoCompraStatus.PENDENTE
  if (n === "aprovado") return PedidoCompraStatus.APROVADO
  if (n === "em compra" || n === "emcompra") return PedidoCompraStatus.EM_COMPRA
  if (n === "aguardando pagamento" || n === "aguardandopagamento") return PedidoCompraStatus.AGUARDANDO_PAGAMENTO
  if (n === "aguardando entrega" || n === "aguardandoentrega") return PedidoCompraStatus.AGUARDANDO_ENTREGA
  if (n === "entregue") return PedidoCompraStatus.ENTREGUE
  if (n === "cancelado") return PedidoCompraStatus.CANCELADO

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const { id: idParam } = await params
    const id = Number(idParam)
    if (!Number.isFinite(id) || id <= 0) {
      return json({ error: "INVALID_ID", requestId }, 400, requestId)
    }

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: "BODY_REQUIRED", requestId }, 400, requestId)

    const nextStatus = mapStatus(body?.status)
    if (!nextStatus) return json({ error: "INVALID_STATUS", requestId }, 400, requestId)

    const exists = await prisma.pedido_compra.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) return json({ error: "NOT_FOUND", requestId }, 404, requestId)

    const updated = await prisma.pedido_compra.update({
      where: { id },
      data: { status: nextStatus },
      select: { id: true, status: true, updated_at: true },
    })

    return json({ data: updated, requestId }, 200, requestId)
  } catch (err: any) {
    console.error("[PATCH /api/pedido_compra/status/[id]] unexpected", err)
    const requestId2 = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    return json({ error: "UNEXPECTED_ERROR", requestId: requestId2 }, 500, requestId2)
  }
}
