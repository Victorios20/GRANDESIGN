import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarObrasTableDB } from "@/actions/obras/listar-obras-table-db"

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

function json(body: any, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(body), { status, headers })
}

export async function GET(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) {
      return json({ error: "unauthorized", requestId }, 401, requestId)
    }

    const { searchParams } = new URL(req.url)

    const page = searchParams.get("page") ?? "1"
    const perPage = searchParams.get("perPage") ?? "20"

    const search = searchParams.get("search")
    const telefone = searchParams.get("telefone")
    const bairro = searchParams.get("bairro")
    const tipoObra = searchParams.get("tipoObra") ?? searchParams.get("tipo_obra")
    const dIni = searchParams.get("dIni")
    const dFim = searchParams.get("dFim")
    const status = searchParams.getAll("status")
    const ordem = searchParams.get("ordem") ?? "desc"
    const orderBy = searchParams.get("orderBy") ?? "data_criacao"
    const semAgenda = searchParams.get("semAgenda")

    const out = await listarObrasTableDB({
      page,
      perPage,
      search,
      telefone,
      bairro,
      tipoObra,
      dIni,
      dFim,
      status,
      ordem,
      orderBy,
      semAgenda,
    })

    return json({ dados: out.dados, total: out.total, requestId }, 200, requestId)
  } catch (err: any) {
    console.error("[GET /api/obras/table-search] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
