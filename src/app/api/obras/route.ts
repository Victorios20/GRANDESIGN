// src/app/api/obras/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { criarObraComHeadPedidoCompra, ObraCreateError } from "@/actions/obras/create-obra-db"

export const dynamic = "force-dynamic"

type ApiErrorShape = {
  error: string
  code?: string
  step?: string
  details?: any
  requestId?: string
}

function mapErrorToHttp(err: any, requestId: string) {
  let status = 500
  const code: string | undefined = err?.code
  const step: string | undefined = err?.step
  const details = err?.details
  const message =
    typeof err?.message === "string" && err.message.trim().length > 0
      ? err.message
      : "Erro ao criar obra."

  if (code === "PAYLOAD_INVALIDO") status = 400
  else if (code === "ORCAMENTO_NAO_ENCONTRADO") status = 404
  else if (code === "ORCAMENTO_JA_LANCADO") status = 409
  else if (
    code === "OBRA_CREATE_FAILED" ||
    code === "PEDIDO_HEAD_CREATE_FAILED" ||
    code === "PEDIDO_LINK_CREATE_FAILED" ||
    code === "IMAGENS_CREATE_FAILED" ||
    code === "ORCAMENTO_UPDATE_FAILED"
  ) {
    status = 500
  } else {
    // heurística para erros de unique (concorrência)
    const msg = String(message)
    if (msg.includes("já existe obra")) status = 409
  }

  return {
    status,
    body: { error: message, code, step, details, requestId } as ApiErrorShape,
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const requestId = crypto.randomUUID()
  try {
    const body = await req.json()

    // shape esperado do payload
    // {
    //   orcamentoId: number,
    //   obra: { ...campos obrigatórios do DB... },
    //   imagens?: [{ url, ordem?, legenda? }]
    // }
    const orcamentoId = Number(body?.orcamentoId)
    const obra = body?.obra ?? {}
    const imagens = Array.isArray(body?.imagens) ? body.imagens : []

    // validações rápidas (mantém o comportamento enxuto do backend)
    if (!Number.isFinite(orcamentoId)) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Parâmetro inválido: orcamentoId.", code: "PAYLOAD_INVALIDO", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const requiredStr = ["endereco_obra", "maps_url", "tipo_obra", "telha_escolhida"] as const
    for (const k of requiredStr) {
      if (!String(obra?.[k] ?? "").trim()) {
        const res = NextResponse.json<ApiErrorShape>(
          { error: `Campo obrigatório ausente: ${k}`, code: "PAYLOAD_INVALIDO", requestId },
          { status: 400 }
        )
        res.headers.set("X-Request-Id", requestId)
        return res
      }
    }
    const requiredNum = ["largura", "comprimento", "valor_obra", "valor_mao_de_obra"] as const
    for (const k of requiredNum) {
      if (!Number.isFinite(Number(obra?.[k]))) {
        const res = NextResponse.json<ApiErrorShape>(
          { error: `Campo numérico inválido: ${k}`, code: "PAYLOAD_INVALIDO", requestId },
          { status: 400 }
        )
        res.headers.set("X-Request-Id", requestId)
        return res
      }
    }

    const actorUserId = Number((session.user as any)?.id)
    const result = await criarObraComHeadPedidoCompra({
      orcamentoId,
      endereco_obra: obra.endereco_obra,
      maps_url: obra.maps_url,
      tipo_obra: obra.tipo_obra,
      largura: obra.largura,
      comprimento: obra.comprimento,
      telha_escolhida: obra.telha_escolhida,
      valor_obra: obra.valor_obra,
      valor_mao_de_obra: obra.valor_mao_de_obra,
      observacoes: obra.observacoes ?? null,
      equipe_id: obra.equipe_id ?? null,
      imagens,
      actorUserId,
      // campos iniciais opcionais do head (se quiser mandar do front)
      area_telha: obra.area_telha ?? undefined,
      orcamento_telha: obra.orcamento_telha ?? undefined,
      orcamento_madeira: obra.orcamento_madeira ?? undefined,
    })

    const res = NextResponse.json(
      {
        ok: true,
        ...result,
        requestId,
      },
      { status: 201 }
    )
    res.headers.set("X-Request-Id", requestId)
    return res
  } catch (err: any) {
    const { status, body } = mapErrorToHttp(err as ObraCreateError, requestId)
    const res = NextResponse.json(body, { status })
    res.headers.set("X-Request-Id", requestId)
    return res
  }
}
