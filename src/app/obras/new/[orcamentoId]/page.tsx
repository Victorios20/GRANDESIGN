import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound, redirect } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type { GetOrcamentoResult, ObraInfosVM } from "@/app/obras/lib/types"
import type { FinanceiroVM } from "@/app/obras/_sections/Financeiro"

import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Criar" }

type Option = { value: string; label: string }

type PedidoInitItem = {
  id?: number
  descricao: string
  quantidade: number
  tamanho: number | null
  precoUnitario: number
  total: number
}

type PedidoInit = {
  madeira?: {
    categoria: "MADEIRA"
    descricao?: string | null
    status?: string | null
    fornecedorId?: number | null
    frete?: number | null
    valorOrcado?: number | null
    itens: PedidoInitItem[]
  }
  materiais?: {
    categoria: "MATERIAIS"
    descricao?: string | null
    status?: string | null
    fornecedorId?: number | null
    frete?: number | null
    valorOrcado?: number | null
    itens: PedidoInitItem[]
  }
  telhas?: Array<{
    categoria: "TELHA"
    descricao?: string | null
    status?: string | null
    fornecedorId?: number | null
    frete?: number | null
    valorOrcado?: number | null
    itens: PedidoInitItem[]
  }>
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const toText = (v: any) => String(v ?? "").trim()

function buildPedidoInitFromOrcamento(orc: GetOrcamentoResult, orcamentoId: number): PedidoInit {
  const madeiras = Array.isArray((orc as any)?.materiais?.madeiras) ? ((orc as any).materiais.madeiras as any[]) : []
  const materiais = Array.isArray((orc as any)?.materiais?.materiaisGerais)
    ? (((orc as any).materiais.materiaisGerais as any[]) ?? [])
    : []
  const telhas = Array.isArray((orc as any)?.materiais?.telhas) ? (((orc as any).materiais.telhas as any[]) ?? []) : []

  const mapLinhaToItem = (row: any, opts?: { forceTamanhoNull?: boolean }): PedidoInitItem | null => {
    const descricao = toText(row?.nome ?? row?.descricao)
    const quantidade = toNum(row?.quantidade)
    const precoUnitario = toNum(row?.preco ?? row?.precoUnitario ?? row?.preco_unitario)
    if (!descricao) return null
    if (!(quantidade > 0)) return null
    if (!(precoUnitario >= 0)) return null

    const tamanhoRaw = opts?.forceTamanhoNull ? null : row?.tamanho
    const tamanho = tamanhoRaw === null || tamanhoRaw === undefined || String(tamanhoRaw).trim() === "" ? null : toNum(tamanhoRaw)

    const total =
      tamanho && tamanho > 0
        ? Number((quantidade * tamanho * precoUnitario).toFixed(2))
        : Number((quantidade * precoUnitario).toFixed(2))

    return {
      id: Number(row?.id ?? 0) || undefined,
      descricao,
      quantidade,
      tamanho,
      precoUnitario,
      total,
    }
  }

  const sumOrcado = (itens: PedidoInitItem[]) => Number(itens.reduce((acc, it) => acc + toNum(it.total), 0).toFixed(2))

  const madeiraItens = madeiras.map((m) => mapLinhaToItem(m)).filter((x): x is PedidoInitItem => !!x)
  const materiaisItens = materiais
    .map((m) => mapLinhaToItem(m, { forceTamanhoNull: true }))
    .filter((x): x is PedidoInitItem => !!x)

  const fornecedorMadeiraId = (() => {
    const raw = (orc as any)?.fornecedorId ?? (orc as any)?.fornecedor_id ?? null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  const out: PedidoInit = {}

  if (madeiraItens.length > 0) {
    out.madeira = {
      categoria: "MADEIRA",
      descricao: `Madeira (pré-preenchido do orçamento #${orcamentoId})`,
      status: "PENDENTE",
      fornecedorId: fornecedorMadeiraId,
      frete: null,
      valorOrcado: sumOrcado(madeiraItens),
      itens: madeiraItens,
    }
  }

  if (materiaisItens.length > 0) {
    out.materiais = {
      categoria: "MATERIAIS",
      descricao: `Materiais (pré-preenchido do orçamento #${orcamentoId})`,
      status: "PENDENTE",
      fornecedorId: null,
      frete: null,
      valorOrcado: sumOrcado(materiaisItens),
      itens: materiaisItens,
    }
  }

  const byNome = new Map<string, any[]>()
  for (const t of telhas) {
    const nome = toText(t?.nome ?? t?.descricao)
    if (!nome) continue
    const list = byNome.get(nome) ?? []
    list.push(t)
    byNome.set(nome, list)
  }

  const telhaPedidos: PedidoInit["telhas"] = []
  for (const [nome, rows] of byNome.entries()) {
    const validRows = Array.isArray(rows) ? rows : []
    const quantidadeSum = validRows.reduce((acc, r) => acc + toNum(r?.quantidade), 0)
    if (!(quantidadeSum > 0)) continue

    const precoUnitario = (() => {
      const first = validRows.find((r) => Number(r?.preco) > 0 || Number(r?.precoUnitario) > 0)
      return toNum(first?.preco ?? first?.precoUnitario ?? first?.preco_unitario)
    })()

    const total = Number((quantidadeSum * precoUnitario).toFixed(2))

    const freteMax = (() => {
      const nums = validRows.map((r) => toNum(r?.frete)).filter((n) => Number.isFinite(n) && n > 0)
      if (nums.length === 0) return null
      return Math.max(...nums)
    })()

    const itemAgregado: PedidoInitItem = {
      id: undefined,
      descricao: nome,
      quantidade: Number(quantidadeSum.toFixed(3)),
      tamanho: null,
      precoUnitario,
      total,
    }

    telhaPedidos.push({
      categoria: "TELHA",
      descricao: `Telha: ${nome} (pré-preenchido do orçamento #${orcamentoId})`,
      status: "PENDENTE",
      fornecedorId: null,
      frete: freteMax,
      valorOrcado: total,
      itens: [itemAgregado],
    })
  }

  if (telhaPedidos.length > 0) out.telhas = telhaPedidos

  return out
}

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

  if (orc.lancadoObra && Number.isFinite(Number(orc.obraId)) && Number(orc.obraId) > 0) {
    redirect(`/obras/${Number(orc.obraId)}`)
  }

  console.log("[ObraCreatePage] DTO /api/Orcamentos:", JSON.stringify(orc, null, 2))

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

  const clienteId =
    Number((orc as any)?.cliente?.id ?? (orc as any)?.cliente_id ?? (orc as any)?.clienteId ?? 0) || undefined

  const clienteBairro = orc.cliente?.bairro || ""
  const clienteCidade = orc.cliente?.cidade || ""
  const fallbackTitulo = `${orc.cliente?.nome || "Sem Nome"} ${clienteBairro || clienteCidade ? `[${[clienteBairro, clienteCidade].filter(Boolean).join(" - ")}]` : ""}`.trim()

  const initial: Partial<ObraInfosVM> = {
    titulo: orc.titulo || fallbackTitulo,
    tipoObra: orc.parametros?.tipoObra ?? "",
    largura: orc.parametros?.largura ?? null,
    comprimento: orc.parametros?.comprimento ?? null,
    larguraMaior: orc.parametros?.larguraMaior ?? null,
    larguraMenor: orc.parametros?.larguraMenor ?? null,
    comprimentoMaior: orc.parametros?.comprimentoMaior ?? null,
    comprimentoMenor: orc.parametros?.comprimentoMenor ?? null,
    telhaEscolhida: telhaOptions[0]?.value || "",
    status: "Assinatura de contrato" as any,
    cliente: {
      id: clienteId,
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

  // REMOVED: Frontend generation of "temporary items". Now handled in backend (create-obra-db.ts).
  // const pedidoInit = buildPedidoInitFromOrcamento(orc, id)
  // console.log("[ObraCreatePage] pedidoInit (pré-preenchido):", JSON.stringify(pedidoInit, null, 2))

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
      pedidoInit={{}} // Empty, effectively disabling temporary orders
    />
  )
}
