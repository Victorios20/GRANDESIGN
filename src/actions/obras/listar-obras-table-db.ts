import { prisma } from "@/lib/prisma"
import { ObraStatus, Prisma } from "@prisma/client"

type Decimalish = number | string | Prisma.Decimal

const n = (v: any) =>
  v == null ? null : typeof v?.toNumber === "function" ? v.toNumber() : Number(v)

function onlyDigits(s?: string | null) {
  return (s || "").replace(/\D/g, "")
}
function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function mapObraStatus(raw?: string | ObraStatus | null): ObraStatus | undefined {
  if (!raw) return undefined
  if (Object.values(ObraStatus).includes(raw as ObraStatus)) return raw as ObraStatus
  const n2 = normalizeStr(String(raw))
  if (n2.startsWith("assinatura")) return ObraStatus.ASSINATURA_DE_CONTRATO
  if (n2.startsWith("aguardando validacao")) return ObraStatus.AGUARDANDO_VALIDACAO_TECNICA
  if (n2 === "compras") return ObraStatus.COMPRAS
  if (n2.startsWith("a iniciar")) return ObraStatus.A_INICIAR
  if (n2.startsWith("execucao")) return ObraStatus.EXECUCAO
  if (n2.startsWith("aguardando pagamento")) return ObraStatus.AGUARDANDO_PAGAMENTO
  if (n2.startsWith("pendencia")) return ObraStatus.PENDENCIA
  if (n2.startsWith("finalizado")) return ObraStatus.FINALIZADO
  return undefined
}

function parseYMD(ymd?: string | null): Date | null {
  const s = String(ymd || "").trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  return Number.isFinite(dt.getTime()) ? dt : null
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export type ListarObrasTableParams = {
  page?: number | string
  perPage?: number | string
  search?: string | null
  telefone?: string | null
  bairro?: string | null
  tipoObra?: string | null
  dIni?: string | null
  dFim?: string | null
  status?: string | null
  ordem?: "asc" | "desc" | string | null
  semAgenda?: boolean | string | null
}

export type ObraTableRowDTO = {
  id: number

  orcamento_id: number | null
  cliente_id: number
  equipe_id: number | null

  titulo: string | null
  endereco_obra: string
  maps_url: string
  tipo_obra: string
  largura: number
  comprimento: number
  telha_escolhida: string
  valor_obra: number
  valor_mao_de_obra: number
  status: string
  observacoes: string | null

  pagamento_entrada: number | null
  forma_pagamento_entrada: string | null
  status_pagamento_entrada: string

  pagamento_quitacao: number | null
  forma_pagamento_quitacao: string | null
  status_pagamento_quitacao: string

  link_slide_orcamento: string | null
  link_pdf_orcamento: string | null
  link_contrato: string | null
  link_ordem_servico: string | null

  created_by: number | null
  updated_by: number | null

  data_criacao: string | null
  data_ultima_alteracao: string | null

  cliente: {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade_id: number | null
    cpf: string | null
    cidades: { id: number; nome: string } | null
  }

  equipe: { id: number; nome: string } | null

  ordem_servico_id: number | null
  pedidos_compra_ids: number[]
  imagens: Array<{ id: number; url: string; ordem: number | null; legenda: string | null }>
  _count?: { segmentos: number }
}

export type ListarObrasTableResult = {
  dados: ObraTableRowDTO[]
  total: number
}

export async function listarObrasTableDB(params: ListarObrasTableParams): Promise<ListarObrasTableResult> {
  const pageRaw = Number(params?.page ?? 1)
  const perPageRaw = Number(params?.perPage ?? 20)

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? perPageRaw : 20

  const q = String(params?.search ?? "").trim()
  const bairro = String(params?.bairro ?? "").trim()
  const telefone = String(params?.telefone ?? "").trim()
  const tipoObra = String(params?.tipoObra ?? "").trim()

  const dIni = parseYMD(params?.dIni ?? null)
  const dFim = parseYMD(params?.dFim ?? null)
  const dFimExclusive = dFim ? addDays(dFim, 1) : null

  const ordemIn = String(params?.ordem ?? "desc").toLowerCase()
  const ordem: "asc" | "desc" = ordemIn === "asc" ? "asc" : "desc"

  const statusMapped = mapObraStatus(params?.status ?? null)

  const qDigits = onlyDigits(q)
  const telDigits = onlyDigits(telefone)

  const idNum = /^\d+$/.test(q) ? Number(q) : null
  const where: any = {}

  const and: any[] = []

  if (q) {
    const or: any[] = []

    if (idNum != null && Number.isFinite(idNum)) {
      or.push({ id: idNum })
    }

    or.push({ titulo: { contains: q, mode: "insensitive" } })
    or.push({ cliente: { nome: { contains: q, mode: "insensitive" } } })

    and.push({ OR: or })
  }

  if (bairro) {
    and.push({ cliente: { bairro: { contains: bairro, mode: "insensitive" } } })
  }

  if (tipoObra) {
    and.push({ tipo_obra: { contains: tipoObra, mode: "insensitive" } })
  }

  if (telefone) {
    const ors: any[] = [{ cliente: { telefone: { contains: telefone, mode: "insensitive" } } }]
    if (telDigits) {
      ors.push({ cliente: { telefone: { contains: telDigits, mode: "insensitive" } } })
    }
    and.push({ OR: ors })
  }

  if (statusMapped) {
    and.push({ status: statusMapped })
  }

  if (dIni || dFimExclusive) {
    const dateFilter: any = {}
    if (dIni) dateFilter.gte = dIni
    if (dFimExclusive) dateFilter.lt = dFimExclusive
    and.push({ data_ultima_alteracao: dateFilter })
  }

  // Filter obras without agenda segments
  if (params?.semAgenda === true || params?.semAgenda === "true") {
    and.push({ segmentos: { none: {} } })
  }

  if (and.length) where.AND = and

  const [total, rows] = await Promise.all([
    prisma.obras.count({ where }),
    prisma.obras.findMany({
      where,
      orderBy: [{ data_ultima_alteracao: ordem }, { id: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        cliente: { include: { cidades: true } },
        equipe: true,
        ordem_servico: { select: { id: true } },
        pedidos_compra: { select: { id: true } },
        imagens: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
        _count: { select: { segmentos: true } },
      },
    }),
  ])

  const dados: ObraTableRowDTO[] = rows.map((o: any) => ({
    id: o.id,

    orcamento_id: o.orcamento_id ?? null,
    cliente_id: o.cliente_id,
    equipe_id: o.equipe_id ?? null,

    titulo: o.titulo ?? null,
    endereco_obra: o.endereco_obra,
    maps_url: o.maps_url,
    tipo_obra: o.tipo_obra,
    largura: n(o.largura)!,
    comprimento: n(o.comprimento)!,
    telha_escolhida: o.telha_escolhida,
    valor_obra: n(o.valor_obra)!,
    valor_mao_de_obra: n(o.valor_mao_de_obra)!,
    status: o.status,
    observacoes: o.observacoes ?? null,

    pagamento_entrada: n(o.pagamento_entrada),
    forma_pagamento_entrada: o.forma_pagamento_entrada ?? null,
    status_pagamento_entrada: o.status_pagamento_entrada,

    pagamento_quitacao: n(o.pagamento_quitacao),
    forma_pagamento_quitacao: o.forma_pagamento_quitacao ?? null,
    status_pagamento_quitacao: o.status_pagamento_quitacao,

    link_slide_orcamento: o.link_slide_orcamento ?? null,
    link_pdf_orcamento: o.link_pdf_orcamento ?? null,
    link_contrato: o.link_contrato ?? null,
    link_ordem_servico: o.link_ordem_servico ?? null,

    created_by: o.created_by ?? null,
    updated_by: o.updated_by ?? null,

    data_criacao: o.data_criacao ? new Date(o.data_criacao).toISOString() : null,
    data_ultima_alteracao: o.data_ultima_alteracao ? new Date(o.data_ultima_alteracao).toISOString() : null,

    cliente: {
      id: o.cliente.id,
      nome: o.cliente.nome,
      telefone: o.cliente.telefone ?? null,
      bairro: o.cliente.bairro ?? null,
      cidade_id: o.cliente.cidade_id ?? null,
      cpf: o.cliente.cpf ?? null,
      cidades: o.cliente.cidades ? { id: o.cliente.cidades.id, nome: o.cliente.cidades.nome } : null,
    },

    equipe: o.equipe ? { id: o.equipe.id, nome: o.equipe.nome } : null,

    ordem_servico_id: o.ordem_servico?.id ?? null,
    pedidos_compra_ids: Array.isArray(o.pedidos_compra) ? o.pedidos_compra.map((p: any) => p.id) : [],
    imagens: Array.isArray(o.imagens)
      ? o.imagens.map((img: any) => ({
        id: img.id,
        url: img.url,
        ordem: img.ordem ?? null,
        legenda: img.legenda ?? null,
      }))
      : [],
    _count: { segmentos: o._count?.segmentos ?? 0 },
  }))

  return { dados, total }
}
