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
  componente: string | null
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
  financeiro_integracao_status: any
  financeiro_integrado_em: Date | null
  financeiro_estornado_em: Date | null
  financeiro_conta_pagar_id: number | null
  financeiro_conta_pagar_status: any | null
  financeiro_conta_pagar_valor_total: any | null
  financeiro_conta_pagar_valor_pago: any | null
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
        contas_pagar: {
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            status: true,
            valor_total: true,
            valor_pago: true,
          },
        },
        itens: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            pedido_compra_id: true,
            descricao: true,
            quantidade: true,
            tamanho: true,
            componente: true,
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
      financeiro_conta_pagar_id: (pedido as any).contas_pagar?.[0]?.id ?? null,
      financeiro_conta_pagar_status: (pedido as any).contas_pagar?.[0]?.status ?? null,
      financeiro_conta_pagar_valor_total: (pedido as any).contas_pagar?.[0]?.valor_total ?? null,
      financeiro_conta_pagar_valor_pago: (pedido as any).contas_pagar?.[0]?.valor_pago ?? null,
      data_entrega: fromDateOnlyDb(pedido.data_entrega),
    } as PedidoCompraDetalhadoDTO
  } catch (err: any) {
    if (err instanceof PedidoCompraDetalhadoError) throw err
    throw new PedidoCompraDetalhadoError("LOAD_FAILED", "Erro ao carregar pedido detalhado.", "db", {
      err: String(err?.message ?? ""),
    })
  }
}
