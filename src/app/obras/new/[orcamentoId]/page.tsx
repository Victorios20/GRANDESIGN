// Server Component (criar obra a partir do orçamento)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { GetOrcamentoResult, ObraInfosVM } from "@/app/obras/lib/types"
import type { FinanceiroVM } from "@/app/obras/_sections/Financeiro"

// catálogos/combos (SSR)
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Criar" }

type Option = { value: string; label: string }

export default async function ObraCreatePage({ params }: { params: Promise<{ orcamentoId: string }> }) {
  const { orcamentoId } = await params
  const id = Number(orcamentoId)
  if (!Number.isFinite(id)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  const [resOrc, resTipos, componentes, geraisDB, telhasDB, resFornMadeira, resFornAndaimes, resEquipes] =
    await Promise.all([
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
      listarComponentesDB(),
      listarMateriaisGerais(),
      listarTelhas(),
      fetch(`${base}/api/fornecedores?tipo=madeira`, {
        cache: "no-store",
        headers: { cookie },
        credentials: "include",
      }),
      fetch(`${base}/api/fornecedores?tipo=andaimes`, {
        cache: "no-store",
        headers: { cookie },
        credentials: "include",
      }),
      fetch(`${base}/api/equipes?page=1&pageSize=200`, {
        cache: "no-store",
        headers: { cookie },
        credentials: "include",
      }),
    ])

  if (!resOrc.ok) notFound()
  const orc = (await resOrc.json()) as GetOrcamentoResult

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw)
    ? ((tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw) as any[])
        .map((x: any) => {
          const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
          const lab = String(label).trim()
          return lab ? { value: lab, label: lab } : null
        })
        .filter((v): v is Option => v !== null)
    : []

  const telhaOptions: Option[] = Array.from(
    new Set(
      (orc?.materiais?.telhas ?? [])
        .map((t: any) => String(t?.nome ?? t?.descricao ?? "").trim())
        .filter(Boolean)
    )
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
      cpf: (orc as any)?.cliente?.cpf ?? "",
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

  const catalogo = {
    madeiras: [],
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
  }

  const toOptions = (arr: any[]): Option[] =>
    Array.isArray(arr)
      ? arr
          .map((f: any) => {
            const label = String(f?.nome ?? f?.razao_social ?? f?.label ?? "").trim()
            const value = String(f?.id ?? f?.fornecedor_id ?? label)
            return label ? { value, label } : null
          })
          .filter((v): v is Option => v !== null)
      : []

  const fornecedoresMadeiraJson = await resFornMadeira.json().catch(() => [])
  const fornecedoresAndaimesJson = await resFornAndaimes.json().catch(() => [])

  const fornecedoresMadeiraOptions: Option[] = toOptions((fornecedoresMadeiraJson as any)?.data ?? fornecedoresMadeiraJson)
  const fornecedoresAndaimesOptions: Option[] = toOptions((fornecedoresAndaimesJson as any)?.data ?? fornecedoresAndaimesJson)

  const equipesJson = await resEquipes.json().catch(() => ({ data: [] }))
  const equipesOptions: Option[] = Array.isArray(equipesJson?.data)
    ? (equipesJson.data as any[])
        .map((e: any) => {
          const label = String(e?.nome ?? "").trim()
          const value = String(e?.id ?? "")
          return label ? { value, label } : null
        })
        .filter((v): v is Option => v !== null)
    : []

  const financeiroInit: Partial<FinanceiroVM> = {
    maoDeObra: Number(orc?.totais?.empresaPS ?? 0),
  }

  const orcamentoLink = `${proto}://${host}/orcamento/detalhes/${id}`
  const propostaLink = String(orc?.links?.slideUrl ?? "").trim()
  const anexosInit = {
    orcamento: orcamentoLink,
    proposta: propostaLink,
    contrato: "",
    ordemServico: "",
  }

  return (
    <ObrasPage
      mode="new"
      orcamentoId={id}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      financeiroInit={financeiroInit}
      equipeOptions={equipesOptions}
      anexosInit={anexosInit}
    />
  )
}
