import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ObrasPage from "@/app/obras/ObrasPage"
import type {
  ObraDetalheDTO,
  ObraInfosVM,
  FormaPagamento,
  PagamentoStatus,
  ObraStatus,
  PedidoCompraDTO,
} from "@/app/obras/lib/types"
import type { ImgItem } from "@/app/obras/_sections/ObsImagens"

import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"
import { listarMateriaisGerais, listarTelhas } from "@/actions/materiais-db/materiais-db"
import { detalharObraDB, AppError } from "@/actions/obras/detalhar-obra"
import { ssrJSON } from "@/lib/ssrFetch"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Obras · Detalhe" }

type Option = { value: string; label: string }

type CanonicalObraDetails = {
  endereco: string
  mapsUrl: string
  tipoObra: string
  largura: number
  comprimento: number
  larguraMaior: number | null
  larguraMenor: number | null
  comprimentoMaior: number | null
  comprimentoMenor: number | null
  telhaEscolhida: string
  valorObra: number
  valorMaoDeObra: number
  status: unknown
  observacoes: string | null
  dataCriacao: string | null
  isLShape: boolean
}

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
  const value = String(raw ?? "").trim()
  if (!value) return null

  if (/^pix$/i.test(value)) return "Pix"

  const installments = value.match(/^(\d{1,2})x$/i)
  if (installments) {
    return `${Number(installments[1])}x`
  }

  return value
}

function mapStatusPagamento(raw: unknown): PagamentoStatus {
  const s = String(raw ?? "").trim().toUpperCase()
  if (s === "EFETUADO") return "Efetuado"
  if (s === "PENDENTE") return "Pendente"
  return "Pendente"
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

function pickOrcamentoId(dto: any): number | undefined {
  const candidates = [dto?.orcamentoId, dto?.orcamento?.id, dto?.orcamento_id, dto?.orcamento?.orcamentoId]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

function normalizePedidosCompra(dto: any): PedidoCompraDTO[] {
  const arr = (dto as any)?.pedidosCompra ?? (dto as any)?.pedidos_compra ?? []
  if (!Array.isArray(arr)) return []
  return arr as PedidoCompraDTO[]
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toNullableNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function getCanonicalObraDetails(dto: ObraDetalheDTO): CanonicalObraDetails {
  const current = (dto as any)?.dadosObra
  if (current && typeof current === "object") {
    return {
      endereco: String(current.endereco ?? ""),
      mapsUrl: String(current.mapsUrl ?? ""),
      tipoObra: String(current.tipoObra ?? ""),
      largura: toNum(current.largura),
      comprimento: toNum(current.comprimento),
      larguraMaior: toNullableNum(current.larguraMaior),
      larguraMenor: toNullableNum(current.larguraMenor),
      comprimentoMaior: toNullableNum(current.comprimentoMaior),
      comprimentoMenor: toNullableNum(current.comprimentoMenor),
      telhaEscolhida: String(current.telhaEscolhida ?? ""),
      valorObra: toNum(current.valorObra),
      valorMaoDeObra: toNum(current.valorMaoDeObra),
      status: current.status,
      observacoes: current.observacoes ?? null,
      dataCriacao: current.dataCriacao ?? null,
      isLShape: !!current.isLShape,
    }
  }

  const legacy = (dto as any)?.obra ?? {}
  return {
    endereco: String(legacy.endereco ?? ""),
    mapsUrl: String(legacy.mapsUrl ?? ""),
    tipoObra: String(legacy.tipo ?? ""),
    largura: toNum(legacy.largura),
    comprimento: toNum(legacy.comprimento),
    larguraMaior: null,
    larguraMenor: null,
    comprimentoMaior: null,
    comprimentoMenor: null,
    telhaEscolhida: String(legacy.telha ?? ""),
    valorObra: toNum(legacy.valorObra),
    valorMaoDeObra: toNum(legacy.valorMaoDeObra),
    status: (dto as any)?.status,
    observacoes: legacy.observacoes ?? null,
    dataCriacao: (dto as any)?.dadosObra?.dataCriacao ?? null,
    isLShape: false,
  }
}

export default async function ObraViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const obraId = Number(idStr)
  if (!Number.isFinite(obraId) || obraId <= 0) notFound()

  // Fetch obra directly from DB — avoids auth cookie roundtrip via fetch
  let dto: ObraDetalheDTO
  try {
    dto = await detalharObraDB(obraId)
  } catch (err: any) {
    if (err instanceof AppError && (err.code === "OBRA_NOT_FOUND" || err.code === "INVALID_ID")) {
      notFound()
    }
    throw err
  }

  const [
    tiposRaw,
    componentes,
    geraisDB,
    telhasDB,
    fornecedoresTelhaJson,
    fornecedoresMadeiraJson,
    fornecedoresAndaimesJson,
    equipesJson,
    cidadesRaw,
  ] = await Promise.all([
    ssrJSON<any>("/api/tipos-obra?page=1&pageSize=100"),
    listarComponentesDB(),
    listarMateriaisGerais(),
    listarTelhas(),
    ssrJSON<any>("/api/fornecedores?tipo=telha"),
    ssrJSON<any>("/api/fornecedores?tipo=madeira"),
    ssrJSON<any>("/api/fornecedores?tipo=andaimes"),
    ssrJSON<any>("/api/equipes?page=1&pageSize=200"),
    ssrJSON<any>("/api/cidades"),
  ])

  const cidades = normalizeCidades(cidadesRaw)
  const cidadeMap = new Map<number, string>(cidades.map((c) => [c.id, c.nome]))

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

  const obraDTO = getCanonicalObraDetails(dto)

  const initial: Partial<ObraInfosVM> & { imagens?: ImgItem[] } = {
    titulo: (dto as any)?.titulo ?? "",
    tipoObra: obraDTO.tipoObra,
    isLShape: obraDTO.isLShape,
    largura: obraDTO.largura,
    comprimento: obraDTO.comprimento,
    larguraMaior: obraDTO.larguraMaior,
    larguraMenor: obraDTO.larguraMenor,
    comprimentoMaior: obraDTO.comprimentoMaior,
    comprimentoMenor: obraDTO.comprimentoMenor,
    telhaEscolhida: obraDTO.telhaEscolhida,
    status: mapObraStatus(obraDTO.status ?? (dto as any)?.status),
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
      logradouro: obraDTO.endereco,
      bairro: (dto as any)?.cliente?.bairro ?? "",
      cidade: cidadeNomeFinal || "",
      mapsUrl: obraDTO.mapsUrl,
    },
    observacoes: obraDTO.observacoes ?? null,
    dataCriacao: obraDTO.dataCriacao ?? null,
    dataInicioObra: (dto as any)?.dataInicioObra ?? null,
    dataFimObra: (dto as any)?.dataFimObra ?? null,
    dataContrato: (dto as any)?.dataContrato ?? null,
    dataConclusao: (dto as any)?.dataConclusao ?? null,
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

  const fornecedoresTelhaOptions: Option[] = toOptions((fornecedoresTelhaJson as any)?.data ?? fornecedoresTelhaJson)
  const fornecedoresMadeiraOptions: Option[] = toOptions(
    (fornecedoresMadeiraJson as any)?.data ?? fornecedoresMadeiraJson
  )
  const fornecedoresAndaimesOptions: Option[] = toOptions(
    (fornecedoresAndaimesJson as any)?.data ?? fornecedoresAndaimesJson
  )

  const equipesOptions: Option[] = Array.isArray((equipesJson as any)?.data)
    ? ((equipesJson as any).data as any[])
      .map((e: any) => {
        const label = String(e?.nome ?? "").trim()
        const value = String(e?.id ?? "")
        return label ? { value, label } : null
      })
      .filter(Boolean) as Option[]
    : []

  const equipesList = Array.isArray((equipesJson as any)?.data)
    ? ((equipesJson as any).data as any[]).map((e: any) => ({
      id: Number(e?.id ?? 0),
      nome: String(e?.nome ?? "").trim(),
      cor: e?.cor || null,
    }))
    : []

  const ordemServicoIdRaw =
    (dto as any)?.ordemServico?.id ?? (dto as any)?.ordemServico?.ordemServicoId ?? (dto as any)?.ordem_servico?.id

  const ordemServicoId = Number.isFinite(Number(ordemServicoIdRaw)) ? Number(ordemServicoIdRaw) : null

  const finDTO = (dto as any)?.financeiro ?? {}
  const financeiroInit = {
    valorObra: obraDTO.valorObra,
    maoDeObra: obraDTO.valorMaoDeObra,
    pagamento: {
      entrada: {
        valor: toNum(finDTO?.entrada?.valor),
        forma: mapFormaPagamento(finDTO?.entrada?.forma),
        status: mapStatusPagamento(finDTO?.entrada?.status),
      },
      quitacao: {
        valor: toNum(finDTO?.quitacao?.valor),
        forma: mapFormaPagamento(finDTO?.quitacao?.forma),
        status: mapStatusPagamento(finDTO?.quitacao?.status),
      },
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
  const orcamentoLink = orcamentoId ? `/orcamento/detalhes/${orcamentoId}` : ""

  const proposta =
    String((dto as any)?.anexos?.propostaSlide ?? "") ||
    String((dto as any)?.orcamento?.linkSlide ?? "") ||
    String((dto as any)?.orcamento?.link_slide ?? "")

  const contrato =
    String((dto as any)?.anexos?.contrato ?? "") ||
    String((dto as any)?.anexos?.contratoLink ?? "")

  const linkContratoAssinado =
    String((dto as any)?.anexos?.linkContratoAssinado ?? "") ||
    String((dto as any)?.anexos?.link_contrato_assinado ?? "")

  const anexosInit = {
    orcamento: orcamentoLink,
    proposta: proposta,
    contrato: contrato,
    linkContratoAssinado: linkContratoAssinado,
    ordemServico: String((dto as any)?.anexos?.ordemServico ?? ""),
  }

  const pedidosCompra = normalizePedidosCompra(dto)

  return (
    <ObrasPage
      mode="view"
      obraId={obraId}
      orcamentoId={orcamentoId}
      initial={initial}
      tiposObraOptions={tiposObraOptions}
      telhaOptions={telhaOptions}
      catalogo={catalogo}
      componentes={componentes}
      fornecedoresTelhaOptions={fornecedoresTelhaOptions}
      fornecedoresMadeiraOptions={fornecedoresMadeiraOptions}
      fornecedoresAndaimesOptions={fornecedoresAndaimesOptions}
      equipeOptions={equipesOptions}
      equipesList={equipesList}
      anexosInit={anexosInit}
      financeiroInit={financeiroInit}
      execucaoInit={execucaoInit}
      cidades={cidades}
      ordemServicoId={ordemServicoId}
      pedidosCompraInit={pedidosCompra}
      agendaInit={(dto as any)?.agenda ?? []}
    />
  )
}
