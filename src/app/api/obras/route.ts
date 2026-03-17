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
      titulo: body.titulo ? String(body.titulo) : null,
      endereco_obra: String(body.endereco_obra),
      maps_url: String(body.maps_url),
      tipo_obra: String(body.tipo_obra),
      largura: Number(body.largura),
      comprimento: Number(body.comprimento),
      largura_maior: body.largura_maior != null ? Number(body.largura_maior) : undefined,
      largura_menor: body.largura_menor != null ? Number(body.largura_menor) : undefined,
      comprimento_maior: body.comprimento_maior != null ? Number(body.comprimento_maior) : undefined,
      comprimento_menor: body.comprimento_menor != null ? Number(body.comprimento_menor) : undefined,
      telha_escolhida: String(body.telha_escolhida),
      observacoes: body.observacoes ?? null,
      status: body.status ?? null,

      equipe_id: body.equipe_id != null ? Number(body.equipe_id) : null,

      data_prev_inicio: body.data_prev_inicio ?? null,
      data_prev_conclusao: body.data_prev_conclusao ?? null,

      valor_obra: Number(body.valor_obra),
      valor_mao_de_obra: Number(body.valor_mao_de_obra),

      pagamento_entrada: body.pagamento_entrada != null ? Number(body.pagamento_entrada) : undefined,
      forma_pagamento_entrada: body.forma_pagamento_entrada != null ? String(body.forma_pagamento_entrada) : null,
      status_pagamento_entrada: body.status_pagamento_entrada ?? null,

      pagamento_quitacao: body.pagamento_quitacao != null ? Number(body.pagamento_quitacao) : undefined,
      forma_pagamento_quitacao: body.forma_pagamento_quitacao != null ? String(body.forma_pagamento_quitacao) : null,
      status_pagamento_quitacao: body.status_pagamento_quitacao ?? null,

      imagens: Array.isArray(body.imagens) ? body.imagens : undefined,

      telhaItens: Array.isArray(body.telhaItens) ? body.telhaItens : undefined,
      madeiraItens: Array.isArray(body.madeiraItens) ? body.madeiraItens : undefined,
      materiaisItens: Array.isArray(body.materiaisItens) ? body.materiaisItens : undefined,
      andaimesItens: Array.isArray(body.andaimesItens) ? body.andaimesItens : undefined,

      fornecedor_telha_id: body.fornecedor_telha_id != null ? Number(body.fornecedor_telha_id) : null,
      fornecedor_madeira_id: body.fornecedor_madeira_id != null ? Number(body.fornecedor_madeira_id) : null,
      andaimes_fornecedor_id: body.andaimes_fornecedor_id != null ? Number(body.andaimes_fornecedor_id) : null,

      pedidosCompra: Array.isArray(body.pedidosCompra) ? body.pedidosCompra : undefined,

      clienteCpf: body.clienteCpf ?? null,
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
