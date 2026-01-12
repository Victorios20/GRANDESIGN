// src/app/api/pedido_compra/listar/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarPedidosCompra } from "@/actions/pedido_compra/listar-pedido-compra-db"

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

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export async function GET(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) return json({ error: "unauthorized", requestId }, 401, requestId)

    const { searchParams } = new URL(req.url)

    const page = clampInt(searchParams.get("page"), 1, 1, 1_000_000)
    const pageSize = clampInt(searchParams.get("pageSize"), 10, 1, 100)

    const obraIdRaw = searchParams.get("obraId")
    const obraId = obraIdRaw != null && obraIdRaw !== "" ? Number(obraIdRaw) : null

    const status = searchParams.get("status")
    const categoria = searchParams.get("categoria")

    const q = searchParams.get("q")

    const orderBy = searchParams.get("orderBy") as any
    const orderDir = (searchParams.get("orderDir") as any) ?? "desc"

    const result = await listarPedidosCompra({
      page,
      pageSize,
      obraId: Number.isFinite(Number(obraId)) ? Number(obraId) : null,
      status,
      categoria,
      q,
      orderBy,
      orderDir,
    })

    return json({ data: result, requestId }, 200, requestId)
  } catch (err: any) {
    console.error("[GET /api/pedido_compra/listar] unexpected", err)
    const requestId2 = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    return json({ error: "UNEXPECTED_ERROR", requestId: requestId2 }, 500, requestId2)
  }
}
