// src/actions/obras/create-obra-db.ts

import { prisma } from "@/lib/prisma"
import { Prisma, ObraStatus, PagamentoStatus, PedidoCategoria, PedidoCompraStatus } from "@prisma/client"

export type ObraCreateErrorCode =
  | "PAYLOAD_INVALIDO"
  | "ORCAMENTO_NAO_ENCONTRADO"
  | "ORCAMENTO_JA_LANCADO"
  | "OBRA_CREATE_FAILED"
  | "PEDIDO_CREATE_FAILED"
  | "IMAGENS_CREATE_FAILED"
  | "ORCAMENTO_UPDATE_FAILED"
  | "AUDIT_FAILED"
  | "CPF_INVALIDO"
  | "CLIENTE_CPF_JA_PREENCHIDO"
  | "CLIENTE_NAO_ENCONTRADO"

export class ObraCreateError extends Error {
  code: ObraCreateErrorCode
  step?: string
  details?: Record<string, unknown>
  constructor(code: ObraCreateErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

type Decimalish = number | string | Prisma.Decimal
const d = (v: Decimalish): Prisma.Decimal => {
  if (v instanceof Prisma.Decimal) return v
  const s = typeof v === "string" ? v.replace(",", ".") : String(v)
  return new Prisma.Decimal(s || "0")
}

function onlyDigits(s?: string | null) {
  return (s || "").replace(/\D/g, "")
}
function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}
function parseDateLoose(v?: string | Date | null): Date | null {
  if (!v) return null
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null
  const d2 = new Date(v)
  return Number.isFinite(d2.getTime()) ? d2 : null
}

function mapObraStatus(raw?: string | ObraStatus | null): ObraStatus | undefined {
  if (!raw) return undefined
  if (Object.values(ObraStatus).includes(raw as ObraStatus)) return raw as ObraStatus
  const n = normalizeStr(String(raw))
  if (n.startsWith("assinatura")) return ObraStatus.ASSINATURA_DE_CONTRATO
  if (n.startsWith("aguardando validacao")) return ObraStatus.AGUARDANDO_VALIDACAO_TECNICA
  if (n === "compras") return ObraStatus.COMPRAS
  if (n.startsWith("a iniciar")) return ObraStatus.A_INICIAR
  if (n.startsWith("execucao")) return ObraStatus.EXECUCAO
  if (n.startsWith("aguardando pagamento")) return ObraStatus.AGUARDANDO_PAGAMENTO
  if (n.startsWith("pendencia")) return ObraStatus.PENDENCIA
  if (n.startsWith("finalizado")) return ObraStatus.FINALIZADO
  return undefined
}
function mapPagamentoStatus(raw?: string | PagamentoStatus | null): PagamentoStatus | undefined {
  if (!raw) return undefined
  if (Object.values(PagamentoStatus).includes(raw as PagamentoStatus)) return raw as PagamentoStatus
  const n = normalizeStr(String(raw))
  if (n === "pendente") return PagamentoStatus.PENDENTE
  if (n === "efetuado") return PagamentoStatus.EFETUADO
  return undefined
}

function mapPedidoCategoria(raw?: string | PedidoCategoria | null): PedidoCategoria | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoCategoria).includes(raw as PedidoCategoria)) return raw as PedidoCategoria
  const n = normalizeStr(String(raw))
  if (n === "telha") return PedidoCategoria.TELHA
  if (n === "madeira") return PedidoCategoria.MADEIRA
  if (n === "materiais" || n === "material") return PedidoCategoria.MATERIAIS
  if (n === "andaimes" || n === "andaime") return PedidoCategoria.ANDAIMES
  return undefined
}

function mapPedidoCompraStatus(raw?: string | PedidoCompraStatus | null): PedidoCompraStatus | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoCompraStatus).includes(raw as PedidoCompraStatus)) return raw as PedidoCompraStatus

  const n = normalizeStr(String(raw))
  if (n === "rascunho") return PedidoCompraStatus.RASCUNHO
  if (n === "pendente") return PedidoCompraStatus.PENDENTE
  if (n === "aprovado") return PedidoCompraStatus.APROVADO
  if (n === "em compra" || n === "em_compra" || n === "emcompra") return PedidoCompraStatus.EM_COMPRA
  if (n === "aguardando pagamento" || n === "aguardando_pagamento") return PedidoCompraStatus.AGUARDANDO_PAGAMENTO
  if (n === "aguardando entrega" || n === "aguardando_entrega") return PedidoCompraStatus.AGUARDANDO_ENTREGA
  if (n === "entregue") return PedidoCompraStatus.ENTREGUE
  if (n === "cancelado") return PedidoCompraStatus.CANCELADO
  return undefined
}

export type ImagemInput = { url: string; ordem?: number | null; legenda?: string | null }
export type PedidoItemInput = {
  descricao: string
  quantidade: Decimalish
  tamanho?: Decimalish
  preco_unitario: Decimalish
  total: Decimalish
}

export type PedidoCompraInput = {
  categoria: PedidoCategoria | string
  status?: PedidoCompraStatus | string | null
  valor_orcado?: Decimalish | null
  valor_realizado?: Decimalish | null
  frete?: Decimalish | null
  descricao?: string | null
  observacoes?: string | null
  fornecedor_id?: number | string | null
  data_entrega?: string | Date | null
  endereco_entrega?: string | null
  nome_receptor?: string | null
  telefone_receptor?: string | null
  link_maps?: string | null
  itens?: PedidoItemInput[]
}

export type CriarObraInput = {
  orcamentoId: number
  endereco_obra: string
  maps_url: string
  tipo_obra: string
  largura: Decimalish
  comprimento: Decimalish
  telha_escolhida: string
  valor_obra: Decimalish
  valor_mao_de_obra: Decimalish
  observacoes?: string | null
  equipe_id?: number | null
  imagens?: ImagemInput[]
  actorUserId: number
  clienteCpf?: string | null
  forceUpdateClienteCpf?: boolean
  status?: ObraStatus | string | null

  pagamento_entrada?: Decimalish
  forma_pagamento_entrada?: string | null
  status_pagamento_entrada?: PagamentoStatus | string | null
  pagamento_quitacao?: Decimalish
  forma_pagamento_quitacao?: string | null
  status_pagamento_quitacao?: PagamentoStatus | string | null

  telhaItens?: PedidoItemInput[]
  madeiraItens?: PedidoItemInput[]
  materiaisItens?: PedidoItemInput[]
  andaimesItens?: PedidoItemInput[]

  fornecedor_telha_id?: number | null
  fornecedor_madeira_id?: number | null
  andaimes_fornecedor_id?: number | null

  pedidosCompra?: PedidoCompraInput[]

  data_prev_inicio?: string | Date | null
  data_prev_conclusao?: string | Date | null
}

export type CriarObraResult = {
  obraId: number
  orcamentoId: number
  pedidoCompraId: number | null
  pedidos: Partial<Record<PedidoCategoria, number>>
}

export async function criarObraComHeadPedidoCompra(input: CriarObraInput): Promise<CriarObraResult> {
  if (!Number.isFinite(Number(input?.orcamentoId))) {
    throw new ObraCreateError("PAYLOAD_INVALIDO", "orcamentoId inválido.", "validate")
  }

  return await prisma.$transaction(
    async (tx) => {
      const orc = await tx.orcamento.findUnique({ where: { id: input.orcamentoId }, include: { obra: true } })
      if (!orc) throw new ObraCreateError("ORCAMENTO_NAO_ENCONTRADO", "Orçamento não encontrado.")
      if (orc.lancado_obra || orc.obra) throw new ObraCreateError("ORCAMENTO_JA_LANCADO", "Já existe obra.")

      const obra = await tx.obras.create({
        data: {
          orcamento: { connect: { id: input.orcamentoId } },
          cliente: { connect: { id: orc.cliente_id } },
          ...(input.equipe_id ? { equipe: { connect: { id: input.equipe_id } } } : {}),
          titulo: (orc as any).titulo ?? null,
          endereco_obra: input.endereco_obra,
          maps_url: input.maps_url,
          tipo_obra: input.tipo_obra,
          largura: d(input.largura),
          comprimento: d(input.comprimento),
          telha_escolhida: input.telha_escolhida,
          valor_obra: d(input.valor_obra),
          valor_mao_de_obra: d(input.valor_mao_de_obra),
          ...(mapObraStatus(input.status) ? { status: mapObraStatus(input.status)! } : {}),
          observacoes: input.observacoes ?? null,
          ...(input.pagamento_entrada !== undefined ? { pagamento_entrada: d(input.pagamento_entrada) } : {}),
          ...(input.forma_pagamento_entrada !== undefined ? { forma_pagamento_entrada: input.forma_pagamento_entrada } : {}),
          ...(mapPagamentoStatus(input.status_pagamento_entrada)
            ? { status_pagamento_entrada: mapPagamentoStatus(input.status_pagamento_entrada)! }
            : {}),
          ...(input.pagamento_quitacao !== undefined ? { pagamento_quitacao: d(input.pagamento_quitacao) } : {}),
          ...(input.forma_pagamento_quitacao !== undefined ? { forma_pagamento_quitacao: input.forma_pagamento_quitacao } : {}),
          ...(mapPagamentoStatus(input.status_pagamento_quitacao)
            ? { status_pagamento_quitacao: mapPagamentoStatus(input.status_pagamento_quitacao)! }
            : {}),
          createdBy: { connect: { id: input.actorUserId } },
          updatedBy: { connect: { id: input.actorUserId } },
        },
        select: { id: true },
      })

      const inicio = parseDateLoose(input.data_prev_inicio)
      const conclusao = parseDateLoose(input.data_prev_conclusao)

      if (input.equipe_id && inicio && conclusao) {
        await tx.ordem_servico.create({
          data: {
            obra: { connect: { id: obra.id } },
            equipe: { connect: { id: input.equipe_id } },
            data_prev_inicio: inicio,
            data_prev_conclusao: conclusao,
          },
          select: { id: true },
        })
      }

      const pedidos: Partial<Record<PedidoCategoria, number>> = {}
      let primeiroPedidoId: number | null = null

      const pedidosCompra = Array.isArray(input.pedidosCompra) ? input.pedidosCompra : []

      if (pedidosCompra.length > 0) {
        for (const p of pedidosCompra) {
          const cat = mapPedidoCategoria((p as any)?.categoria)
          if (!cat) continue

          const itens = Array.isArray((p as any)?.itens) ? ((p as any).itens as PedidoItemInput[]) : []

          const hasAnyHeaderValue =
            (p as any)?.status != null ||
            (p as any)?.valor_orcado != null ||
            (p as any)?.valor_realizado != null ||
            (p as any)?.frete != null ||
            String((p as any)?.descricao ?? "").trim() ||
            String((p as any)?.observacoes ?? "").trim() ||
            (p as any)?.fornecedor_id != null ||
            (p as any)?.data_entrega != null ||
            String((p as any)?.endereco_entrega ?? "").trim() ||
            String((p as any)?.nome_receptor ?? "").trim() ||
            String((p as any)?.telefone_receptor ?? "").trim() ||
            String((p as any)?.link_maps ?? "").trim()

          if (!hasAnyHeaderValue && itens.length === 0) continue

          const fornRaw = (p as any)?.fornecedor_id
          const fornId = Number.isFinite(Number(fornRaw)) ? Number(fornRaw) : null

          const pedidoStatus = mapPedidoCompraStatus((p as any)?.status)
          const dataEntrega = parseDateLoose((p as any)?.data_entrega)

          const pedido = await tx.pedido_compra.create({
            data: {
              obra: { connect: { id: obra.id } },
              categoria: cat,
              ...(pedidoStatus ? { status: pedidoStatus } : {}),
              ...((p as any)?.valor_orcado != null ? { valor_orcado: d((p as any).valor_orcado) } : {}),
              ...((p as any)?.valor_realizado != null ? { valor_realizado: d((p as any).valor_realizado) } : {}),
              ...((p as any)?.frete != null ? { frete: d((p as any).frete) } : {}),
              descricao: (p as any)?.descricao ?? null,
              observacoes: (p as any)?.observacoes ?? null,
              ...(fornId ? { fornecedor: { connect: { id: fornId } } } : {}),
              data_entrega: dataEntrega,
              endereco_entrega: (p as any)?.endereco_entrega ?? null,
              nome_receptor: (p as any)?.nome_receptor ?? null,
              telefone_receptor: (p as any)?.telefone_receptor ?? null,
              link_maps: (p as any)?.link_maps ?? null,
            },
            select: { id: true },
          })

          if (!primeiroPedidoId) primeiroPedidoId = pedido.id
          pedidos[cat] = pedido.id

          for (const it of itens) {
            await tx.pedido_itens.create({
              data: {
                pedido_compra_id: pedido.id,
                descricao: it.descricao,
                quantidade: d(it.quantidade),
                tamanho: cat === PedidoCategoria.MADEIRA && it.tamanho != null ? d(it.tamanho) : null,
                preco_unitario: d(it.preco_unitario),
                total: d(it.total),
              },
            })
          }
        }
      } else {
        const grupos: { categoria: PedidoCategoria; itens?: PedidoItemInput[]; fornecedor?: number | null }[] = [
          { categoria: PedidoCategoria.TELHA, itens: input.telhaItens, fornecedor: input.fornecedor_telha_id },
          { categoria: PedidoCategoria.MADEIRA, itens: input.madeiraItens, fornecedor: input.fornecedor_madeira_id },
          { categoria: PedidoCategoria.MATERIAIS, itens: input.materiaisItens },
          { categoria: PedidoCategoria.ANDAIMES, itens: input.andaimesItens, fornecedor: input.andaimes_fornecedor_id },
        ]

        for (const g of grupos) {
          if (!Array.isArray(g.itens) || g.itens.length === 0) continue

          const pedido = await tx.pedido_compra.create({
            data: {
              obra: { connect: { id: obra.id } },
              categoria: g.categoria,
              status: PedidoCompraStatus.RASCUNHO,
              ...(g.fornecedor ? { fornecedor: { connect: { id: g.fornecedor } } } : {}),
            },
            select: { id: true },
          })

          if (!primeiroPedidoId) primeiroPedidoId = pedido.id
          pedidos[g.categoria] = pedido.id

          for (const it of g.itens) {
            await tx.pedido_itens.create({
              data: {
                pedido_compra_id: pedido.id,
                descricao: it.descricao,
                quantidade: d(it.quantidade),
                tamanho: g.categoria === PedidoCategoria.MADEIRA && it.tamanho != null ? d(it.tamanho) : null,
                preco_unitario: d(it.preco_unitario),
                total: d(it.total),
              },
            })
          }
        }
      }

      if (Array.isArray(input.imagens) && input.imagens.length > 0) {
        await tx.obra_imagens.createMany({
          data: input.imagens.map((img) => ({
            obra_id: obra.id,
            url: img.url,
            ordem: img.ordem ?? null,
            legenda: img.legenda ?? null,
          })),
        })
      }

      await tx.orcamento.update({
        where: { id: input.orcamentoId },
        data: { lancado_obra: true, lancado_obra_em: new Date(), updatedBy: { connect: { id: input.actorUserId } } },
      })

      return { obraId: obra.id, orcamentoId: input.orcamentoId, pedidoCompraId: primeiroPedidoId, pedidos }
    },
    { maxWait: 20000, timeout: 60000 }
  )
}
