import type { Metadata } from "next"
import { headers as nextHeaders } from "next/headers"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type {
  ObraDetalheDTO,
  ObraInfosVM,
  FormaPagamento,
  PagamentoStatus,
  PedidoCompraVM,
  ObraStatus,
  PedidoStatusPadrao,
  PedidoStatusMateriais,
  PedidoStatusAndaimes,
} from "@/app/obras/lib/types"
import type { ImgItem } from "@/app/obras/_sections/ObsImagens"

import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Detalhe" }

type Option = { value: string; label: string }

function mapObraStatus(raw: unknown): ObraStatus {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "ASSINATURA_DE_CONTRATO":
      return "Assinatura de contrato"
    case "AGUARDANDO_VALIDACAO_TECNICA":
      return "Aguardando validação técnica"
    case "COMPRAS":
      return "Compras"
    case "A_INICIAR":
      return "À iniciar"
    case "EXECUCAO":
      return "Execução"
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "PENDENCIA":
      return "Pendência"
    case "FINALIZADO":
      return "Finalizado"
    default:
      return "Assinatura de contrato"
  }
}

function mapFormaPagamento(raw: unknown): FormaPagamento | null {
  const s = String(raw ?? "").trim().toLowerCase()
  if (!s) return null
  if (s === "pix") return "Pix"
  if (s === "6x") return "6x"
  if (s === "10x") return "10x"
  if (s === "12x") return "12x"
  if (s === "16x") return "16x"
  return null
}

function mapStatusPagamento(raw: unknown): PagamentoStatus {
  const s = String(raw ?? "").trim().toUpperCase()
  return s === "EFETUADO" ? "Efetuado" : "Pendente"
}

function mapPedidoStatusPadrao(raw: unknown): PedidoStatusPadrao {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "PEDIDO_FEITO":
      return "Pedido feito"
    case "ENTREGUE":
      return "Entregue"
    default:
      return "Pendente"
  }
}

function mapPedidoStatusMateriais(raw: unknown): PedidoStatusMateriais {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "EM_ESTOQUE":
      return "Em estoque"
    case "ENTREGUE":
      return "Entregue"
    default:
      return "Pendente"
  }
}

function mapPedidoStatusAndaimes(raw: unknown): PedidoStatusAndaimes {
  const s = String(raw ?? "").toUpperCase()
  switch (s) {
    case "PEDIDO_FEITO":
      return "Pedido feito"
    case "ENTREGUE":
      return "Entregue"
    case "A_COLETAR":
      return "À coletar"
    case "COLETADO":
      return "Coletado"
    default:
      return "Pendente"
  }
}

type CidadeRow = { id: number; nome: string }

function normalizeCidades(payload: unknown): CidadeRow[] {
  const arr = (payload as any)?.data ?? (payload as any)?.items ?? (payload as any)?.rows ?? payload
  if (!Array.isArray(arr)) return []
  return arr
    .map((c: any) => {
      const idNum = Number(c?.id)
      const nome = String(c?.nome ?? "").trim()
      if (!Number.isFinite(idNum) || !nome) return null
      return { id: idNum, nome }
    })
    .filter(Boolean) as CidadeRow[]
}

function normalizeImagens(dto: ObraDetalheDTO | null | undefined): ImgItem[] {
  const arr = (dto as any)?.imagens ?? []
  if (!Array.isArray(arr) || arr.length === 0) return []

  const mapped = arr
    .map((img: any, i: number) => {
      const idNum = Number(img?.id)
      const url = String(img?.url ?? "").trim()
      if (!url) return null
      const ordemRaw = img?.ordem
      const ordem = ordemRaw === null || ordemRaw === undefined ? i + 1 : Number(ordemRaw)
      return {
        id: Number.isFinite(idNum) ? idNum : undefined,
        url,
        legenda: img?.legenda ?? null,
        ordem: Number.isFinite(ordem) ? ordem : i + 1,
      } as ImgItem
    })
    .filter(Boolean) as ImgItem[]

  mapped.sort((a, b) => {
    const ao = Number(a?.ordem ?? 999999)
    const bo = Number(b?.ordem ?? 999999)
    if (ao !== bo) return ao - bo
    const ai = Number(a?.id ?? 999999)
    const bi = Number(b?.id ?? 999999)
    return ai - bi
  })

  return mapped
}

function getPedidoByCategoria(dto: any, categoria: string) {
  const arr = (dto?.pedidosCompra ?? dto?.pedidos_compra ?? []) as any[]
  if (!Array.isArray(arr)) return null
  const norm = (s: any) => String(s ?? "").trim().toUpperCase()
  return arr.find((p) => norm(p?.categoria) === norm(categoria)) ?? null
}

function parseISODate(s?: string | null) {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null
}

function pickOrcamentoId(dto: any): number | undefined {
  const candidates = [dto?.orcamentoId, dto?.orcamento?.id, dto?.orcamento_id, dto?.orcamento?.orcamentoId]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

export default async function ObraViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const obraId = Number(idStr)
  if (!Number.isFinite(obraId)) notFound()

  const h = await nextHeaders()
  const cookie = h.get("cookie") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const base = `${proto}://${host}`

  const [
    resObra,
    resTipos,
    componentes,
    geraisDB,
    telhasDB,
    resFornTelha,
    resFornMadeira,
    resFornAndaimes,
    resEquipes,
    resCidades,
  ] = await Promise.all([
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
    fetch(`${base}/api/fornecedores?tipo=telha`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
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
    fetch(`${base}/api/cidades`, {
      cache: "no-store",
      headers: { cookie },
      credentials: "include",
    }),
  ])

  if (!resObra.ok) notFound()

  const dtoJson = await resObra.json()
  const dto = (dtoJson?.data ?? dtoJson) as any as ObraDetalheDTO

  console.log("[/obras/[id]] DTO recebido:", JSON.stringify(dto, null, 2))

  const cidadesRaw = await resCidades.json().catch(() => [])
  const cidades = normalizeCidades(cidadesRaw)
  const cidadeMap = new Map<number, string>(cidades.map((c) => [c.id, c.nome]))

  const tiposRaw = await resTipos.json().catch(() => null)
  const tiposObraOptions: Option[] = Array.isArray(tiposRaw?.data ?? tiposRaw?.items ?? tiposRaw?.options ?? tiposRaw)
    ? (tiposRaw.data ?? tiposRaw.items ?? tiposRaw.options ?? tiposRaw)
        .map((x: any) => {
          const label = x?.tipo_obra ?? x?.nome ?? x?.descricao ?? x?.label ?? ""
          const lab = String(label).trim()
          return lab ? { value: lab, label: lab } : null
        })
        .filter(Boolean)
    : []

  const telhaOptions: Option[] = Array.from(
    new Set((telhasDB ?? []).map((m) => String(m?.descricao ?? "").trim()).filter(Boolean))
  ).map((n) => ({ value: n, label: n }))

  const cidadeIdDTO = (dto as any)?.cliente?.cidade?.id ?? null
  const cidadeNomeDTO = (dto as any)?.cliente?.cidade?.nome ?? null
  const cidadeNomeFinal =
    (cidadeNomeDTO ? String(cidadeNomeDTO).trim() : "") ||
    (Number.isFinite(Number(cidadeIdDTO)) && cidadeIdDTO != null ? cidadeMap.get(Number(cidadeIdDTO)) ?? "" : "")

  const imagensInit = normalizeImagens(dto)

  const obraDTO = (dto as any)?.obra ?? null

  const initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] } = {
    titulo: (dto as any)?.titulo ?? "",
    tipoObra: String(obraDTO?.tipo ?? ""),
    largura: Number(obraDTO?.largura ?? 0),
    comprimento: Number(obraDTO?.comprimento ?? 0),
    telhaEscolhida: String(obraDTO?.telha ?? ""),
    status: mapObraStatus((dto as any)?.status),
    cliente: {
      id: (dto as any)?.cliente?.id ?? undefined,
      nome: (dto as any)?.cliente?.nome ?? "",
      telefone: (dto as any)?.cliente?.telefone ?? "",
      cpf: (dto as any)?.cliente?.cpf ?? "",
      bairro: (dto as any)?.cliente?.bairro ?? "",
      cidadeId: (dto as any)?.cliente?.cidade?.id ?? null,
      cidade: cidadeNomeFinal || "",
    },
    endereco: {
      logradouro: String(obraDTO?.endereco ?? ""),
      bairro: (dto as any)?.cliente?.bairro ?? "",
      cidade: cidadeNomeFinal || "",
      mapsUrl: String(obraDTO?.mapsUrl ?? ""),
    },
    observacoes: obraDTO?.observacoes ?? null,
    imagens: imagensInit,
  }

  const catalogo = {
    madeiras: [] as { nome: string; preco: number }[],
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
          .filter(Boolean) as Option[]
      : []

  const fornecedoresTelhaJson = await resFornTelha.json().catch(() => [])
  const fornecedoresMadeiraJson = await resFornMadeira.json().catch(() => [])
  const fornecedoresAndaimesJson = await resFornAndaimes.json().catch(() => [])

  const fornecedoresTelhaOptions: Option[] = toOptions((fornecedoresTelhaJson as any)?.data ?? fornecedoresTelhaJson)
  const fornecedoresMadeiraOptions: Option[] = toOptions(
    (fornecedoresMadeiraJson as any)?.data ?? fornecedoresMadeiraJson
  )
  const fornecedoresAndaimesOptions: Option[] = toOptions(
    (fornecedoresAndaimesJson as any)?.data ?? fornecedoresAndaimesJson
  )

  const equipesJson = await resEquipes.json().catch(() => ({ data: [] }))
  const equipesOptions: Option[] = Array.isArray((equipesJson as any)?.data)
    ? ((equipesJson as any).data as any[])
        .map((e: any) => {
          const label = String(e?.nome ?? "").trim()
          const value = String(e?.id ?? "")
          return label ? { value, label } : null
        })
        .filter(Boolean) as Option[]
    : []

  const ordemServicoIdRaw =
    (dto as any)?.ordemServico?.id ?? (dto as any)?.ordemServico?.ordemServicoId ?? (dto as any)?.ordem_servico?.id

  const ordemServicoId = Number.isFinite(Number(ordemServicoIdRaw)) ? Number(ordemServicoIdRaw) : null

  const finDTO = (dto as any)?.financeiro ?? {}
  const financeiroInit = {
    valorObra: Number(obraDTO?.valorObra ?? 0),
    maoDeObra: Number(obraDTO?.valorMaoDeObra ?? 0),
    pagamento: {
      entrada: {
        valor: Number(finDTO?.entrada?.valor ?? 0),
        forma: mapFormaPagamento(finDTO?.entrada?.forma),
        status: mapStatusPagamento(finDTO?.entrada?.status),
      },
      quitacao: {
        valor: Number(finDTO?.quitacao?.valor ?? 0),
        forma: mapFormaPagamento(finDTO?.quitacao?.forma),
        status: mapStatusPagamento(finDTO?.quitacao?.status),
      },
    },
  }

  const byCategoria = {
    telha: getPedidoByCategoria(dto, "TELHA"),
    madeira: getPedidoByCategoria(dto, "MADEIRA"),
    materiais: getPedidoByCategoria(dto, "MATERIAIS"),
    andaimes: getPedidoByCategoria(dto, "ANDAIMES"),
  }

  const pedidoInit: Partial<PedidoCompraVM> | undefined = {
    telha: {
      status: mapPedidoStatusPadrao(byCategoria.telha?.status),
      previsao: parseISODate(byCategoria.telha?.entrega?.data ?? null),
      orcamento: Number(byCategoria.telha?.valores?.orcado ?? 0),
      area: Number(byCategoria.telha?.area ?? 0),
      fornecedorId: byCategoria.telha?.fornecedor?.id ?? null,
      itens: Array.isArray(byCategoria.telha?.itens)
        ? byCategoria.telha.itens.map((it: any) => ({
            id: it.id,
            descricao: it.descricao,
            quantidade: Number(it.quantidade ?? 0),
            precoUnitario: Number(it.precoUnitario ?? 0),
            total: Number(it.total ?? 0),
          }))
        : [],
    },
    madeira: {
      status: mapPedidoStatusPadrao(byCategoria.madeira?.status),
      previsao: parseISODate(byCategoria.madeira?.entrega?.data ?? null),
      fornecedorId: byCategoria.madeira?.fornecedor?.id ?? null,
      orcamento: Number(byCategoria.madeira?.valores?.orcado ?? 0),
      itens: Array.isArray(byCategoria.madeira?.itens)
        ? byCategoria.madeira.itens.map((it: any) => ({
            id: it.id,
            componente: it?.componente ?? undefined,
            madeiraNome: it?.madeiraNome ?? undefined,
            descricao: it.descricao,
            quantidade: Number(it.quantidade ?? 0),
            tamanho: it?.tamanho != null ? Number(it.tamanho) : 0,
            precoUnitario: Number(it.precoUnitario ?? 0),
            total: Number(it.total ?? 0),
          }))
        : [],
    },
    materiais: {
      status: mapPedidoStatusMateriais(byCategoria.materiais?.status),
      itens: Array.isArray(byCategoria.materiais?.itens)
        ? byCategoria.materiais.itens.map((it: any) => ({
            id: it.id,
            descricao: it.descricao,
            quantidade: Number(it.quantidade ?? 0),
            precoUnitario: Number(it.precoUnitario ?? 0),
            total: Number(it.total ?? 0),
          }))
        : [],
    },
    andaimes: {
      status: mapPedidoStatusAndaimes(byCategoria.andaimes?.status),
      fornecedorId: byCategoria.andaimes?.fornecedor?.id ?? null,
      itens: Array.isArray(byCategoria.andaimes?.itens)
        ? byCategoria.andaimes.itens.map((it: any) => ({
            id: it.id,
            descricao: it.descricao,
            quantidade: Number(it.quantidade ?? 0),
            precoUnitario: Number(it.precoUnitario ?? 0),
            total: Number(it.total ?? 0),
          }))
        : [],
    },
  }

  const execucaoInit = (dto as any)?.ordemServico
    ? {
        equipeId: (dto as any).ordemServico.equipe?.id ?? (dto as any).ordemServico.equipeId ?? null,
        dataPrevInicio: (dto as any).ordemServico.dataPrevInicio ?? null,
        dataPrevConclusao: (dto as any).ordemServico.dataPrevConclusao ?? null,
      }
    : {
        equipeId: null,
        dataPrevInicio: null,
        dataPrevConclusao: null,
      }

  const orcamentoId = pickOrcamentoId(dto)
  const orcamentoLink = orcamentoId ? `${proto}://${host}/orcamento/detalhes/${orcamentoId}` : ""

  const proposta =
    String((dto as any)?.anexos?.propostaSlide ?? "") ||
    String((dto as any)?.orcamento?.linkSlide ?? "") ||
    String((dto as any)?.orcamento?.link_slide ?? "")

  const contrato =
    String((dto as any)?.anexos?.contrato ?? "") ||
    String((dto as any)?.anexos?.contratoLink ?? "")

  const anexosInit = {
    orcamento: orcamentoLink,
    proposta: proposta,
    contrato: contrato,
    ordemServico: String((dto as any)?.anexos?.ordemServico ?? ""),
  }

  return (
    <ObrasPage
      mode="view"
      obraId={obraId}
      orcamentoId={orcamentoId}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      pedidoInit={pedidoInit}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresTelhaOptions={fornecedoresTelhaOptions}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      equipeOptions={equipesOptions}
      anexosInit={anexosInit}
      financeiroInit={financeiroInit}
      execucaoInit={execucaoInit}
      cidades={cidades}
      ordemServicoId={ordemServicoId}
    />
  )
}
