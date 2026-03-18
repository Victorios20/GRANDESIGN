import { prisma } from "@/lib/prisma"
import { parseDateOnlyInput } from "@/lib/date-only"
import { Prisma, PedidoCategoria, PedidoCompraStatus } from "@prisma/client"

export type PedidoCompraCreateErrorCode =
  | "PAYLOAD_INVALIDO"
  | "OBRA_NAO_ENCONTRADA"
  | "FORNECEDOR_NAO_ENCONTRADO"
  | "PEDIDO_CREATE_FAILED"
  | "ITENS_CREATE_FAILED"
  | "AUDIT_FAILED"

export class PedidoCompraCreateError extends Error {
  code: PedidoCompraCreateErrorCode
  step?: string
  details?: Record<string, unknown>
  constructor(code: PedidoCompraCreateErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
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

function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
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

function mapStatus(raw?: string | PedidoCompraStatus | null): PedidoCompraStatus | undefined {
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

export type PedidoItemInput = {
  descricao: string
  quantidade: Decimalish
  tamanho?: Decimalish | null
  preco_unitario: Decimalish
  total: Decimalish
}

export type CriarPedidoCompraInput = {
  obra_id: number
  categoria: PedidoCategoria | string
  status?: PedidoCompraStatus | string | null

  valor_orcado?: Decimalish | null
  valor_realizado?: Decimalish | null
  frete?: Decimalish | null

  descricao?: string | null
  observacoes?: string | null

  fornecedor_id?: number | null

  data_entrega?: string | Date | null
  endereco_entrega?: string | null
  nome_receptor?: string | null
  telefone_receptor?: string | null
  link_maps?: string | null

  itens: PedidoItemInput[]

  actorUserId: number
}

export type CriarPedidoCompraResult = {
  pedidoCompraId: number
  itensIds: number[]
}

export async function criarPedidoCompraComItens(input: CriarPedidoCompraInput): Promise<CriarPedidoCompraResult> {
  if (!Number.isFinite(Number(input?.obra_id))) {
    throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", "obra_id inválido.", "validate", { field: "obra_id" })
  }

  const categoria = mapCategoria(input?.categoria as any)
  if (!categoria) {
    throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", "categoria inválida.", "validate", { field: "categoria" })
  }

  const itens = Array.isArray(input?.itens) ? input.itens : []
  if (!itens.length) {
    throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", "itens é obrigatório (mínimo 1).", "validate", { field: "itens" })
  }

  for (let i = 0; i < itens.length; i++) {
    const it = itens[i] as any
    if (!String(it?.descricao ?? "").trim()) {
      throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", "Item sem descricao.", "validate", { index: i, field: "itens.descricao" })
    }
    const reqNum = ["quantidade", "preco_unitario", "total"] as const
    for (const k of reqNum) {
      if (!Number.isFinite(Number(it?.[k]))) {
        throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", `Item com número inválido: ${k}.`, "validate", { index: i, field: `itens.${k}` })
      }
    }
    if (it?.tamanho != null && it?.tamanho !== "" && !Number.isFinite(Number(it?.tamanho))) {
      throw new PedidoCompraCreateError("PAYLOAD_INVALIDO", "Item com tamanho inválido.", "validate", { index: i, field: "itens.tamanho" })
    }
  }

  const statusMapped = mapStatus(input.status ?? null) ?? PedidoCompraStatus.RASCUNHO

  return await prisma.$transaction(
    async (tx) => {
      const obra = await tx.obras.findUnique({ where: { id: Number(input.obra_id) }, select: { id: true } })
      if (!obra) {
        throw new PedidoCompraCreateError("OBRA_NAO_ENCONTRADA", "Obra não encontrada.", "load-obra", { obra_id: input.obra_id })
      }

      if (input.fornecedor_id != null) {
        const forn = await tx.fornecedores.findUnique({ where: { id: Number(input.fornecedor_id) }, select: { id: true } })
        if (!forn) {
          throw new PedidoCompraCreateError("FORNECEDOR_NAO_ENCONTRADO", "Fornecedor não encontrado.", "load-fornecedor", {
            fornecedor_id: input.fornecedor_id,
          })
        }
      }

      let pedidoCompraId = 0
      try {
        const created = await tx.pedido_compra.create({
          data: {
            obra: { connect: { id: obra.id } },
            categoria,
            status: statusMapped,

            valor_orcado: input.valor_orcado != null ? d(input.valor_orcado) : null,
            valor_realizado: input.valor_realizado != null ? d(input.valor_realizado) : null,
            frete: input.frete != null ? d(input.frete) : null,

            descricao: (input.descricao ?? "") || null,
            observacoes: (input.observacoes ?? "") || null,

            ...(input.fornecedor_id != null ? { fornecedor: { connect: { id: Number(input.fornecedor_id) } } } : {}),

            data_entrega: parseDateOnlyInput(input.data_entrega ?? null),
            endereco_entrega: (input.endereco_entrega ?? "") || null,
            nome_receptor: (input.nome_receptor ?? "") || null,
            telefone_receptor: (input.telefone_receptor ?? "") || null,
            link_maps: (input.link_maps ?? "") || null,
          },
          select: { id: true },
        })
        pedidoCompraId = created.id
      } catch (err: any) {
        throw new PedidoCompraCreateError("PEDIDO_CREATE_FAILED", "Erro ao criar pedido_compra.", "create-pedido", { err: String(err?.message ?? "") })
      }

      let itensIds: number[] = []
      try {
        const rows = await Promise.all(
          itens.map((it) =>
            tx.pedido_itens.create({
              data: {
                pedido_compra: { connect: { id: pedidoCompraId } },
                descricao: String(it.descricao).trim(),
                quantidade: d(it.quantidade),
                tamanho: it.tamanho != null && it.tamanho !== "" ? d(it.tamanho as any) : null,
                preco_unitario: d(it.preco_unitario),
                total: d(it.total),
              },
              select: { id: true },
            })
          )
        )
        itensIds = rows.map((r) => r.id)
      } catch (err: any) {
        throw new PedidoCompraCreateError("ITENS_CREATE_FAILED", "Erro ao criar itens do pedido.", "create-itens", { err: String(err?.message ?? "") })
      }

      try {
        await tx.auditLog.create({
          data: {
            user_id: input.actorUserId ?? null,
            action: "PEDIDO_COMPRA_CREATE",
            entity: "pedido_compra",
            entity_id: pedidoCompraId,
            detail: {
              obra_id: input.obra_id,
              categoria,
              status: statusMapped,
              fornecedor_id: input.fornecedor_id ?? null,
              itens_count: itensIds.length,
            },
          },
        })
      } catch (err) {
      }

      return { pedidoCompraId, itensIds }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
