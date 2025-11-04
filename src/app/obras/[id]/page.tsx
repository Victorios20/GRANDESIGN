// Server Component (visualizar/editar obra existente)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { ObraDetalheDTO, ObraInfosVM, GetOrcamentoResult } from "@/app/obras/lib/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Título da aba (opcional por página)
export const metadata: Metadata = {
  title: "Obras · Detalhe",
}

type Option = { value: string; label: string }

export default async function ObraViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const obraId = Number(idStr)
  if (!Number.isFinite(obraId)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  // Obra + Tipos (e, se existir, orcamento → telhas)
  const [resObra, resTipos] = await Promise.all([
    fetch(`${base}/api/obras/${obraId}/detalhado`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
    fetch(`${base}/api/tipos-obra?page=1&pageSize=100`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
  ])
  if (!resObra.ok) notFound()

  const dto = (await resObra.json()) as ObraDetalheDTO

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw)
    ? (tiposRaw.data ?? tiposRaw.items ?? tiposRaw.options ?? tiposRaw).map((x: any) => {
        const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
        const lab = String(label).trim()
        return lab ? { value: lab, label: lab } : null
      }).filter(Boolean)
    : []

  // telhas: tentar via orçamento vinculado (se existir)
  let telhaOptions: Option[] = []
  const orcId = dto?.orcamento?.id
  if (Number.isFinite(orcId)) {
    const resOrc = await fetch(`${base}/api/Orcamentos/${orcId}`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    })
    if (resOrc.ok) {
      const orc = (await resOrc.json()) as GetOrcamentoResult
      telhaOptions = Array.from(
        new Set((orc?.materiais?.telhas ?? []).map((t: any) => String(t?.nome ?? "").trim()).filter(Boolean))
      ).map((n) => ({ value: n, label: n }))
    }
  }

  const initial: Partial<ObraInfosVM> = {
    titulo: undefined,
    tipoObra: dto.dadosObra?.tipoObra ?? "",
    largura: dto.dadosObra?.largura ?? 0,
    comprimento: dto.dadosObra?.comprimento ?? 0,
    telhaEscolhida: dto.dadosObra?.telhaEscolhida ?? "",
    status: dto.dadosObra?.status as any,
    cliente: {
      nome: dto.cliente?.nome ?? "",
      telefone: dto.cliente?.telefone ?? "",
      cpf: dto.cliente?.cpf ?? "",
      bairro: dto.cliente?.bairro ?? "",
      cidade: dto.cliente?.cidade?.nome ?? "",
    },
    endereco: {
      logradouro: dto.dadosObra?.endereco ?? "",
      bairro: dto.cliente?.bairro ?? "",
      cidade: dto.cliente?.cidade?.nome ?? "",
      mapsUrl: dto.dadosObra?.mapsUrl ?? "",
    },
    observacoes: dto.dadosObra?.observacoes ?? null,
  }

  return (
    <ObrasPage
      mode="view"
      obraId={obraId}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
    />
  )
}
