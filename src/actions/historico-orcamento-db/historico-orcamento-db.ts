import { prisma } from "@/lib/prisma"

export interface OrcamentoTabela {
  id: number
  titulo: string | null
  cliente: string | null
  bairro: string | null
  dataISO: string
  valorFormatado: string
  tipoObra?: string | null
}


export type MaterialItem = {
  nome: string
  tipo: "madeira" | "geral" | "telha"
  quantidade?: number | null
  precoUnit?: number | null
  componente?: string | null
  tamanho?: number | null
  frete?: number | null
  total?: number | null
}

export type OrcamentoDetalhe = {
  id: number
  titulo: string | null
  dataISO: string
  tipoObra: string | null
  dimensoes: { largura: number; comprimento: number }
  cliente: {
    nome: string | null
    telefone: string | null
    bairro: string | null
    cidade: string | null
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    empresaPS: number
    empresaGD: number
    frete: number
    totalGeral: number
  }
  valorTotal: number
  materiais: MaterialItem[]
  pagamentos: { tipoTelhas: string; metodo: string; valor: number }[]
  link_slide?: string | null
  link_pdf?: string | null
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function cleanFilterText(s?: string | null): string | undefined {
  if (!s) return undefined
  const t = s.trim().replace(/\s+/g, " ")
  return t.length ? t : undefined
}

function startOfDay(dateYMD: string): Date {
  const [y, m, d] = dateYMD.split("-").map((x) => parseInt(x, 10))
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

function nextDay(dateYMD: string): Date {
  const s = startOfDay(dateYMD)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, 0, 0, 0, 0)
}

export async function listarBairrosDB(): Promise<string[]> {
  const rows = (await prisma.$queryRaw`
    SELECT DISTINCT TRIM(c.bairro) AS bairro
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    WHERE c.bairro IS NOT NULL AND TRIM(c.bairro) <> ''
    ORDER BY TRIM(c.bairro) ASC
  `) as Array<{ bairro: string | null }>

  const set = new Set<string>()
  for (const r of rows) {
    const b = (r.bairro ?? "").trim()
    if (b) set.add(b)
  }
  return Array.from(set)
}

export type BuscarOrcamentosParams = {
  nome?: string
  bairro?: string
  telefone?: string
  cidadeId?: number
  tipoObraId?: number
  dataIni?: string
  dataFim?: string
  page?: number
  perPage?: number
  ordenarData?: "asc" | "desc"
}


export async function buscarOrcamentosDB(
  params: BuscarOrcamentosParams
): Promise<{ dados: OrcamentoTabela[]; total: number }> {
  const nome = cleanFilterText(params.nome)
  const bairro = cleanFilterText(params.bairro)
  const telefone = cleanFilterText(params.telefone)
  const cidadeId = typeof params.cidadeId === "number" ? params.cidadeId : null
  const tipoObraId = typeof params.tipoObraId === "number" ? params.tipoObraId : null

  const page = Math.max(1, params.page ?? 1)
  const allowedPer = new Set([5, 10, 20])
  const perPage = allowedPer.has(params.perPage ?? 10) ? (params.perPage as number) : 10
  const ordenarData: "asc" | "desc" = params.ordenarData === "asc" ? "asc" : "desc"
  const hasSearch = !!nome
  const limit = hasSearch ? 500 : perPage
  const offset = hasSearch ? 0 : (page - 1) * perPage
  const ini = params.dataIni ? startOfDay(params.dataIni) : null
  const fimExclusivo = params.dataFim ? nextDay(params.dataFim) : null


  const baseWhere = `
  WHERE
    ($1::text IS NULL OR
      (
        immutable_unaccent(lower(c.nome))   ILIKE '%' || immutable_unaccent(lower($1)) || '%'
        OR
        immutable_unaccent(lower(o.titulo)) ILIKE '%' || immutable_unaccent(lower($1)) || '%'
      )
    )
    AND
    ($2::text IS NULL OR
      immutable_unaccent(lower(c.bairro)) ILIKE '%' || immutable_unaccent(lower($2)) || '%'
    )
    AND ($3::timestamptz IS NULL OR o.data_criacao >= $3)
    AND ($4::timestamptz IS NULL OR o.data_criacao <  $4)
    AND ($5::text IS NULL OR immutable_unaccent(lower(c.telefone)) ILIKE '%' || immutable_unaccent(lower($5)) || '%')
    AND ($6::int  IS NULL OR c.cidade_id = $6)
    AND ($7::int  IS NULL OR o.tipo_obra_id = $7)
`


  const listSQL_ASC = `
    SELECT
  o.id,
  o.titulo,
  c.nome AS nome_cliente,
  c.telefone AS cliente_telefone,
  c.bairro,
  c.cidade_id,
  ci.nome AS cidade_nome,
  t.tipo_obra AS "tipoObra",
  o.data_criacao,
  COALESCE(
    (SELECT MIN(op.valor)  FROM orcamento_pagamento op  WHERE op.orcamento_id = o.id AND op.metodo_pagamento ILIKE '%pix%'),
    (SELECT MIN(op2.valor) FROM orcamento_pagamento op2 WHERE op2.orcamento_id = o.id),
    0
  ) AS valor_pix_preferido
FROM orcamento o
JOIN cliente c ON c.id = o.cliente_id
LEFT JOIN cidades ci ON ci.id = c.cidade_id
LEFT JOIN tipo_obra t ON t.id = o.tipo_obra_id
${baseWhere}
ORDER BY o.data_criacao ASC
LIMIT $8 OFFSET $9

  `


  const listSQL_DESC = listSQL_ASC.replace("ORDER BY o.data_criacao ASC", "ORDER BY o.data_criacao DESC")

  const countSQL = `
    SELECT COUNT(*)::bigint AS total
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    ${baseWhere}
  `

  const listSQL = ordenarData === "asc" ? listSQL_ASC : listSQL_DESC

  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      listSQL,
      nome ?? null,
      bairro ?? null,
      ini,
      fimExclusivo,
      telefone ?? null,
      cidadeId ?? null,
      tipoObraId ?? null,
      limit,
      offset
    ),
    prisma.$queryRawUnsafe(
      countSQL,
      nome ?? null,
      bairro ?? null,
      ini,
      fimExclusivo,
      telefone ?? null,
      cidadeId ?? null,
      tipoObraId ?? null
    ),
  ])


  const rs = rows as Array<{
    id: number
    titulo: string | null
    nome_cliente: string | null
    cliente_telefone: string | null
    bairro: string | null
    cidade_id: number | null
    cidade_nome: string | null
    tipoObra: string | null
    data_criacao: string | Date
    valor_pix_preferido: unknown
  }>
  const cs = countRows as Array<{ total: bigint | number }>

  const total = cs?.[0]?.total != null ? Number(cs[0].total) : 0

  const dados = rs.map((r) => {
    const valorNum = num(r.valor_pix_preferido)
    const dataISO =
      r.data_criacao instanceof Date
        ? r.data_criacao.toISOString()
        : new Date(r.data_criacao).toISOString()

    const item: any = {
      id: r.id,
      titulo: r.titulo ?? null,
      cliente: r.nome_cliente ?? null,
      bairro: r.bairro ?? null,
      dataISO,
      valorFormatado: BRL.format(valorNum),
    }

    item.cidade = r.cidade_nome ?? null
    item.cidadeId = r.cidade_id ?? null
    item.clienteTelefone = r.cliente_telefone ?? null
    item.tipoObra = r.tipoObra ?? null

    return item
  }) as any[]


  return { dados, total }

}
