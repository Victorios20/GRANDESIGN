import { prisma } from "@/lib/prisma"
import { fromDateOnlyDb } from "@/lib/date-only"

export type PedidoCompraDetalhadoErrorCode =
  | "PAYLOAD_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
  | "LOAD_FAILED"

export class PedidoCompraDetalhadoError extends Error {
  code: PedidoCompraDetalhadoErrorCode
  step?: string
  details?: Record<string, unknown>
  constructor(code: PedidoCompraDetalhadoErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

export type PedidoCompraItemDTO = {
  id: number
  pedido_compra_id: number
  descricao: string
  quantidade: any
  tamanho: any | null
  preco_unitario: any
  total: any
  created_at: Date
  updated_at: Date
}

export type PedidoCompraDetalhadoDTO = {
  id: number
  obra_id: number
  obra: { titulo: string | null }

  categoria: any
  status: any

  valor_orcado: any | null
  valor_realizado: any | null
  frete: any | null

  descricao: string | null
  observacoes: string | null

  fornecedor_id: number | null
  fornecedor: { id: number; nome: string; tipo: string | null } | null

  data_entrega: string | null
  endereco_entrega: string | null
  nome_receptor: string | null
  telefone_receptor: string | null
  link_maps: string | null

  created_at: Date
  updated_at: Date

  itens: PedidoCompraItemDTO[]
}

export async function getPedidoCompraDetalhado(pedidoCompraId: number): Promise<PedidoCompraDetalhadoDTO> {
  if (!Number.isFinite(Number(pedidoCompraId))) {
    throw new PedidoCompraDetalhadoError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", { pedidoCompraId })
  }

  try {
    const pedido = await prisma.pedido_compra.findUnique({
      where: { id: Number(pedidoCompraId) },
      include: {
        obra: { select: { titulo: true } },
        fornecedor: { select: { id: true, nome: true, tipo: true } },
        itens: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            pedido_compra_id: true,
            descricao: true,
            quantidade: true,
            tamanho: true,
            preco_unitario: true,
            total: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    })

    if (!pedido) {
      throw new PedidoCompraDetalhadoError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra não encontrado.", "load-pedido", {
        pedidoCompraId,
      })
    }

    return {
      ...(pedido as any),
      data_entrega: fromDateOnlyDb(pedido.data_entrega),
    } as PedidoCompraDetalhadoDTO
  } catch (err: any) {
    if (err instanceof PedidoCompraDetalhadoError) throw err
    throw new PedidoCompraDetalhadoError("LOAD_FAILED", "Erro ao carregar pedido detalhado.", "db", {
      err: String(err?.message ?? ""),
    })
  }
}
