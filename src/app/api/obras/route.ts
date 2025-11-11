// src/app/api/obras/route.ts
import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { criarObraComHeadPedidoCompra, ObraCreateError } from "@/actions/obras/create-obra-db"

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

export async function POST(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) {
      return json({ error: "unauthorized", requestId }, 401, requestId)
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: "INVALID_JSON", requestId }, 400, requestId)
    }

    // validações mínimas (evita 500 por payload vazio)
    const reqStr = ["endereco_obra", "maps_url", "tipo_obra", "telha_escolhida"] as const
    for (const k of reqStr) {
      if (!String(body?.[k] ?? "").trim()) {
        return json(
          {
            error: "PAYLOAD_INVALIDO",
            code: "FIELD_REQUIRED",
            step: "validate",
            details: { field: k },
            requestId,
          },
          400,
          requestId
        )
      }
    }
    const reqNum = ["orcamentoId", "largura", "comprimento", "valor_obra", "valor_mao_de_obra"] as const
    for (const k of reqNum) {
      if (!Number.isFinite(Number(body?.[k]))) {
        return json(
          {
            error: "PAYLOAD_INVALIDO",
            code: "FIELD_INVALID_NUMBER",
            step: "validate",
            details: { field: k },
            requestId,
          },
          400,
          requestId
        )
      }
    }

    const result = await criarObraComHeadPedidoCompra({
      orcamentoId: Number(body.orcamentoId),
      endereco_obra: String(body.endereco_obra),
      maps_url: String(body.maps_url),
      tipo_obra: String(body.tipo_obra),
      largura: body.largura,
      comprimento: body.comprimento,
      telha_escolhida: String(body.telha_escolhida),
      valor_obra: body.valor_obra,
      valor_mao_de_obra: body.valor_mao_de_obra,
      observacoes: body.observacoes ?? null,
      equipe_id: body.equipe_id ?? null,
      imagens: Array.isArray(body.imagens) ? body.imagens : undefined,
      area_telha: body.area_telha,
      orcamento_telha: body.orcamento_telha,
      orcamento_madeira: body.orcamento_madeira,
      clienteCpf: body.clienteCpf,
      forceUpdateClienteCpf: !!body.forceUpdateClienteCpf,
      actorUserId: actorId,
    })

    return json({ data: result, requestId }, 201, requestId)
  } catch (err: any) {
    const requestId2 = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    if (err instanceof ObraCreateError) {
      const map: Record<string, number> = {
        PAYLOAD_INVALIDO: 400,
        ORCAMENTO_NAO_ENCONTRADO: 404,
        ORCAMENTO_JA_LANCADO: 409,
        CPF_INVALIDO: 400,
        CLIENTE_CPF_JA_PREENCHIDO: 409,
        CLIENTE_NAO_ENCONTRADO: 404,
        PEDIDO_HEAD_CREATE_FAILED: 500,
        PEDIDO_LINK_CREATE_FAILED: 500,
        IMAGENS_CREATE_FAILED: 500,
        ORCAMENTO_UPDATE_FAILED: 500,
        OBRA_CREATE_FAILED: 500,
        AUDIT_FAILED: 500,
      }
      const status = map[err.code] ?? 500
      return json(
        { error: err.message, code: err.code, step: err.step, details: err.details, requestId: requestId2 },
        status,
        requestId2
      )
    }
    console.error("[POST /api/obras] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId: requestId2 }, 500, requestId2)
  }
}
