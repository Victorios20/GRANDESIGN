// Server Component (criar obra a partir do orçamento)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { GetOrcamentoResult, ObraInfosVM, PedidoCompraVM } from "@/app/obras/lib/types"
import type { FinanceiroVM } from "@/app/obras/_sections/Financeiro"

// catálogos/combos (SSR)
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Criar" }

type Option = { value: string; label: string }

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const nomeTelha = (it: any): string => ((it?.descricao ?? it?.nome ?? "") + "").trim()

export default async function ObraCreatePage({ params }: { params: Promise<{ orcamentoId: string }> }) {
  const { orcamentoId } = await params
  const id = Number(orcamentoId)
  if (!Number.isFinite(id)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  // Orçamento + Tipos + Catálogos + Fornecedores + Equipes
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

  const telhaOptions: Option[] = Array.from(
    new Set(
      (orc?.materiais?.telhas ?? [])
        .map((t: any) => String((t?.nome ?? t?.descricao ?? "")).trim())
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

  // ===== Pedido de Compra (pré-preenchido do orçamento) =====
  const selTelha = (initial.telhaEscolhida ?? "").trim()
  const telhaItensRaw = (orc?.materiais?.telhas ?? []) as any[]
  const telhaItens: NonNullable<PedidoCompraVM["telha"]>["itens"] = telhaItensRaw.map((t: any, idx: number) => {
    const descricao = nomeTelha(t)
    const quantidade = toNum(t?.quantidade)
    const precoUnitario = toNum(t?.preco)
    const frete = toNum(t?.frete)
    const total = precoUnitario * quantidade + frete
    return { id: idx, descricao, quantidade, precoUnitario, total }
  })
  const telhaItensSelecionados = selTelha ? telhaItens.filter((it) => it.descricao === selTelha) : []
  const telhaOrcamento = telhaItensSelecionados.reduce((s, it) => s + toNum(it?.total), 0)

  const madeiraItens: NonNullable<PedidoCompraVM["madeira"]>["itens"] = (
    orc?.materiais?.madeiras ?? []
  ).map((m: any, idx: number) => {
    const nome = String(m?.nome ?? "").trim()
    const componente = String(m?.componente ?? "").trim()
    const quantidade = toNum(m?.quantidade)
    const precoUnitario = toNum(m?.preco)
    const tamanho = toNum(m?.tamanho)
    const total = precoUnitario * quantidade
    return { id: idx, componente, madeiraNome: nome, descricao: nome, quantidade, tamanho, precoUnitario, total }
  })

  const materiaisItens: NonNullable<PedidoCompraVM["materiais"]>["itens"] = (
    orc?.materiais?.materiaisGerais ?? []
  ).map((g: any, idx: number) => {
    const descricao = String(g?.nome ?? "").trim()
    const quantidade = toNum(g?.quantidade)
    const precoUnitario = toNum(g?.preco)
    const total = precoUnitario * quantidade
    return { id: idx, descricao, quantidade, precoUnitario, total }
  })

  const pedidoInit: Partial<PedidoCompraVM> = {
    telha: { status: "Pendente", previsao: null, orcamento: telhaOrcamento, area: 0, itens: telhaItens },
    madeira: {
      status: "Pendente",
      previsao: null,
      fornecedorId: null,
      itens: madeiraItens,
      orcamento: Number(orc?.totais?.madeiras ?? 0),
    },
    materiais: { status: "Pendente", itens: materiaisItens },
    andaimes: { status: "Pendente", fornecedorId: null, itens: [] },
  }

  // Catálogo + componentes
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

  // Equipes -> Options (já disponível para o componente Execução)
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

  // Financeiro: mão de obra = empresaPS
  const financeiroInit: Partial<FinanceiroVM> = {
    maoDeObra: Number(orc?.totais?.empresaPS ?? 0),
  }

  return (
    <ObrasPage
      mode="new"
      orcamentoId={id}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      pedidoInit={pedidoInit}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      financeiroInit={financeiroInit}
      equipeOptions={equipesOptions}
    />

  )
}
