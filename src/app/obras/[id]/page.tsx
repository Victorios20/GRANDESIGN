// Server Component (visualizar/editar obra existente)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { ObraDetalheDTO, ObraInfosVM, GetOrcamentoResult } from "@/app/obras/lib/types"

// catálogos/combos (SSR)
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Detalhe" }

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

  // Obra + Tipos + Catálogos + Fornecedores + Equipes
  const [resObra, resTipos, componentes, geraisDB, telhasDB, resFornMadeira, resFornAndaimes, resEquipes] =
    await Promise.all([
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

  if (!resObra.ok) notFound()

  const dtoJson = await resObra.json()
  // rotas padronizadas retornam { data }
  const dto = (dtoJson?.data ?? dtoJson) as ObraDetalheDTO

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(
    tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw
  )
    ? (tiposRaw.data ?? tiposRaw.items ?? tiposRaw.options ?? tiposRaw)
        .map((x: any) => {
          const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
          const lab = String(label).trim()
          return lab ? { value: lab, label: lab } : null
        })
        .filter(Boolean)
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
        new Set(
          (orc?.materiais?.telhas ?? [])
            .map((t: any) => String((t?.nome ?? t?.descricao ?? "")).trim())
            .filter(Boolean)
        )
      ).map((n) => ({ value: n, label: n }))
    }
  }

  const initial: Partial<ObraInfosVM> = {
    titulo: undefined,
    tipoObra: dto.dadosObra?.tipoObra ?? "",
    largura: dto.dadosObra?.largura ?? 0,
    comprimento: dto.dadosObra?.comprimento ?? 0,
    telhaEscolhida: dto.dadosObra?.telhaEscolhida ?? "",
    status: (dto.dadosObra?.status as any),
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

  // Catálogo para comboboxes do Pedido de Compra (edição inline)
  const catalogo = {
    madeiras: [], // carregadas no client por fornecedor selecionado
    materiaisGerais: geraisDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
    telhas: telhasDB.map((m) => ({ nome: m.descricao, preco: Number(m.preco_unitario) })),
  }

  // Fornecedores -> Options
  const toOptions = (arr: any[]): Option[] =>
    Array.isArray(arr)
      ? arr
          .map((f: any) => {
            const label = String(f?.nome ?? f?.razao_social ?? f?.label ?? "").trim()
            const value = String(f?.id ?? f?.fornecedor_id ?? label)
            return label ? { value, label } : null
          })
          .filter(Boolean) as Option[]
      : []

  const fornecedoresMadeiraJson = await resFornMadeira.json().catch(() => [])
  const fornecedoresAndaimesJson = await resFornAndaimes.json().catch(() => [])

  const fornecedoresMadeiraOptions: Option[] = toOptions(
    (fornecedoresMadeiraJson as any)?.data ?? fornecedoresMadeiraJson
  )
  const fornecedoresAndaimesOptions: Option[] = toOptions(
    (fornecedoresAndaimesJson as any)?.data ?? fornecedoresAndaimesJson
  )

  // Equipes -> Options
  const equipesJson = await resEquipes.json().catch(() => ({ data: [] }))
  const equipesOptions: Option[] = Array.isArray(equipesJson?.data)
    ? equipesJson.data
        .map((e: any) => {
          const label = String(e?.nome ?? "").trim()
          const value = String(e?.id ?? "")
          return label ? { value, label } : null
        })
        .filter(Boolean)
    : []

  // ===== Anexos (VIEW/EDIT) =====
  const isLocalhost = host.includes("localhost")
  const orcamentoLink =
    Number.isFinite(orcId) && orcId
      ? `${proto}://${host}/orcamento/detalhes/${orcId}`
      : ""

  // Esses campos dependem do DTO já trazer anexos (obra) e, como fallback, do orçamento:
  const propostaFromObra = (dto as any)?.anexos?.proposta ?? (dto as any)?.proposta ?? ""
  const contratoFromObra = (dto as any)?.anexos?.contrato ?? (dto as any)?.contrato ?? ""
  const osFromObra = (dto as any)?.anexos?.ordemServico ?? (dto as any)?.ordemServico ?? ""

  // Fallback para proposta do orçamento (link_slide)
let propostaFromOrcamento = ""
if (Number.isFinite(orcId)) {
  try {
    const resOrc = await fetch(`${base}/api/Orcamentos/${orcId}`, { /* ... */ })
    if (resOrc.ok) {
      const orc = (await resOrc.json()) as GetOrcamentoResult
      propostaFromOrcamento = String(orc?.links?.slideUrl ?? "").trim()
    }
  } catch {
    // ignora
  }
}


  const anexosInit = {
    orcamento: orcamentoLink,
    proposta: String(propostaFromObra || propostaFromOrcamento || ""),
    contrato: String(contratoFromObra || ""),
    ordemServico: String(osFromObra || ""),
  }

  return (
    <ObrasPage
      mode="view"
      obraId={obraId}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      equipeOptions={equipesOptions}
      anexosInit={anexosInit}
    />
  )
}
