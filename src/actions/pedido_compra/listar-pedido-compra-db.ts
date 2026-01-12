// src/actions/pedido_compra/listar-pedido-compra-db.ts
import { prisma } from "@/lib/prisma"
import { Prisma, PedidoCompraStatus, PedidoCategoria } from "@prisma/client"

export type PedidoCompraOrderBy =
  | "created_at"
  | "data_entrega"
  | "valor_orcado"
  | "valor_realizado"
  | "descricao"
  | "id"

export type ListarPedidoCompraInput = {
  page?: number
  pageSize?: number

  obraId?: number | null
  status?: "TODOS" | PedidoCompraStatus | string | null
  categoria?: PedidoCategoria | string | null

  q?: string | null

  orderBy?: PedidoCompraOrderBy
  orderDir?: "asc" | "desc"
}

export type PedidoCompraListItem = {
  id: number
  descricao: string | null
  categoria: PedidoCategoria
  status: PedidoCompraStatus
  valor_orcado: Prisma.Decimal | null
  valor_realizado: Prisma.Decimal | null
  data_entrega: Date | null
  fornecedor: { id: number; nome: string } | null
  obra_id: number
  created_at: Date
}

export type ListarPedidoCompraResult = {
  items: PedidoCompraListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
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

export async function listarPedidosCompra(input: ListarPedidoCompraInput): Promise<ListarPedidoCompraResult> {
  const page = Math.max(1, Number(input.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize ?? 10)))
  const skip = (page - 1) * pageSize
  const take = pageSize

  const where: Prisma.pedido_compraWhereInput = {}

  if (Number.isFinite(Number(input.obraId)) && Number(input.obraId) > 0) {
    where.obra_id = Number(input.obraId)
  }

  const statusRaw = input.status
  if (statusRaw && normalizeStr(String(statusRaw)) !== "todos") {
    const st = mapStatus(String(statusRaw))
    if (st) where.status = st
  }

  const cat = mapCategoria(input.categoria ? String(input.categoria) : null)
  if (cat) where.categoria = cat

  const q = String(input.q ?? "").trim()
  if (q) {
    const idNum = Number(q)
    const or: Prisma.pedido_compraWhereInput[] = [
      { descricao: { contains: q, mode: "insensitive" } },
      { fornecedor: { is: { nome: { contains: q, mode: "insensitive" } } } },
    ]
    if (Number.isFinite(idNum)) or.push({ id: idNum })
    where.OR = or
  }

  const orderBy = (input.orderBy ?? "created_at") as PedidoCompraOrderBy
  const orderDir = (input.orderDir ?? "desc") as "asc" | "desc"

  const orderByClause: Prisma.pedido_compraOrderByWithRelationInput =
    orderBy === "descricao"
      ? { descricao: orderDir }
      : orderBy === "data_entrega"
        ? { data_entrega: orderDir }
        : orderBy === "valor_orcado"
          ? { valor_orcado: orderDir }
          : orderBy === "valor_realizado"
            ? { valor_realizado: orderDir }
            : orderBy === "id"
              ? { id: orderDir }
              : { created_at: orderDir }

  const [total, rows] = await prisma.$transaction([
    prisma.pedido_compra.count({ where }),
    prisma.pedido_compra.findMany({
      where,
      orderBy: orderByClause,
      skip,
      take,
      select: {
        id: true,
        descricao: true,
        categoria: true,
        status: true,
        valor_orcado: true,
        valor_realizado: true,
        data_entrega: true,
        obra_id: true,
        created_at: true,
        fornecedor: { select: { id: true, nome: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    items: rows as any,
    page,
    pageSize,
    total,
    totalPages,
  }
}
