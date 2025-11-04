// Server Component (criar obra a partir do orçamento)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { GetOrcamentoResult, ObraInfosVM } from "@/app/obras/lib/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Título da aba (opcional por página)
export const metadata: Metadata = {
  title: "Obras · Criar",
}

type Option = { value: string; label: string }

export default async function ObraCreatePage({
  params,
}: {
  params: Promise<{ orcamentoId: string }>
}) {
  const { orcamentoId } = await params
  const id = Number(orcamentoId)
  if (!Number.isFinite(id)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  // Carrega orçamento + tipos de obra em paralelo
  const [resOrc, resTipos] = await Promise.all([
    fetch(`${base}/api/Orcamentos/${id}`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
      redirect: "manual",
    }),
    fetch(`${base}/api/tipos-obra?page=1&pageSize=100`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
  ])

  if (!resOrc.ok) notFound()
  const orc = (await resOrc.json()) as GetOrcamentoResult

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw)
    ? (tiposRaw.data ?? tiposRaw.items ?? tiposRaw.options ?? tiposRaw).map((x: any) => {
        const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
        const lab = String(label).trim()
        return lab ? { value: lab, label: lab } : null
      }).filter(Boolean)
    : []

  const telhaOptions: Option[] = Array.from(
    new Set((orc?.materiais?.telhas ?? []).map((t: any) => String(t?.nome ?? "").trim()).filter(Boolean))
  ).map((n) => ({ value: n, label: n }))

  const initial: Partial<ObraInfosVM> = {
    titulo: orc.titulo ?? undefined,
    tipoObra: orc.parametros?.tipoObra ?? "",
    largura: orc.parametros?.largura ?? null,
    comprimento: orc.parametros?.comprimento ?? null,
    telhaEscolhida: telhaOptions[0]?.value || "",
    status: "Assinatura de contrato" as any,
    cliente: {
      nome: orc.cliente?.nome ?? "",
      telefone: orc.cliente?.telefone ?? "",
      bairro: orc.cliente?.bairro ?? "",
      cidade: orc.cliente?.cidade ?? "",
    },
    endereco: {
      logradouro: "",
      bairro: orc.cliente?.bairro ?? "",
      cidade: orc.cliente?.cidade ?? "",
      mapsUrl: "",
    },
  }

  return (
    <ObrasPage
      mode="new"
      orcamentoId={id}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
    />
  )
}
