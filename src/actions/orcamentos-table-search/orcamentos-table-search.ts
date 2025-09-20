import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"
type OrderDir = "asc" | "desc"

const ORDER_MAP: Record<string, any> = {
  titulo: { titulo: undefined },
  cliente: { cliente: { nome: undefined } },
  bairro: { cliente: { bairro: undefined } },
  cidade: { cliente: { cidades: { nome: undefined } } },
  tipoObra: { tipo_obra: { tipo_obra: undefined } },
  data_ultima_alteracao: { data_ultima_alteracao: undefined }
}

function pickOrder(orderBy?: string, orderDir?: OrderDir) {
  const dir = orderDir === "asc" ? "asc" : "desc"
  const base = ORDER_MAP[orderBy || "data_ultima_alteracao"]
  if (!base) return { data_ultima_alteracao: dir }
  function applyDir(obj: any): any {
    const k = Object.keys(obj)[0]
    const v = obj[k]
    if (v === undefined) return { [k]: dir }
    return { [k]: applyDir(v) }
  }
  return applyDir(base)
}

function like(v?: string | null) {
  if (!v) return undefined
  const s = v.trim()
  if (!s) return undefined
  return s
}

function sumValores(x: any) {
  const a = Number(x.totais_madeiras_preco) || 0
  const b = Number(x.totais_materiais_preco) || 0
  const c = Number(x.totais_comissao_preco) || 0
  const d = Number(x.totais_empresa_ps_preco) || 0
  const e = Number(x.totais_empresa_gd_preco) || 0
  const f = Number(x.totais_frete_preco) || 0
  return a + b + c + d + e + f
}

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n)
}

export type TableParams = {
  page?: number
  perPage?: number
  search?: string
  orderBy?: string
  orderDir?: OrderDir
  bairro?: string
  telefone?: string
  cidadeId?: number | null
  tipoObraId?: number | null
  dIni?: string | null
  dFim?: string | null
}

export async function listarOrcamentosTableSearch(params: TableParams) {
  const page = Math.max(1, Number(params.page || 1))
  const perPage = Math.min(100, Math.max(1, Number(params.perPage || 20)))
  const skip = (page - 1) * perPage
  const orderBy = pickOrder(params.orderBy, params.orderDir)

  const where: Prisma.orcamentoWhereInput = {
    AND: [
      params.search ? {
        OR: [
          { titulo: { contains: params.search, mode: "insensitive" } },
          { cliente: { nome: { contains: params.search, mode: "insensitive" } } },
          { cliente: { telefone: { contains: params.search, mode: "insensitive" } } },
          { cliente: { bairro: { contains: params.search, mode: "insensitive" } } },
          { tipo_obra: { tipo_obra: { contains: params.search, mode: "insensitive" } } }
        ]
      } : {},
      like(params.bairro) ? { cliente: { bairro: { contains: like(params.bairro), mode: "insensitive" } } } : {},
      like(params.telefone) ? { cliente: { telefone: { contains: like(params.telefone), mode: "insensitive" } } } : {},
      params.cidadeId ? { cliente: { cidade_id: params.cidadeId || undefined } } : {},
      params.tipoObraId ? { tipo_obra_id: params.tipoObraId || undefined } : {},
      params.dIni || params.dFim ? {
        data_ultima_alteracao: {
          gte: params.dIni ? new Date(params.dIni) : undefined,
          lte: params.dFim ? new Date(params.dFim + "T23:59:59.999Z") : undefined
        }
      } : {}
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.orcamento.count({ where }),
    prisma.orcamento.findMany({
      where,
      include: {
        cliente: { include: { cidades: true } },
        tipo_obra: true
      },
      orderBy,
      skip,
      take: perPage
    })
  ])

  const dados = rows.map((o) => {
    const valor = sumValores(o as any)
    return {
      id: o.id,
      titulo: o.titulo ?? null,
      cliente: o.cliente?.nome ?? null,
      bairro: o.cliente?.bairro ?? null,
      dataISO: o.data_ultima_alteracao?.toISOString(),
      data_ultima_alteracao: o.data_ultima_alteracao?.toISOString(),
      valorFormatado: formatBRL(valor),
      tipoObra: o.tipo_obra?.tipo_obra ?? null,
      cidade: o.cliente?.cidades?.nome ?? null,
      clienteTelefone: o.cliente?.telefone ?? null
    }
  })

  return { dados, total }
}
