// src/app/api/Orcamentos/gerar-proposta/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { salvarRascunhoOrcamentoDB } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"
import { updateOrcamento } from "@/actions/edit-orcamento-db/edit-orcamento-db"
import { prisma } from "@/lib/prisma"
import axios, { isAxiosError } from "axios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type ApiErrorShape = {
  error: string
  code?: string
  step?: string
  details?: any
  requestId?: string
}

type PdfLinks = { slideUrl: string; pdfUrl: string }
type GerarPDFResponse = PdfLinks[] | PdfLinks

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  if (v && typeof v === "object") {
    const anyV = v as any
    const vv = anyV?.valueOf?.() ?? anyV
    if (typeof vv === "number") return Number.isFinite(vv) ? vv : 0
    if (typeof vv === "string") {
      const n = Number(vv.replace(",", "."))
      return Number.isFinite(n) ? n : 0
    }
  }
  return 0
}

function nonNeg(v: unknown): number {
  const n = toNum(v)
  return n < 0 ? 0 : n
}

function fmt(n: number): string {
  return (Math.ceil(n * 100) / 100).toFixed(2).replace(".", ",")
}

function cleanText(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ")
}

function cleanTextOrNull(s: string | null | undefined): string | null {
  const t = cleanText(s)
  return t.length ? t : null
}

function normalizeTelhaValores(input: any): Record<string, { pix: number; x10: number; x18: number }> {
  const src = input?.telhaValores ?? input?.telhaValoresDinamicos ?? {}
  const out: Record<string, { pix: number; x10: number; x18: number }> = {}

  if (!src || typeof src !== "object") return out

  for (const [kRaw, vRaw] of Object.entries(src)) {
    const k = cleanText(String(kRaw))
    if (!k) continue
    const v: any = vRaw as any
    out[k] = {
      pix: nonNeg(v?.pix),
      x10: nonNeg(v?.x10 ?? v?.["10x"]),
      x18: nonNeg(v?.x18 ?? v?.["18x"]),
    }
  }

  return out
}

function buildThirdPartyPayload(body: any, orcamentoId: number) {
  const cliente = body?.cliente ?? {}
  const parametros = body?.parametros ?? {}
  const materiais = body?.materiais ?? {}
  const totais = body?.totais ?? {}
  const telhaValores = normalizeTelhaValores(body)

  const madeiras = Array.isArray(materiais?.madeiras) ? materiais.madeiras : []
  const materiaisGerais = Array.isArray(materiais?.materiaisGerais) ? materiais.materiaisGerais : []
  const telhas = Array.isArray(materiais?.telhas) ? materiais.telhas : []

  const payload = {
    orcamentoId,
    titulo: cleanText(body?.titulo ?? ""),
    cliente: {
      nome: cleanText(cliente?.nome ?? ""),
      telefone: cleanText(cliente?.telefone ?? ""),
      cidade: cleanText(cliente?.cidade ?? ""),
      bairro: cleanText(cliente?.bairro ?? ""),
    },
    parametros: {
      tipoObra: cleanText(parametros?.tipoObra ?? ""),
      largura: nonNeg(parametros?.largura),
      comprimento: nonNeg(parametros?.comprimento),
      larguraMaior: nonNeg(parametros?.larguraMaior),
      larguraMenor: nonNeg(parametros?.larguraMenor),
      comprimentoMaior: nonNeg(parametros?.comprimentoMaior),
      comprimentoMenor: nonNeg(parametros?.comprimentoMenor),
    },
    madeiras: madeiras.map((m: any) => {
      const tamanho = nonNeg(m?.tamanho)
      const qtd = nonNeg(m?.quantidade)
      const preco = nonNeg(m?.preco)
      return {
        componente: cleanText(m?.componente ?? ""),
        madeira: cleanText(m?.nome ?? ""),
        tamanho: fmt(tamanho),
        quantidade: fmt(qtd),
        preco_m2: fmt(preco),
        total: fmt(tamanho * qtd * preco),
      }
    }),
    materiaisGerais: materiaisGerais.map((m: any) => {
      const qtd = nonNeg(m?.quantidade)
      const preco = nonNeg(m?.preco)
      return {
        descricao: cleanText(m?.nome ?? ""),
        quantidade: fmt(qtd),
        preco_unitario: fmt(preco),
        total: fmt(qtd * preco),
      }
    }),
    telhas: telhas.map((m: any) => {
      const qtd = nonNeg(m?.quantidade)
      const preco = nonNeg(m?.preco)
      const frete = nonNeg(m?.frete)
      return {
        descricao: cleanText(m?.nome ?? ""),
        quantidade: fmt(qtd),
        preco_unitario: fmt(preco),
        frete: fmt(frete),
        total: fmt(qtd * preco + frete),
      }
    }),
    totais: {
      madeiras: fmt(nonNeg(totais?.madeiras)),
      materiaisGerais: fmt(nonNeg(totais?.materiais)),
      comissao: fmt(nonNeg(totais?.comissao)),
      empresaPS: fmt(nonNeg(totais?.empresaPS)),
      empresaGD: fmt(nonNeg(totais?.empresaGD)),
      frete: fmt(nonNeg(totais?.frete)),
    },
    telhaValoresDinamicos: Object.fromEntries(
      Object.entries(telhaValores).map(([nome, v]) => [
        nome,
        { pix: fmt(nonNeg(v.pix)), x10: fmt(nonNeg(v.x10)), x18: fmt(nonNeg(v.x18)) },
      ])
    ),
  }

  return { payload }
}

function pickLinks(data: GerarPDFResponse): PdfLinks | null {
  if (!data) return null
  if (Array.isArray(data)) {
    const first = data[0] as any
    if (first?.slideUrl && first?.pdfUrl) return { slideUrl: String(first.slideUrl), pdfUrl: String(first.pdfUrl) }
    return null
  }
  const anyD = data as any
  if (anyD?.slideUrl && anyD?.pdfUrl) return { slideUrl: String(anyD.slideUrl), pdfUrl: String(anyD.pdfUrl) }
  return null
}

/**
 * Localiza o orçamento que já ocupa o título, para o 409 devolver o registro
 * existente (com links, se já tiver) em vez de só recusar.
 *
 * Isso fecha o ciclo da request longa: se a conexão do cliente cair depois do
 * rascunho ter sido salvo, a retentativa com o mesmo título encontra o que foi
 * gravado em vez de virar um beco sem saída.
 */
async function findOrcamentoByTitulo(titulo: string) {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT id, link_slide, link_pdf FROM orcamento WHERE titulo = ${titulo} LIMIT 1
    `) as Array<{ id: number | bigint; link_slide: string | null; link_pdf: string | null }>

    const row = rows?.[0]
    if (!row) return undefined

    return {
      id: Number(row.id),
      slideUrl: row.link_slide,
      pdfUrl: row.link_pdf,
    }
  } catch (err) {
    console.error("[gerar-proposta] falha ao localizar orçamento duplicado", err)
    return undefined
  }
}

function mapErrorToHttp(err: any, requestId: string): { status: number; body: ApiErrorShape } {
  const code = typeof err?.code === "string" ? err.code : undefined
  const step = typeof err?.step === "string" ? err.step : undefined
  const details = err?.details

  const rawMessage =
    typeof err?.message === "string" && err.message.trim().length > 0 ? err.message.trim() : "Erro interno."

  let status = 500
  if (code === "CLIENT_ID_REQUIRED" || code === "VALIDACAO") status = 422
  else if (code === "CLIENT_NOT_FOUND") status = 404
  else if (code === "DUPLICATE_TITLE") status = 409
  else if (code === "TYPE_NOT_FOUND" || code === "CITY_NOT_FOUND") status = 404

  return { status, body: { error: rawMessage, code, step, details, requestId } }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const requestId = crypto.randomUUID()

  let body: any
  try {
    body = await req.json()
  } catch {
    const res = NextResponse.json<ApiErrorShape>({ error: "JSON inválido", code: "VALIDACAO", requestId }, { status: 400 })
    res.headers.set("X-Request-Id", requestId)
    return res
  }

  const titulo = cleanText(body?.titulo ?? "")
  if (!titulo) {
    const res = NextResponse.json<ApiErrorShape>({ error: "Título é obrigatório.", code: "VALIDACAO", requestId }, { status: 400 })
    res.headers.set("X-Request-Id", requestId)
    return res
  }

  const rawClienteId = body?.clienteId ?? body?.cliente_id ?? body?.cliente?.id ?? null
  const parsedClienteId = Number(rawClienteId)
  const clienteId = Number.isFinite(parsedClienteId) ? parsedClienteId : NaN

  const rawFornecedorId = body?.fornecedorId ?? body?.fornecedor_id ?? body?.id_fornecedor ?? body?.fornecedor?.id ?? null
  const parsedFornecedor = Number(rawFornecedorId)
  const fornecedorId = Number.isFinite(parsedFornecedor) ? parsedFornecedor : null

  const observacoesRaw = typeof body?.observacoes === "string" ? body.observacoes.trim() : ""
  const observacoes = observacoesRaw.length ? observacoesRaw : null

  const actorUserId = Number((session.user as any).id)

  try {
    const cliente = body?.cliente ?? {}
    const parametros = body?.parametros ?? {}
    const materiais = body?.materiais ?? {}
    const totais = body?.totais ?? {}
    const telhaValores = normalizeTelhaValores(body)

    const orcamentoId = await salvarRascunhoOrcamentoDB({
      titulo,
      cliente,
      parametros,
      materiais,
      totais,
      telhaValores,
      clienteId,
      actorUserId,
      fornecedorId,
      observacoes,
    } as any)

    const ENDPOINT_GERAR_PDF = process.env.NEXT_PUBLIC_ENDPOINT_GERAR_PDF as string | undefined
    if (!ENDPOINT_GERAR_PDF) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Variável de ambiente ausente (NEXT_PUBLIC_ENDPOINT_GERAR_PDF).", code: "CONFIG", requestId },
        { status: 500 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const { payload } = buildThirdPartyPayload({ ...body, totais }, orcamentoId)

    let data: GerarPDFResponse
    try {
      const resp = await axios.post<GerarPDFResponse>(ENDPOINT_GERAR_PDF, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 60_000,
      })
      data = resp.data
    } catch (e: any) {
      if (isAxiosError(e)) {
        const st = e.response?.status
        const msg = (e.response?.data as any)?.message ?? e.message ?? "Falha ao gerar PDF/Slide."
        const status = typeof st === "number" ? st : e.code === "ECONNABORTED" ? 504 : 502
        const res = NextResponse.json<ApiErrorShape>(
          { error: String(msg), code: "TERCEIRO_FALHOU", details: { status: st ?? null }, requestId },
          { status }
        )
        res.headers.set("X-Request-Id", requestId)
        return res
      }
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Falha ao gerar PDF/Slide.", code: "TERCEIRO_FALHOU", requestId },
        { status: 502 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const links = pickLinks(data)
    if (!links) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Resposta inválida do gerador de PDF/Slide.", code: "TERCEIRO_INVALIDO", requestId },
        { status: 502 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    await updateOrcamento(orcamentoId, {
      ...body,
      titulo,
      clienteId,
      fornecedorId,
      id_fornecedor: fornecedorId,
      observacoes,
      parametros: body?.parametros ?? {},
      materiais: body?.materiais ?? { madeiras: [], materiaisGerais: [], telhas: [] },
      totais,
      links: { slideUrl: links.slideUrl, pdfUrl: links.pdfUrl },
      telhaValores: normalizeTelhaValores(body),
      actorUserId,
    } as any)

    const res = NextResponse.json({ id: orcamentoId, links, requestId }, { status: 201, headers: { "Cache-Control": "no-store" } })
    res.headers.set("X-Request-Id", requestId)
    return res
  } catch (err: any) {
    const { status, body: errBody } = mapErrorToHttp(err, requestId)

    if (errBody.code === "DUPLICATE_TITLE") {
      const existente = await findOrcamentoByTitulo(titulo)
      if (existente) errBody.details = { ...(errBody.details ?? {}), existente }
    }

    console.error("[POST /api/Orcamentos/gerar-proposta] erro", { ...errBody, stack: err?.stack })
    const res = NextResponse.json<ApiErrorShape>(errBody, { status })
    res.headers.set("X-Request-Id", requestId)
    return res
  }
}
