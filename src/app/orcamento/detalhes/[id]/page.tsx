// src/app/Orcamento/detalhes/[id]/page.tsx
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import DetalheOrcamento from "./DetalheOrcamento"

export const dynamic = "force-dynamic"
export const revalidate = 0

// título da aba dinâmico: "orçamento - {título}"
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  try {
    const { id } = await params
    const numId = Number(id)
    if (!Number.isFinite(numId)) return { title: "orçamento" }

    const h = await nextHeaders()
    const cookie = h.get("cookie") ?? ""
    const proto = h.get("x-forwarded-proto") ?? "http"
    const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
    const base  = `${proto}://${host}`

    const res = await fetch(`${base}/api/Orcamentos/${numId}`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
      redirect: "manual",
    })

    if (!res.ok) return { title: "orçamento" }

    const data = (await res.json()) as { titulo?: string | null }
    const titulo = (data?.titulo || "").trim()
    return { title: titulo ? `orçamento - ${titulo}` : "orçamento" }
  } catch {
    return { title: "orçamento" }
  }
}

type GetOrcamentoResult = {
  id: number
  titulo: string
  cliente: { nome: string; telefone: string; bairro: string; cidade: string | null }
  parametros: {
    tipoObra: string | null
    largura: number | null
    comprimento: number | null
    larguraMaior: number | null
    larguraMenor: number | null
    comprimentoMaior: number | null
    comprimentoMenor: number | null
  }
  materiais: {
    madeiras: Array<{ nome: string; componente: string | null; quantidade: number; preco: number; tamanho?: number | null }>
    materiaisGerais: Array<{ nome: string; quantidade: number; preco: number }>
    telhas: Array<{ nome: string; quantidade: number; preco: number; frete?: number | null }>
  }
  totais: { madeiras: number; materiais: number; comissao: number; empresaPS: number; empresaGD: number; frete: number }
  links: { slideUrl: string | null; pdfUrl: string | null }
  telhaValores: Record<string, { pix: number; x10: number; x18: number }>
  dataCriacao: string | null
  dataUltimaAlteracao: string
  createdBy: { id: number; name: string; email: string } | null
  updatedBy: { id: number; name: string; email: string } | null
}

export type DetalheVM = {
  id: number
  titulo: string | null
  cliente: { nome: string; telefone?: string | null; bairro?: string | null; cidade?: string | null }
  tipoObra: string | null
  dimensoes: {
    largura: number | null
    comprimento: number | null
    larguraMenor: number | null
    larguraMaior: number | null
    comprimentoMenor: number | null
    comprimentoMaior: number | null
  }
  materiais: Array<{
    tipo: "madeira" | "geral" | "telha"
    nome: string
    componente?: string | null
    quantidade: number
    tamanho?: number | null
    precoUnit: number
    frete?: number | null
  }>
  totais: { madeiras: number; materiais: number; comissao: number; empresaPS: number; empresaGD: number; frete: number; totalGeral: number }
  links: { slideUrl: string | null; pdfUrl: string | null }
  telhaValores: Record<string, { pix?: number; "10×"?: number; "18×"?: number }>
  dataCriacao: string | null
  dataUltimaAlteracao: string
  createdBy: { id: number; name: string; email: string } | null
  updatedBy: { id: number; name: string; email: string } | null
}

function normalize(dto: GetOrcamentoResult): DetalheVM {
  const materiais: DetalheVM["materiais"] = [
    ...dto.materiais.madeiras.map(m => ({
      tipo: "madeira" as const,
      nome: m.nome,
      componente: m.componente ?? null,
      quantidade: m.quantidade,
      tamanho: m.tamanho ?? null,
      precoUnit: m.preco,
    })),
    ...dto.materiais.materiaisGerais.map(m => ({
      tipo: "geral" as const,
      nome: m.nome,
      quantidade: m.quantidade,
      precoUnit: m.preco,
    })),
    ...dto.materiais.telhas.map(m => ({
      tipo: "telha" as const,
      nome: m.nome,
      quantidade: m.quantidade,
      precoUnit: m.preco,
      frete: m.frete ?? 0,
    })),
  ]

  const totalGeral =
    (dto.totais?.madeiras ?? 0) +
    (dto.totais?.materiais ?? 0) +
    (dto.totais?.comissao ?? 0) +
    (dto.totais?.empresaPS ?? 0) +
    (dto.totais?.empresaGD ?? 0) +
    (dto.totais?.frete ?? 0)

  const telhaValores: DetalheVM["telhaValores"] = {}
  for (const [tipo, vals] of Object.entries(dto.telhaValores || {})) {
    telhaValores[tipo] = {
      pix: Number(vals.pix) || 0,
      "10×": Number(vals.x10) || 0,
      "18×": Number(vals.x18) || 0,
    }
  }

  return {
    id: dto.id,
    titulo: dto.titulo ?? null,
    cliente: { ...dto.cliente },
    tipoObra: dto.parametros.tipoObra ?? null,
    dimensoes: {
      largura: dto.parametros.largura,
      comprimento: dto.parametros.comprimento,
      larguraMenor: dto.parametros.larguraMenor,
      larguraMaior: dto.parametros.larguraMaior,
      comprimentoMenor: dto.parametros.comprimentoMenor,
      comprimentoMaior: dto.parametros.comprimentoMaior,
    },
    materiais,
    totais: { ...dto.totais, totalGeral },
    links: dto.links,
    telhaValores,
    dataCriacao: dto.dataCriacao ?? null,
    dataUltimaAlteracao: dto.dataUltimaAlteracao,
    createdBy: dto.createdBy ?? null,
    updatedBy: dto.updatedBy ?? null,
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""

  // Monta base absoluta (funciona em localhost e homolog/produção)
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base  = `${proto}://${host}`

  const res = await fetch(`${base}/api/Orcamentos/${id}`, {
    cache: "no-store",
    headers: { cookie },
    credentials: "include",
    redirect: "manual",
  })

  if (res.status === 401 || res.status === 302 || res.status === 307 || res.status === 308) {
    return <div>Você precisa estar autenticado para ver os detalhes.</div>
  }
  if (!res.ok) {
    notFound()
  }

  const data = (await res.json()) as GetOrcamentoResult
  const detailUrl = `${base}/orcamento/detalhes/${id}`

  const vm = normalize(data)
  return <DetalheOrcamento detalhe={vm} detailUrl={detailUrl} />
}
