// src/actions/pedido_compra/listar-pedido-compra-db.ts
import { prisma } from "@/lib/prisma"
import { fromDateOnlyDb } from "@/lib/date-only"
import { Prisma, PedidoCompraStatus, PedidoCategoria } from "@prisma/client"

export type PedidoCompraOrderBy =
  | "created_at"
  | "data_entrega"
  | "valor_orcado"
  | "valor_realizado"
  | "descricao"
  | "id"
  | "status"

export type ListarPedidoCompraInput = {
  page?: number
  pageSize?: number

  obraId?: number | null
  fornecedorId?: number | null
  status?: "TODOS" | PedidoCompraStatus | string | null
  categoria?: PedidoCategoria | string | null

  q?: string | null

  orderBy?: PedidoCompraOrderBy
  orderDir?: "asc" | "desc"

  includeCounts?: boolean
}

export type PedidoCompraListItem = {
  id: number
  descricao: string | null
  categoria: PedidoCategoria
  status: PedidoCompraStatus
  valor_orcado: Prisma.Decimal | null
  valor_realizado: Prisma.Decimal | null
  data_entrega: string | null
  fornecedor: { id: number; nome: string } | null
  obra_id: number
  obra_status: string | null
  obra_titulo: string | null
  obra_cidade: string | null
  created_at: Date
}

export type ListarPedidoCompraCounts = {
  TODOS: number
  RASCUNHO: number
  PENDENTE: number
  APROVADO: number
  EM_COMPRA: number
  AGUARDANDO_PAGAMENTO: number
  AGUARDANDO_ENTREGA: number
  ENTREGUE: number
  CANCELADO: number
}

export type ListarPedidoCompraResult = {
  items: PedidoCompraListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  countsByStatus?: ListarPedidoCompraCounts
}

function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function mapStatus(raw?: string | PedidoCompraStatus | null): PedidoCompraStatus | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoCompraStatus).includes(raw as PedidoCompraStatus)) return raw as PedidoCompraStatus

  const n = normalizeStr(String(raw))
  if (n === "rascunho") return PedidoCompraStatus.RASCUNHO
  if (n === "pendente") return PedidoCompraStatus.PENDENTE
  if (n === "aprovado") return PedidoCompraStatus.APROVADO
  if (n === "em compra" || n === "emcompra") return PedidoCompraStatus.EM_COMPRA
  if (n === "aguardando pagamento" || n === "aguardandopagamento") return PedidoCompraStatus.AGUARDANDO_PAGAMENTO
  if (n === "aguardando entrega" || n === "aguardandoentrega") return PedidoCompraStatus.AGUARDANDO_ENTREGA
  if (n === "entregue") return PedidoCompraStatus.ENTREGUE
  if (n === "cancelado") return PedidoCompraStatus.CANCELADO
  return undefined
}

function mapCategoria(raw?: string | PedidoCategoria | null): PedidoCategoria | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoCategoria).includes(raw as PedidoCategoria)) return raw as PedidoCategoria

  const n = normalizeStr(String(raw))
  if (n === "telha") return PedidoCategoria.TELHA
  if (n === "madeira") return PedidoCategoria.MADEIRA
  if (n === "materiais" || n === "material") return PedidoCategoria.MATERIAIS
  if (n === "andaimes" || n === "andaime") return PedidoCategoria.ANDAIMES
  return undefined
}

function emptyCounts(total: number): ListarPedidoCompraCounts {
  return {
    TODOS: total,
    RASCUNHO: 0,
    PENDENTE: 0,
    APROVADO: 0,
    EM_COMPRA: 0,
    AGUARDANDO_PAGAMENTO: 0,
    AGUARDANDO_ENTREGA: 0,
    ENTREGUE: 0,
    CANCELADO: 0,
  }
}

export async function listarPedidosCompra(input: ListarPedidoCompraInput): Promise<ListarPedidoCompraResult> {
  const page = Math.max(1, Number(input.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize ?? 10)))
  const skip = (page - 1) * pageSize
  const take = pageSize

  const baseWhere: Prisma.pedido_compraWhereInput = {}

  if (Number.isFinite(Number(input.obraId)) && Number(input.obraId) > 0) {
    baseWhere.obra_id = Number(input.obraId)
  }

  if (Number.isFinite(Number(input.fornecedorId)) && Number(input.fornecedorId) > 0) {
    baseWhere.fornecedor_id = Number(input.fornecedorId)
  }

  const cat = mapCategoria(input.categoria ? String(input.categoria) : null)
  if (cat) baseWhere.categoria = cat

  const q = String(input.q ?? "").trim()
  if (q) {
    const idNum = Number(q)
    const or: Prisma.pedido_compraWhereInput[] = [
      { descricao: { contains: q, mode: "insensitive" } },
      { fornecedor: { is: { nome: { contains: q, mode: "insensitive" } } } },
    ]
    if (Number.isFinite(idNum)) or.push({ id: idNum })
    baseWhere.OR = or
  }

  const where: Prisma.pedido_compraWhereInput = { ...baseWhere }

  const statusRaw = input.status
  if (statusRaw && normalizeStr(String(statusRaw)) !== "todos") {
    const st = mapStatus(String(statusRaw))
    if (st) where.status = st
  }

  const orderBy = (input.orderBy ?? "created_at") as PedidoCompraOrderBy
  const orderDir = (input.orderDir ?? "desc") as "asc" | "desc"

  const dirSql = orderDir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`
  const nullDateSql = Prisma.sql`DATE '9999-12-31'`

  const selectSql = Prisma.sql`
    SELECT
      pc.id,
      pc.descricao,
      pc.categoria,
      pc.status,
      pc.valor_orcado,
      pc.valor_realizado,
      pc.data_entrega,
      pc.obra_id,
      pc.created_at,
      f.id as fornecedor_id,
      f.nome as fornecedor_nome,
      o.status as obra_status,
      o.titulo as obra_titulo,
      ci.nome as obra_cidade
    FROM pedido_compra pc
    LEFT JOIN fornecedores f ON f.id = pc.fornecedor_id
    LEFT JOIN obras o ON o.id = pc.obra_id
    LEFT JOIN cliente cl ON cl.id = o.cliente_id
    LEFT JOIN cidades ci ON ci.id = cl.cidade_id
  `

  const whereParts: Prisma.Sql[] = []
  const params: any[] = []

  if (baseWhere.obra_id != null) {
    whereParts.push(Prisma.sql`pc.obra_id = ${baseWhere.obra_id}`)
  }
  if ((baseWhere as any).fornecedor_id != null) {
    whereParts.push(Prisma.sql`pc.fornecedor_id = ${(baseWhere as any).fornecedor_id}`)
  }
  if (baseWhere.categoria != null) {
    whereParts.push(Prisma.sql`pc.categoria = ${baseWhere.categoria}`)
  }

  if (q) {
    const idNum = Number(q)
    const like = `%${q}%`
    const orParts: Prisma.Sql[] = [
      Prisma.sql`pc.descricao ILIKE ${like}`,
      Prisma.sql`f.nome ILIKE ${like}`,
    ]
    if (Number.isFinite(idNum)) orParts.push(Prisma.sql`pc.id = ${idNum}`)
    whereParts.push(Prisma.sql`(${Prisma.join(orParts, " OR ")})`)
  }

  if (where.status != null) {
    whereParts.push(Prisma.sql`pc.status = ${where.status}`)
  }

  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``

  const orderSql =
    orderBy === "status"
      ? Prisma.sql`
          ORDER BY
            CASE pc.status
              WHEN 'Rascunho' THEN 1
              WHEN 'Pendente' THEN 2
              WHEN 'Aprovado' THEN 3
              WHEN 'Em compra' THEN 4
              WHEN 'Aguardando pagamento' THEN 5
              WHEN 'Aguardando entrega' THEN 6
              WHEN 'Entregue' THEN 7
              WHEN 'Cancelado' THEN 8
              ELSE 999
            END ${dirSql},
            pc.id ASC
        `
      : orderBy === "data_entrega"
        ? Prisma.sql`ORDER BY COALESCE(pc.data_entrega, ${nullDateSql}) ${dirSql}, pc.id ASC`
        : orderBy === "valor_orcado"
          ? Prisma.sql`ORDER BY pc.valor_orcado ${dirSql} NULLS LAST, pc.id ASC`
          : orderBy === "valor_realizado"
            ? Prisma.sql`ORDER BY pc.valor_realizado ${dirSql} NULLS LAST, pc.id ASC`
            : orderBy === "descricao"
              ? Prisma.sql`ORDER BY pc.descricao ${dirSql} NULLS LAST, pc.id ASC`
              : orderBy === "id"
                ? Prisma.sql`ORDER BY pc.id ${dirSql}`
                : Prisma.sql`ORDER BY pc.created_at ${dirSql}, pc.id ASC`

  const limitSql = Prisma.sql`LIMIT ${take} OFFSET ${skip}`

  const countSql = Prisma.sql`
    SELECT COUNT(*)::int as total
    FROM pedido_compra pc
    LEFT JOIN fornecedores f ON f.id = pc.fornecedor_id
    ${whereSql}
  `

  const [countRows, rows] = await prisma.$transaction([
    prisma.$queryRaw<{ total: number }[]>(Prisma.sql`${countSql}`),
    prisma.$queryRaw<any[]>(Prisma.sql`${selectSql} ${whereSql} ${orderSql} ${limitSql}`),
  ])

  const total = Number(countRows?.[0]?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const items: PedidoCompraListItem[] = rows.map((r) => ({
    id: Number(r.id),
    descricao: r.descricao == null ? null : String(r.descricao),
    categoria: r.categoria as PedidoCategoria,
    status: r.status as PedidoCompraStatus,
    valor_orcado: r.valor_orcado as any,
    valor_realizado: r.valor_realizado as any,
    data_entrega: fromDateOnlyDb(r.data_entrega),
    obra_id: Number(r.obra_id),
    obra_status: r.obra_status == null ? null : String(r.obra_status),
    obra_titulo: r.obra_titulo == null ? null : String(r.obra_titulo),
    obra_cidade: r.obra_cidade == null ? null : String(r.obra_cidade),
    created_at: new Date(r.created_at),
    fornecedor:
      r.fornecedor_id == null
        ? null
        : { id: Number(r.fornecedor_id), nome: String(r.fornecedor_nome ?? "") },
  }))

  let countsByStatus: ListarPedidoCompraCounts | undefined

  if (input.includeCounts) {
    const countBaseWhereParts: Prisma.Sql[] = []
    if (baseWhere.obra_id != null) countBaseWhereParts.push(Prisma.sql`pc.obra_id = ${baseWhere.obra_id}`)
    if ((baseWhere as any).fornecedor_id != null) countBaseWhereParts.push(Prisma.sql`pc.fornecedor_id = ${(baseWhere as any).fornecedor_id}`)
    if (baseWhere.categoria != null) countBaseWhereParts.push(Prisma.sql`pc.categoria = ${baseWhere.categoria}`)

    if (q) {
      const idNum = Number(q)
      const like = `%${q}%`
      const orParts: Prisma.Sql[] = [
        Prisma.sql`pc.descricao ILIKE ${like}`,
        Prisma.sql`f.nome ILIKE ${like}`,
      ]
      if (Number.isFinite(idNum)) orParts.push(Prisma.sql`pc.id = ${idNum}`)
      countBaseWhereParts.push(Prisma.sql`(${Prisma.join(orParts, " OR ")})`)
    }

    const countBaseWhereSql = countBaseWhereParts.length
      ? Prisma.sql`WHERE ${Prisma.join(countBaseWhereParts, " AND ")}`
      : Prisma.sql``

    const totalAllSql = Prisma.sql`
      SELECT COUNT(*)::int as total
      FROM pedido_compra pc
      LEFT JOIN fornecedores f ON f.id = pc.fornecedor_id
      ${countBaseWhereSql}
    `

    const groupedSql = Prisma.sql`
      SELECT pc.status as status, COUNT(*)::int as total
      FROM pedido_compra pc
      LEFT JOIN fornecedores f ON f.id = pc.fornecedor_id
      ${countBaseWhereSql}
      GROUP BY pc.status
    `

    const [totalAllRows, groupedRows] = await prisma.$transaction([
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`${totalAllSql}`),
      prisma.$queryRaw<{ status: string; total: number }[]>(Prisma.sql`${groupedSql}`),
    ])

    const totalAll = Number(totalAllRows?.[0]?.total ?? 0)
    const c = emptyCounts(totalAll)

    for (const gr of groupedRows) {
      const s = String(gr.status ?? "")
      const n = Number(gr.total ?? 0)
      if (s === "Rascunho") c.RASCUNHO = n
      else if (s === "Pendente") c.PENDENTE = n
      else if (s === "Aprovado") c.APROVADO = n
      else if (s === "Em compra") c.EM_COMPRA = n
      else if (s === "Aguardando pagamento") c.AGUARDANDO_PAGAMENTO = n
      else if (s === "Aguardando entrega") c.AGUARDANDO_ENTREGA = n
      else if (s === "Entregue") c.ENTREGUE = n
      else if (s === "Cancelado") c.CANCELADO = n
    }

    countsByStatus = c
  }

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    countsByStatus,
  }
}
