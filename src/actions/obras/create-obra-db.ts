// src/actions/obras/create-obra-db.ts
"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/** =========================
 *  Erros de domínio (códigos)
 *  ========================= */
export type ObraCreateErrorCode =
  | "PAYLOAD_INVALIDO"
  | "ORCAMENTO_NAO_ENCONTRADO"
  | "ORCAMENTO_JA_LANCADO"
  | "OBRA_CREATE_FAILED"
  | "PEDIDO_HEAD_CREATE_FAILED"
  | "PEDIDO_LINK_CREATE_FAILED"
  | "IMAGENS_CREATE_FAILED"
  | "ORCAMENTO_UPDATE_FAILED"
  | "AUDIT_FAILED"
  | "CPF_INVALIDO"
  | "CLIENTE_CPF_JA_PREENCHIDO" // conflito de CPF sem force
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

export type ImagemInput = { url: string; ordem?: number | null; legenda?: string | null }

export type CriarObraInput = {
  orcamentoId: number

  // Campos obrigatórios de obras (no DB)
  endereco_obra: string
  maps_url: string
  tipo_obra: string
  largura: Decimalish
  comprimento: Decimalish
  telha_escolhida: string
  valor_obra: Decimalish
  valor_mao_de_obra: Decimalish

  // Opcionais para início
  observacoes?: string | null
  equipe_id?: number | null

  // Imagens opcionais
  imagens?: ImagemInput[]

  // Auditoria
  actorUserId: number

  // (Opcional) valores iniciais de pedido_compra head
  // Se não vierem, ficam 0/default (modelo já tem @default)
  area_telha?: Decimalish
  orcamento_telha?: Decimalish
  orcamento_madeira?: Decimalish

  // (Opcional) cadastro/atualização de CPF do cliente (na mesma transação)
  clienteCpf?: string | null
  forceUpdateClienteCpf?: boolean
}

/** Resultado resumido para o front redirecionar e iniciar edição */
export type CriarObraResult = {
  obraId: number
  orcamentoId: number
  pedidoCompraId: number
  pedidos: {
    telhaId: number
    madeiraId: number
    materiaisId: number
    andaimesId: number
  }
}

export async function criarObraComHeadPedidoCompra(input: CriarObraInput): Promise<CriarObraResult> {
  // validação mínima do payload (sem zod, para não introduzir deps)
  if (!Number.isFinite(Number(input?.orcamentoId))) {
    throw new ObraCreateError("PAYLOAD_INVALIDO", "orcamentoId inválido.", "validate")
  }
  const reqStr = ["endereco_obra", "maps_url", "tipo_obra", "telha_escolhida"] as const
  for (const k of reqStr) {
    if (!String((input as any)[k] ?? "").trim()) {
      throw new ObraCreateError("PAYLOAD_INVALIDO", `Campo obrigatório ausente: ${k}`, "validate", { field: k })
    }
  }
  const reqNum = ["largura", "comprimento", "valor_obra", "valor_mao_de_obra"] as const
  for (const k of reqNum) {
    const n = Number((input as any)[k])
    if (!Number.isFinite(n)) {
      throw new ObraCreateError("PAYLOAD_INVALIDO", `Campo numérico inválido: ${k}`, "validate", { field: k })
    }
  }

  const {
    orcamentoId,
    endereco_obra,
    maps_url,
    tipo_obra,
    largura,
    comprimento,
    telha_escolhida,
    valor_obra,
    valor_mao_de_obra,
    observacoes,
    equipe_id,
    imagens,
    actorUserId,
    area_telha,
    orcamento_telha,
    orcamento_madeira,
    clienteCpf,
    forceUpdateClienteCpf = false,
  } = input

  return await prisma.$transaction(async (tx) => {
    // 1) Orçamento precisa existir e NÃO estar lançado
    const orc = await tx.orcamento.findUnique({
      where: { id: orcamentoId },
      include: { obra: true },
    })
    if (!orc) {
      throw new ObraCreateError("ORCAMENTO_NAO_ENCONTRADO", "Orçamento não encontrado.", "load-orcamento", { orcamentoId })
    }
    if (orc.lancado_obra || orc.obra) {
      throw new ObraCreateError("ORCAMENTO_JA_LANCADO", "Já existe obra para este orçamento.", "check-orcamento", { orcamentoId })
    }

    // 1.1) (Opcional) Atualizar CPF do cliente no mesmo fluxo
    if (clienteCpf !== undefined && clienteCpf !== null && String(clienteCpf).trim() !== "") {
      const cpfDigits = onlyDigits(clienteCpf)
      if (cpfDigits.length !== 11) {
        throw new ObraCreateError("CPF_INVALIDO", "CPF inválido. Use 11 dígitos.", "cliente-cpf", { cpf: cpfDigits })
      }

      const cliente = await tx.cliente.findUnique({
        where: { id: orc.cliente_id },
        select: { id: true, cpf: true, nome: true },
      })
      if (!cliente) {
        throw new ObraCreateError("CLIENTE_NAO_ENCONTRADO", "Cliente do orçamento não encontrado.", "cliente-load", {
          cliente_id: orc.cliente_id,
        })
      }

      const atual = onlyDigits(cliente.cpf)
      if (!atual) {
        // preencher pela primeira vez
        const updated = await tx.cliente.update({
          where: { id: cliente.id },
          data: { cpf: cpfDigits },
          select: { id: true, cpf: true },
        })
        await tx.auditLog.create({
          data: {
            user_id: actorUserId ?? null,
            action: "CLIENTE_UPDATE_FROM_OBRA_CREATE",
            entity: "cliente",
            entity_id: cliente.id,
            detail: { before: { cpf: null }, after: { cpf: updated.cpf }, orcamentoId },
          },
        })
      } else if (atual !== cpfDigits) {
        if (!forceUpdateClienteCpf) {
          // sinaliza conflito ao front para confirmar
          throw new ObraCreateError(
            "CLIENTE_CPF_JA_PREENCHIDO",
            "Cliente já possui CPF cadastrado e diferente.",
            "cliente-cpf",
            { currentCpf: atual, newCpf: cpfDigits, clienteId: cliente.id }
          )
        }
        const updated = await tx.cliente.update({
          where: { id: cliente.id },
          data: { cpf: cpfDigits },
          select: { id: true, cpf: true },
        })
        await tx.auditLog.create({
          data: {
            user_id: actorUserId ?? null,
            action: "CLIENTE_UPDATE_FROM_OBRA_CREATE",
            entity: "cliente",
            entity_id: cliente.id,
            detail: { before: { cpf: atual }, after: { cpf: updated.cpf }, orcamentoId, forced: true },
          },
        })
      }
    }

    // 2) Criar OBRA (cliente vem do orçamento para evitar spoof do front)
    let obraId = 0
    try {
      const obra = await tx.obras.create({
        data: {
          orcamento: { connect: { id: orcamentoId } },
          cliente: { connect: { id: orc.cliente_id } },
          ...(Number.isFinite(Number(equipe_id)) && Number(equipe_id) ? { equipe: { connect: { id: Number(equipe_id) } } } : {}),

          endereco_obra: endereco_obra.trim(),
          maps_url: maps_url.trim(),
          tipo_obra: tipo_obra.trim(),
          largura: d(largura),
          comprimento: d(comprimento),
          telha_escolhida: telha_escolhida.trim(),

          valor_obra: d(valor_obra),
          valor_mao_de_obra: d(valor_mao_de_obra),

          observacoes: (observacoes ?? "") || null,

          createdBy: { connect: { id: actorUserId } },
          updatedBy: { connect: { id: actorUserId } },
          // status tem default, pagamentos tem default
        },
        select: { id: true },
      })
      obraId = obra.id
    } catch (err: any) {
      const msg = String(err?.message ?? "")
      if (msg.includes("Unique") || msg.includes("P2002")) {
        throw new ObraCreateError("ORCAMENTO_JA_LANCADO", "Já existe obra para este orçamento.", "obra-unique")
      }
      throw new ObraCreateError("OBRA_CREATE_FAILED", "Erro ao criar a obra.", "create-obra", { err: msg })
    }

    // 3) Criar HEAD do pedido_compra (com defaults)
    let pedidoCompraId = 0
    try {
      const head = await tx.pedido_compra.create({
        data: {
          obra: { connect: { id: obraId } },
          area_telha: d(area_telha ?? 0),
          orcamento_telha: d(orcamento_telha ?? 0),
          orcamento_madeira: d(orcamento_madeira ?? 0),
        },
        select: { id: true },
      })
      pedidoCompraId = head.id
    } catch (err: any) {
      throw new ObraCreateError("PEDIDO_HEAD_CREATE_FAILED", "Erro ao criar pedido de compra (head).", "create-pedido-head", {
        err: String(err?.message ?? ""),
      })
    }

    // 4) Criar os 4 itens “link” (placeholders) e depois atrelar no head
    let ptId = 0, pmId = 0, pmatId = 0, paId = 0
    try {
      const [pt, pm, pmat, pa] = await Promise.all([
        tx.pedido_telha.create({
          data: {
            pedido_compra: { connect: { id: pedidoCompraId } },
            descricao: "Item inicial",
            quantidade: d(0),
            preco_unitario: d(0),
            total: d(0),
          },
          select: { id: true },
        }),
        tx.pedido_madeira.create({
          data: {
            pedido_compra: { connect: { id: pedidoCompraId } },
            componente: "",
            madeira_nome: "",
            descricao: "Item inicial",
            quantidade: d(0),
            tamanho: d(0),
            preco_unitario: d(0),
            total: d(0),
          },
          select: { id: true },
        }),
        tx.pedido_materiais.create({
          data: {
            pedido_compra: { connect: { id: pedidoCompraId } },
            descricao: "Item inicial",
            quantidade: d(0),
            preco_unitario: d(0),
            total: d(0),
          },
          select: { id: true },
        }),
        tx.pedido_andaimes.create({
          data: {
            pedido_compra: { connect: { id: pedidoCompraId } },
            descricao: "Item inicial",
            quantidade: d(0),
            preco_unitario: d(0),
            total: d(0),
          },
          select: { id: true },
        }),
      ])
      ptId = pt.id
      pmId = pm.id
      pmatId = pmat.id
      paId = pa.id

      await tx.pedido_compra.update({
        where: { id: pedidoCompraId },
        data: {
          pedido_telha_id: ptId,
          pedido_madeira_id: pmId,
          pedido_materiais_id: pmatId,
          pedido_andaimes_id: paId,
        },
        select: { id: true },
      })
    } catch (err: any) {
      throw new ObraCreateError("PEDIDO_LINK_CREATE_FAILED", "Erro ao criar/ligar subpedidos (telha/madeira/materiais/andaimes).", "create-pedido-links", {
        err: String(err?.message ?? ""),
      })
    }

    // 5) Imagens (se houver)
    if (Array.isArray(imagens) && imagens.length > 0) {
      try {
        await tx.obra_imagens.createMany({
          data: imagens.map((img) => ({
            obra_id: obraId,
            url: String(img.url).trim(),
            ordem: Number.isFinite(Number(img.ordem)) ? Number(img.ordem) : null,
            legenda: (img.legenda ?? "") || null,
          })),
        })
      } catch (err: any) {
        throw new ObraCreateError("IMAGENS_CREATE_FAILED", "Erro ao salvar imagens da obra.", "create-imagens", {
          err: String(err?.message ?? ""),
        })
      }
    }

    // 6) Marcar orçamento como lançado
    try {
      await tx.orcamento.update({
        where: { id: orcamentoId },
        data: {
          lancado_obra: true,
          lancado_obra_em: new Date(),
          updatedBy: { connect: { id: actorUserId } },
        },
      })
    } catch (err: any) {
      throw new ObraCreateError("ORCAMENTO_UPDATE_FAILED", "Erro ao marcar orçamento como lançado.", "update-orcamento", {
        err: String(err?.message ?? ""),
      })
    }

    // 7) Auditoria (não quebra a transação em caso de falha; mas tentamos)
    try {
      await tx.auditLog.createMany({
        data: [
          {
            user_id: actorUserId,
            action: "OBRA_CREATE",
            entity: "obras",
            entity_id: obraId,
            detail: { orcamentoId },
          },
          {
            user_id: actorUserId,
            action: "PEDIDO_COMPRA_CREATE",
            entity: "pedido_compra",
            entity_id: pedidoCompraId,
            detail: { obraId, links: { ptId, pmId, pmatId, paId } },
          },
          {
            user_id: actorUserId,
            action: "ORCAMENTO_LANCAR_OBRA",
            entity: "orcamento",
            entity_id: orcamentoId,
            detail: { obraId },
          },
        ],
      })
    } catch (err) {
      console.error("[audit-log] create failed", err)
      // não aborta a transação de negócio
    }

    return {
      obraId,
      orcamentoId,
      pedidoCompraId,
      pedidos: {
        telhaId: ptId,
        madeiraId: pmId,
        materiaisId: pmatId,
        andaimesId: paId,
      },
    }
  }, {
    timeout: 120_000,
    maxWait: 20_000,
  })
}
