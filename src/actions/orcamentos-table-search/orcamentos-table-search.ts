import { prisma } from "@/lib/prisma"
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

const rawSearch = (params.search ?? "").trim()
const searchPattern = rawSearch ? `%${rawSearch.replace(/([_%\\])/g, "\\$1").replace(/\s+/g, "%")}%` : null
const bairroPattern = (params.bairro ?? "").trim()
  ? `%${String(params.bairro).trim().replace(/([_%\\])/g, "\\$1").replace(/\s+/g, "%")}%`
  : null
const dIni = params.dIni ? new Date(params.dIni) : null
const dFim = params.dFim ? new Date(`${params.dFim}T23:59:59.999Z`) : null
const cidadeId = params.cidadeId ?? null
const tipoObraId = params.tipoObraId ?? null
const telefoneFiltro = (params.telefone ?? "").trim() || null
const searchDigits = rawSearch.replace(/\D+/g, "")

const ob = (params.orderBy || "data_ultima_alteracao")
const asc = params.orderDir === "asc"

const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
  SELECT COUNT(*)::bigint AS count
  FROM orcamento o
  JOIN cliente c ON c.id = o.cliente_id
  LEFT JOIN cidades ci ON ci.id = c.cidade_id
  LEFT JOIN tipo_obra to2 ON to2.id = o.tipo_obra_id
  WHERE
    (${searchPattern as any}::text IS NULL OR (
      unaccent(lower(c.nome))   LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(o.titulo)) LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(c.bairro)) LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(ci.nome))  LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      (CASE WHEN ${searchDigits as any}::text <> '' THEN regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || ${searchDigits as any} || '%' ELSE false END)
    ))
    AND (${bairroPattern as any}::text IS NULL OR
      unaccent(lower(c.bairro)) LIKE unaccent(lower(${bairroPattern as any})) ESCAPE '\\'
    )
    AND (${dIni as any}::timestamp IS NULL OR o.data_ultima_alteracao >= ${dIni as any})
    AND (${dFim as any}::timestamp IS NULL OR o.data_ultima_alteracao <= ${dFim as any})
    AND (${cidadeId as any}::int4 IS NULL OR c.cidade_id = ${cidadeId as any})
    AND (${tipoObraId as any}::int4 IS NULL OR o.tipo_obra_id = ${tipoObraId as any})
    AND (${telefoneFiltro as any}::text IS NULL OR
      regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || regexp_replace(${telefoneFiltro as any}, '\\D', '', 'g') || '%'
    )
`

const total = Number(totalRows?.[0]?.count ?? 0)

const rows = await prisma.$queryRaw<Array<{
  id: number
  titulo: string | null
  cliente_nome: string | null
  bairro: string | null
  cidade_nome: string | null
  cliente_telefone: string | null
  tipo_obra: string | null
  data_ultima_alteracao: string | null
  data_criacao: string | null
  totais_madeiras_preco: number | null
  totais_materiais_preco: number | null
  totais_frete_preco: number | null
  totais_comissao_preco: number | null
  totais_empresa_ps_preco: number | null
  totais_empresa_gd_preco: number | null
}>>`
  SELECT
    o.id,
    o.titulo,
    c.nome AS cliente_nome,
    c.bairro AS bairro,
    ci.nome AS cidade_nome,
    c.telefone AS cliente_telefone,
    to2.tipo_obra AS tipo_obra,
    to_char(o.data_ultima_alteracao, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_ultima_alteracao,
    to_char(o.data_criacao,          'YYYY-MM-DD"T"HH24:MI:SS') AS data_criacao,
    o.totais_madeiras_preco,
    o.totais_materiais_preco,
    o.totais_frete_preco,
    o.totais_comissao_preco,
    o.totais_empresa_ps_preco,
    o.totais_empresa_gd_preco
  FROM orcamento o

  JOIN cliente c ON c.id = o.cliente_id
  LEFT JOIN cidades ci ON ci.id = c.cidade_id
  LEFT JOIN tipo_obra to2 ON to2.id = o.tipo_obra_id
  WHERE
    (${searchPattern as any}::text IS NULL OR (
      unaccent(lower(c.nome))   LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(o.titulo)) LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(c.bairro)) LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      unaccent(lower(ci.nome))  LIKE unaccent(lower(${searchPattern as any})) ESCAPE '\\' OR
      (CASE WHEN ${searchDigits as any}::text <> '' THEN regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || ${searchDigits as any} || '%' ELSE false END)
    ))
    AND (${bairroPattern as any}::text IS NULL OR
      unaccent(lower(c.bairro)) LIKE unaccent(lower(${bairroPattern as any})) ESCAPE '\\'
    )
    AND (${dIni as any}::timestamp IS NULL OR o.data_ultima_alteracao >= ${dIni as any})
    AND (${dFim as any}::timestamp IS NULL OR o.data_ultima_alteracao <= ${dFim as any})
    AND (${cidadeId as any}::int4 IS NULL OR c.cidade_id = ${cidadeId as any})
    AND (${tipoObraId as any}::int4 IS NULL OR o.tipo_obra_id = ${tipoObraId as any})
    AND (${telefoneFiltro as any}::text IS NULL OR
      regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || regexp_replace(${telefoneFiltro as any}, '\\D', '', 'g') || '%'
    )
  ORDER BY
    CASE WHEN ${ob === "titulo" && asc}  THEN o.titulo END ASC,
    CASE WHEN ${ob === "titulo" && !asc} THEN o.titulo END DESC,
    CASE WHEN ${ob === "cliente" && asc} THEN c.nome END ASC,
    CASE WHEN ${ob === "cliente" && !asc} THEN c.nome END DESC,
    CASE WHEN ${ob === "bairro" && asc}  THEN c.bairro END ASC,
    CASE WHEN ${ob === "bairro" && !asc} THEN c.bairro END DESC,
    CASE WHEN ${ob === "cidade" && asc}  THEN ci.nome END ASC,
    CASE WHEN ${ob === "cidade" && !asc} THEN ci.nome END DESC,
    CASE WHEN ${ob === "tipoObra" && asc}  THEN to2.tipo_obra END ASC,
    CASE WHEN ${ob === "tipoObra" && !asc} THEN to2.tipo_obra END DESC,
    CASE WHEN ${ob === "data_ultima_alteracao" && asc}  THEN o.data_ultima_alteracao END ASC,
    CASE WHEN ${ob === "data_ultima_alteracao" && !asc} THEN o.data_ultima_alteracao END DESC,
    o.id DESC
  LIMIT ${perPage} OFFSET ${skip}
`

const dados = rows.map((r) => {
  const valor = sumValores(r as any)
  return {
    id: r.id,
    titulo: r.titulo ?? null,
    cliente: r.cliente_nome ?? null,
    bairro: r.bairro ?? null,
    dataISO: r.data_ultima_alteracao ?? null,
    data_ultima_alteracao: r.data_ultima_alteracao ?? null,
    valorFormatado: formatBRL(valor),
    tipoObra: r.tipo_obra ?? null,
    cidade: r.cidade_nome ?? null,
    clienteTelefone: r.cliente_telefone ?? null
  }
})


return { dados, total }

}
