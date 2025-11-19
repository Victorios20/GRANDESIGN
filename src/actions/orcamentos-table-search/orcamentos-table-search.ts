import { prisma } from "@/lib/prisma"

type OrderDir = "asc" | "desc"
type ObraVinculada = "sim" | "nao" | "todos"

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
  obraVinculada?: ObraVinculada // <- tri-estado
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

  const obraVinculada: ObraVinculada = params.obraVinculada ?? "todos"

  // COUNT
  const totalRows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*)::bigint AS count
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    LEFT JOIN cidades ci ON ci.id = c.cidade_id
    LEFT JOIN tipo_obra to2 ON to2.id = o.tipo_obra_id
    LEFT JOIN obras ob ON ob.orcamento_id = o.id
    WHERE
      ($1::text IS NULL OR (
        unaccent(lower(c.nome))   LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(o.titulo)) LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(c.bairro)) LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(ci.nome))  LIKE unaccent(lower($1)) ESCAPE '\\' OR
        (CASE WHEN $2::text <> '' THEN regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || $2 || '%' ELSE false END)
      ))
      AND ($3::text IS NULL OR unaccent(lower(c.bairro)) LIKE unaccent(lower($3)) ESCAPE '\\')
      AND ($4::timestamp IS NULL OR o.data_ultima_alteracao >= $4::timestamp)
      AND ($5::timestamp IS NULL OR o.data_ultima_alteracao <= $5::timestamp)
      AND ($6::int4 IS NULL OR c.cidade_id = $6::int4)
      AND ($7::int4 IS NULL OR o.tipo_obra_id = $7::int4)
      AND ($8::text IS NULL OR regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || regexp_replace($8, '\\D', '', 'g') || '%')
      AND (
        CASE
          WHEN $9::text = 'sim'  THEN (o.lancado_obra = true OR ob.id IS NOT NULL)
          WHEN $9::text = 'nao'  THEN (coalesce(o.lancado_obra, false) = false AND ob.id IS NULL)
          ELSE true
        END
      )
    `,
    searchPattern,   // $1
    searchDigits,    // $2
    bairroPattern,   // $3
    dIni,            // $4
    dFim,            // $5
    cidadeId,        // $6
    tipoObraId,      // $7
    telefoneFiltro,  // $8
    obraVinculada    // $9
  )

  const total = Number((totalRows as Array<{ count: bigint }>)[0]?.count ?? 0)

  // ORDER BY seguro
  const orderSql =
    `
    ORDER BY
      CASE WHEN $10::text = 'titulo'  AND $11::boolean = true  THEN o.titulo END ASC,
      CASE WHEN $10::text = 'titulo'  AND $11::boolean = false THEN o.titulo END DESC,
      CASE WHEN $10::text = 'cliente' AND $11::boolean = true  THEN c.nome END ASC,
      CASE WHEN $10::text = 'cliente' AND $11::boolean = false THEN c.nome END DESC,
      CASE WHEN $10::text = 'bairro'  AND $11::boolean = true  THEN c.bairro END ASC,
      CASE WHEN $10::text = 'bairro'  AND $11::boolean = false THEN c.bairro END DESC,
      CASE WHEN $10::text = 'cidade'  AND $11::boolean = true  THEN ci.nome END ASC,
      CASE WHEN $10::text = 'cidade'  AND $11::boolean = false THEN ci.nome END DESC,
      CASE WHEN $10::text = 'tipoObra' AND $11::boolean = true  THEN to2.tipo_obra END ASC,
      CASE WHEN $10::text = 'tipoObra' AND $11::boolean = false THEN to2.tipo_obra END DESC,
      CASE WHEN $10::text = 'data_ultima_alteracao' AND $11::boolean = true  THEN o.data_ultima_alteracao END ASC,
      CASE WHEN $10::text = 'data_ultima_alteracao' AND $11::boolean = false THEN o.data_ultima_alteracao END DESC,
      o.id DESC
    `

  // DATA
  const rows = await prisma.$queryRawUnsafe(
    `
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
      o.totais_empresa_gd_preco,
      o.lancado_obra,
      to_char(o.lancado_obra_em, 'YYYY-MM-DD"T"HH24:MI:SS') AS lancado_obra_em,
      ob.id AS obra_id
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    LEFT JOIN cidades ci ON ci.id = c.cidade_id
    LEFT JOIN tipo_obra to2 ON to2.id = o.tipo_obra_id
    LEFT JOIN obras ob ON ob.orcamento_id = o.id
    WHERE
      ($1::text IS NULL OR (
        unaccent(lower(c.nome))   LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(o.titulo)) LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(c.bairro)) LIKE unaccent(lower($1)) ESCAPE '\\' OR
        unaccent(lower(ci.nome))  LIKE unaccent(lower($1)) ESCAPE '\\' OR
        (CASE WHEN $2::text <> '' THEN regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || $2 || '%' ELSE false END)
      ))
      AND ($3::text IS NULL OR unaccent(lower(c.bairro)) LIKE unaccent(lower($3)) ESCAPE '\\')
      AND ($4::timestamp IS NULL OR o.data_ultima_alteracao >= $4::timestamp)
      AND ($5::timestamp IS NULL OR o.data_ultima_alteracao <= $5::timestamp)
      AND ($6::int4 IS NULL OR c.cidade_id = $6::int4)
      AND ($7::int4 IS NULL OR o.tipo_obra_id = $7::int4)
      AND ($8::text IS NULL OR regexp_replace(coalesce(c.telefone, ''), '\\D', '', 'g') LIKE '%' || regexp_replace($8, '\\D', '', 'g') || '%')
      AND (
        CASE
          WHEN $9::text = 'sim'  THEN (o.lancado_obra = true OR ob.id IS NOT NULL)
          WHEN $9::text = 'nao'  THEN (coalesce(o.lancado_obra, false) = false AND ob.id IS NULL)
          ELSE true
        END
      )
      ${orderSql}
      LIMIT $12 OFFSET $13
    `,
    searchPattern,  // $1
    searchDigits,   // $2
    bairroPattern,  // $3
    dIni,           // $4
    dFim,           // $5
    cidadeId,       // $6
    tipoObraId,     // $7
    telefoneFiltro, // $8
    obraVinculada,  // $9
    ob,             // $10
    asc,            // $11
    perPage,        // $12
    skip            // $13
  ) as Array<{
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
    lancado_obra: boolean | null
    lancado_obra_em: string | null
    obra_id: number | null
  }>

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
      clienteTelefone: r.cliente_telefone ?? null,
      lancado_obra: Boolean(r.lancado_obra),
      lancado_obra_em: r.lancado_obra_em ?? null,
      obraId: r.obra_id ?? null,
    }
  })

  return { dados, total }
}
