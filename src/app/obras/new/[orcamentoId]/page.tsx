// Server Component (criar obra a partir do orçamento)
import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { GetOrcamentoResult, ObraInfosVM, PedidoCompraVM } from "@/app/obras/lib/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Obras · Criar",
}

type Option = { value: string; label: string }

// helpers server-side
const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const nomeTelha = (it: any): string => ((it?.descricao ?? it?.nome ?? "") + "").trim()

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

  // opções de telha a partir do orçamento
  const telhaOptions: Option[] = Array.from(
    new Set((orc?.materiais?.telhas ?? [])
      .map((t: any) => String((t?.nome ?? t?.descricao ?? "")).trim())
      .filter(Boolean))
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

  // ===== pré-preenchimento do Pedido de Compra (SSR) =====
  const selTelha = (initial.telhaEscolhida ?? "").trim()
  const telhaItensRaw = (orc?.materiais?.telhas ?? []) as any[]

  // normaliza TODOS os itens de telha para o tipo rígido do front
  const telhaItens: NonNullable<PedidoCompraVM["telha"]>["itens"] = telhaItensRaw.map((t: any, idx: number) => {
    const descricao = nomeTelha(t)
    const quantidade = toNum(t?.quantidade)
    const precoUnitario = toNum(t?.preco)
    const frete = toNum(t?.frete)
    const total = precoUnitario * quantidade + frete
    return { id: idx, descricao, quantidade, precoUnitario, total }
  })

  const telhaItensSelecionados = selTelha
    ? telhaItens.filter((it) => it.descricao === selTelha)
    : []

  const telhaUnidades = telhaItensSelecionados.reduce((s, it) => s + toNum(it?.quantidade), 0)
  const telhaOrcamento = telhaItensSelecionados.reduce((s, it) => s + toNum(it?.total), 0)

  // ===== mapear ITENS DE MADEIRA (tipagem rígida exigida pelo front) =====
  const madeiraItens: NonNullable<PedidoCompraVM["madeira"]>["itens"] = (orc?.materiais?.madeiras ?? []).map((m: any, idx: number) => {
    const nome = String(m?.nome ?? "").trim()
    const componente = String(m?.componente ?? "").trim()
    const quantidade = toNum(m?.quantidade)
    const precoUnitario = toNum(m?.preco)
    const tamanho = toNum(m?.tamanho)
    const total = precoUnitario * quantidade
    return {
      id: idx,
      componente,
      madeiraNome: nome,
      descricao: nome,
      quantidade,
      tamanho,
      precoUnitario,
      total,
    }
  })

  // ===== mapear ITENS DE MATERIAIS GERAIS (tipagem rígida exigida pelo front) =====
  const materiaisItens: NonNullable<PedidoCompraVM["materiais"]>["itens"] = (orc?.materiais?.materiaisGerais ?? []).map((g: any, idx: number) => {
    const descricao = String(g?.nome ?? "").trim()
    const quantidade = toNum(g?.quantidade)
    const precoUnitario = toNum(g?.preco)
    const total = precoUnitario * quantidade
    return {
      id: idx,
      descricao,
      quantidade,
      precoUnitario,
      total,
    }
  })

  const pedidoInit: Partial<PedidoCompraVM> = {
    telha: {
      status: "Pendente",
      previsao: null,
      orcamento: telhaOrcamento,
      area: 0,
      itens: telhaItens,
      // @ts-expect-error campo auxiliar para a UI; o client pode recalcular
      unidades: telhaUnidades,
    },
    madeira: {
      status: "Pendente",
      previsao: null,
      fornecedorId: null,
      itens: madeiraItens,
      orcamento: Number(orc?.totais?.madeiras ?? 0),
    },
    materiais: {
      status: "Pendente",
      itens: materiaisItens,
    },
    andaimes: {
      status: "Pendente",
      fornecedorId: null,
      itens: [],
    },
  }

  return (
    <ObrasPage
      mode="new"
      orcamentoId={id}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      pedidoInit={pedidoInit}
    />
  )
}
