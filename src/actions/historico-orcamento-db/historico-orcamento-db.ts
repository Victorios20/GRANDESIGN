/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/historico-orcamento-db/historico-orcamento-db.ts
   Padrão: importa prisma de "@/lib/prisma" (mesmo do tipo-obra-db).
   Melhorias leves: filtros com trim, bairros únicos + A–Z,
   fallback numérico centralizado, data fim inclusiva (até 23:59:59).
   Mantém shapes e nomes consumidos pela Home (sem regressão).
------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma"

/* =====================================================================
 * Tipos exportados — usados pela Home (NÃO ALTERAR SHAPE/NOMES)
 * ===================================================================== */

export interface OrcamentoTabela {
  id: number
  titulo: string | null
  cliente: string | null
  bairro: string | null
  dataISO: string          // ISO completo; a Home formata dd/MM/yyyy HH:mm
  valorFormatado: string   // BRL pronto (front NÃO formata)
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
  dimensoes: { largura: number; comprimento: number } // fallback 0 quando nulo
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
  valorTotal: number // redundante (compatibilidade)
  materiais: MaterialItem[]
  pagamentos: { tipoTelhas: string; metodo: string; valor: number }[]
  link_slide?: string | null
  link_pdf?: string | null
}

/* =====================================================================
 * Helpers internos (não exportados)
 * ===================================================================== */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Fallback numérico centralizado */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Normalização leve de textos de filtro (trim + colapso de espaços) */
function cleanFilterText(s?: string | null): string | undefined {
  if (!s) return undefined
  const t = s.trim().replace(/\s+/g, " ")
  return t.length ? t : undefined
}

/** Converte 'YYYY-MM-DD' em Date no início do dia (local) */
function startOfDay(dateYMD: string): Date {
  const [y, m, d] = dateYMD.split("-").map((x) => parseInt(x, 10))
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

/** Próximo dia (para comparação < próximoDia, garantindo fim-do-dia inclusivo) */
function nextDay(dateYMD: string): Date {
  const s = startOfDay(dateYMD)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, 0, 0, 0, 0)
}

/* =====================================================================
 * LISTAR BAIRROS — DISTINCT TRIM(c.bairro) A–Z (apenas clientes com orçamento)
 * ===================================================================== */

/**
 * Retorna lista de bairros usados em orçamentos:
 * - Apenas não nulos/não vazios
 * - Únicos e ordenados A–Z
 * Observação: mantém deduplicação defensiva em memória.
 */
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

/* =====================================================================
 * BUSCAR ORÇAMENTOS — lista paginada + total, filtros e ordenação por data
 * ===================================================================== */

export type BuscarOrcamentosParams = {
  nome?: string              // busca em cliente.nome OU orcamento.titulo (case-insensitive; tenta UNACCENT se existir)
  bairro?: string            // substring (case-insensitive; tenta UNACCENT se existir)
  dataIni?: string           // 'YYYY-MM-DD' (inclusive)
  dataFim?: string           // 'YYYY-MM-DD' (inclusive até 23:59:59)
  page?: number              // 1-based
  perPage?: number           // 5 | 10 | 20
  ordenarData?: "asc" | "desc" // por o.data_criacao
}

export async function buscarOrcamentosDB(
  params: BuscarOrcamentosParams
): Promise<{ dados: OrcamentoTabela[]; total: number }> {
  const nome = cleanFilterText(params.nome)
  const bairro = cleanFilterText(params.bairro)
  const page = Math.max(1, params.page ?? 1)
  const allowedPer = new Set([5, 10, 20])
  const perPage = allowedPer.has(params.perPage ?? 10) ? (params.perPage as number) : 10
  const ordenarData: "asc" | "desc" = params.ordenarData === "asc" ? "asc" : "desc"
  const offset = (page - 1) * perPage

  const ini = params.dataIni ? startOfDay(params.dataIni) : null
  const fimExclusivo = params.dataFim ? nextDay(params.dataFim) : null

  // WHERE com parâmetros opcionais (param é NULL => condição ignorada)
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
`;


  const listSQL_ASC = `
    SELECT
      o.id,
      o.titulo,
      c.nome AS nome_cliente,
      c.bairro,
      o.data_criacao,
      COALESCE(o.totais_madeiras_preco,0)
      + COALESCE(o.totais_materiais_preco,0)
      + COALESCE(o.totais_comissao_preco,0)
      + COALESCE(o.totais_empresa_ps_preco,0)
      + COALESCE(o.totais_empresa_gd_preco,0)
      + COALESCE(o.totais_frete_preco,0) AS valor_total
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    ${baseWhere}
    ORDER BY o.data_criacao ASC
    LIMIT $5 OFFSET $6
  `
  const listSQL_DESC = listSQL_ASC.replace("ORDER BY o.data_criacao ASC", "ORDER BY o.data_criacao DESC")

  const countSQL = `
    SELECT COUNT(*)::bigint AS total
    FROM orcamento o
    JOIN cliente c ON c.id = o.cliente_id
    ${baseWhere}
  `

  const listSQL = ordenarData === "asc" ? listSQL_ASC : listSQL_DESC

  // Executa em transação (duas queries com os MESMOS parâmetros)
  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      listSQL,
      nome ?? null,
      bairro ?? null,
      ini,
      fimExclusivo,
      perPage,
      offset
    ),
    prisma.$queryRawUnsafe(
      countSQL,
      nome ?? null,
      bairro ?? null,
      ini,
      fimExclusivo
    ),
  ])

  const rs = rows as Array<{
    id: number
    titulo: string | null
    nome_cliente: string | null
    bairro: string | null
    data_criacao: Date | string
    valor_total: unknown
  }>
  const cs = countRows as Array<{ total: bigint | number }>

  const total = cs?.[0]?.total != null ? Number(cs[0].total) : 0

  const dados: OrcamentoTabela[] = rs.map((r) => {
    const valorNum = num(r.valor_total)
    const dataISO =
      r.data_criacao instanceof Date
        ? r.data_criacao.toISOString()
        : new Date(r.data_criacao).toISOString()
    return {
      id: r.id,
      titulo: r.titulo ?? null,
      cliente: r.nome_cliente ?? null,
      bairro: r.bairro ?? null,
      dataISO,
      valorFormatado: BRL.format(valorNum),
    }
  })

  return { dados, total }
}

