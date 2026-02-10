// src/actions/obras/create-obra-db.ts
import { prisma } from "@/lib/prisma"
import {
  Prisma,
  ObraStatus,
  PagamentoStatus,
  PedidoStatusPadrao,
  PedidoStatusMateriais,
  PedidoStatusAndaimes,
} from "@prisma/client"

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
  | "CLIENTE_CPF_JA_PREENCHIDO"
  | "CLIENTE_NAO_ENCONTRADO"
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
  if (n.startsWith("aguardando validacao tecn")) return ObraStatus.AGUARDANDO_VALIDACAO_TECNICA
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
function mapPedidoPadraoStatus(raw?: string | PedidoStatusPadrao | null): PedidoStatusPadrao | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoStatusPadrao).includes(raw as PedidoStatusPadrao)) return raw as PedidoStatusPadrao
  const n = normalizeStr(String(raw))
  if (n === "pendente") return PedidoStatusPadrao.PENDENTE
  if (n === "aguardando pagamento") return PedidoStatusPadrao.AGUARDANDO_PAGAMENTO
  if (n === "pedido feito") return PedidoStatusPadrao.PEDIDO_FEITO
  if (n === "entregue") return PedidoStatusPadrao.ENTREGUE
  return undefined
}
function mapMateriaisStatus(raw?: string | PedidoStatusMateriais | null): PedidoStatusMateriais | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoStatusMateriais).includes(raw as PedidoStatusMateriais)) return raw as PedidoStatusMateriais
  const n = normalizeStr(String(raw))
  if (n === "pendente") return PedidoStatusMateriais.PENDENTE
  if (n === "em estoque") return PedidoStatusMateriais.EM_ESTOQUE
  if (n === "entregue") return PedidoStatusMateriais.ENTREGUE
  return undefined
}
function mapAndaimesStatus(raw?: string | PedidoStatusAndaimes | null): PedidoStatusAndaimes | undefined {
  if (!raw) return undefined
  if (Object.values(PedidoStatusAndaimes).includes(raw as PedidoStatusAndaimes)) return raw as PedidoStatusAndaimes
  const n = normalizeStr(String(raw))
  if (n === "pendente") return PedidoStatusAndaimes.PENDENTE
  if (n === "pedido feito") return PedidoStatusAndaimes.PEDIDO_FEITO
  if (n === "entregue") return PedidoStatusAndaimes.ENTREGUE
  if (n === "a coletar" || n === "à coletar") return PedidoStatusAndaimes.A_COLETAR
  if (n === "coletado") return PedidoStatusAndaimes.COLETADO
  return undefined
}

export type ImagemInput = { url: string; ordem?: number | null; legenda?: string | null }
export type PedidoTelhaItemInput = { descricao: string; quantidade: Decimalish; preco_unitario: Decimalish; total: Decimalish }
export type PedidoMadeiraItemInput = {
  componente: string; madeira_nome: string; descricao: string;
  quantidade: Decimalish; tamanho: Decimalish; preco_unitario: Decimalish; total: Decimalish
}
export type PedidoMateriaisItemInput = { descricao: string; quantidade: Decimalish; preco_unitario: Decimalish; total: Decimalish }
export type PedidoAndaimesItemInput = { descricao: string; quantidade: Decimalish; preco_unitario: Decimalish; total: Decimalish }

export type CriarObraInput = {
  // HEAD / INFOS GERAIS
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

  // FINANCEIRO
  pagamento_entrada?: Decimalish
  forma_pagamento_entrada?: string | null
  status_pagamento_entrada?: PagamentoStatus | string | null
  pagamento_quitacao?: Decimalish
  forma_pagamento_quitacao?: string | null
  status_pagamento_quitacao?: PagamentoStatus | string | null

  // PEDIDO (HEAD)
  area_telha?: Decimalish
  orcamento_telha?: Decimalish
  previsao_telha?: string | Date | null
  status_telha?: PedidoStatusPadrao | string | null
  fornecedor_telha_id?: number | null

  orcamento_madeira?: Decimalish
  previsao_madeira?: string | Date | null
  status_madeira?: PedidoStatusPadrao | string | null
  fornecedor_madeira_id?: number | null

  materiais_status?: PedidoStatusMateriais | string | null

  andaimes_status?: PedidoStatusAndaimes | string | null
  andaimes_fornecedor_id?: number | null

  // PEDIDO (ITENS)
  telhaItens?: PedidoTelhaItemInput[]
  madeiraItens?: PedidoMadeiraItemInput[]
  materiaisItens?: PedidoMateriaisItemInput[]
  andaimesItens?: PedidoAndaimesItemInput[]

  // Aceitar também um objeto aninhado opcional (fallback)
  pedidoCompra?: {
    telha?: { area?: Decimalish; orcamento?: Decimalish; previsao?: string | Date | null; status?: string | PedidoStatusPadrao; fornecedorId?: number | null }
    madeira?: { orcamento?: Decimalish; previsao?: string | Date | null; status?: string | PedidoStatusPadrao; fornecedorId?: number | null }
    materiais?: { status?: string | PedidoStatusMateriais }
    andaimes?: { status?: string | PedidoStatusAndaimes; fornecedorId?: number | null }
    itens?: {
      telha?: PedidoTelhaItemInput[]
      madeira?: PedidoMadeiraItemInput[]
      materiais?: PedidoMateriaisItemInput[]
      andaimes?: PedidoAndaimesItemInput[]
    }
  }

  // EXECUÇÃO (OS) — opcionais no create; a OS só será criada se todos estiverem válidos
  data_prev_inicio?: string | Date | null
  data_prev_conclusao?: string | Date | null
}

export type CriarObraResult = {
  obraId: number
  orcamentoId: number
  pedidoCompraId: number
  pedidos: { telhaId: number; madeiraId: number; materiaisId: number; andaimesId: number }
}

export async function criarObraComHeadPedidoCompra(input: CriarObraInput): Promise<CriarObraResult> {
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

  const pc = (input as any).pedidoCompra ?? {}
  const telhaHead = pc.telha ?? {}
  const madeiraHead = pc.madeira ?? {}
  const materiaisHead = pc.materiais ?? {}
  const andaimesHead = pc.andaimes ?? {}
  const itensPC = pc.itens ?? {}

  const areaTelhaEff = input.area_telha ?? telhaHead.area ?? 0
  const orcTelhaEff = input.orcamento_telha ?? telhaHead.orcamento ?? 0
  const prevTelhaEff = input.previsao_telha ?? telhaHead.previsao ?? null
  const statusTelhaEff = input.status_telha ?? telhaHead.status ?? null
  const fornTelhaEff = input.fornecedor_telha_id ?? telhaHead.fornecedorId ?? null

  const orcMadeiraEff = input.orcamento_madeira ?? madeiraHead.orcamento ?? 0
  const prevMadeiraEff = input.previsao_madeira ?? madeiraHead.previsao ?? null
  const statusMadeiraEff = input.status_madeira ?? madeiraHead.status ?? null
  const fornMadeiraEff = input.fornecedor_madeira_id ?? madeiraHead.fornecedorId ?? null

  const statusMateriaisEff = input.materiais_status ?? materiaisHead.status ?? null

  const statusAndaimesEff = input.andaimes_status ?? andaimesHead.status ?? null
  const fornAndaimesEff = input.andaimes_fornecedor_id ?? andaimesHead.fornecedorId ?? null

  const telhaItensEff = input.telhaItens ?? itensPC.telha ?? []
  const madeiraItensEff = input.madeiraItens ?? itensPC.madeira ?? []
  const materiaisItensEff = input.materiaisItens ?? itensPC.materiais ?? []
  const andaimesItensEff = input.andaimesItens ?? itensPC.andaimes ?? []

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
    clienteCpf,
    forceUpdateClienteCpf = false,
    status,

    pagamento_entrada,
    forma_pagamento_entrada,
    status_pagamento_entrada,
    pagamento_quitacao,
    forma_pagamento_quitacao,
    status_pagamento_quitacao,

    data_prev_inicio,
    data_prev_conclusao,
  } = input

  return await prisma.$transaction(
    async (tx) => {
      const orc = await tx.orcamento.findUnique({ where: { id: orcamentoId }, include: { obra: true } })
      if (!orc) throw new ObraCreateError("ORCAMENTO_NAO_ENCONTRADO", "Orçamento não encontrado.", "load-orcamento", { orcamentoId })
      if (orc.lancado_obra || orc.obra)
        throw new ObraCreateError("ORCAMENTO_JA_LANCADO", "Já existe obra para este orçamento.", "check-orcamento", { orcamentoId })

      if (clienteCpf !== undefined && clienteCpf !== null && String(clienteCpf).trim() !== "") {
        const cpfDigits = onlyDigits(clienteCpf)
        if (cpfDigits.length !== 11) throw new ObraCreateError("CPF_INVALIDO", "CPF inválido. Use 11 dígitos.", "cliente-cpf", { cpf: cpfDigits })

        const cliente = await tx.cliente.findUnique({ where: { id: orc.cliente_id }, select: { id: true, cpf: true, nome: true } })
        if (!cliente)
          throw new ObraCreateError("CLIENTE_NAO_ENCONTRADO", "Cliente do orçamento não encontrado.", "cliente-load", { cliente_id: orc.cliente_id })

        const atual = onlyDigits(cliente.cpf)
        if (!atual) {
          const updated = await tx.cliente.update({ where: { id: cliente.id }, data: { cpf: cpfDigits }, select: { id: true, cpf: true } })
          await tx.auditLog.create({
            data: { user_id: actorUserId ?? null, action: "CLIENTE_UPDATE_FROM_OBRA_CREATE", entity: "cliente", entity_id: cliente.id,
              detail: { before: { cpf: null }, after: { cpf: updated.cpf }, orcamentoId } },
          })
        } else if (atual !== cpfDigits) {
          if (!forceUpdateClienteCpf)
            throw new ObraCreateError("CLIENTE_CPF_JA_PREENCHIDO", "Cliente já possui CPF cadastrado e diferente.", "cliente-cpf",
              { currentCpf: atual, newCpf: cpfDigits, clienteId: cliente.id })
          const updated = await tx.cliente.update({ where: { id: cliente.id }, data: { cpf: cpfDigits }, select: { id: true, cpf: true } })
          await tx.auditLog.create({
            data: { user_id: actorUserId ?? null, action: "CLIENTE_UPDATE_FROM_OBRA_CREATE", entity: "cliente", entity_id: cliente.id,
              detail: { before: { cpf: atual }, after: { cpf: updated.cpf }, orcamentoId, forced: true } },
          })
        }
      }

      const tituloOrc = (String((orc as any).titulo ?? "").trim() || null) as string | null
      let obraId = 0
      try {
        const obra = await tx.obras.create({
          data: {
            orcamento: { connect: { id: orcamentoId } },
            cliente: { connect: { id: orc.cliente_id } },
            ...(Number.isFinite(Number(equipe_id)) && Number(equipe_id) ? { equipe: { connect: { id: Number(equipe_id) } } } : {}),
            titulo: tituloOrc,
            endereco_obra: endereco_obra.trim(),
            maps_url: maps_url.trim(),
            tipo_obra: tipo_obra.trim(),
            largura: d(largura),
            comprimento: d(comprimento),
            telha_escolhida: telha_escolhida.trim(),
            valor_obra: d(valor_obra),
            valor_mao_de_obra: d(valor_mao_de_obra),
            ...(mapObraStatus(status) ? { status: mapObraStatus(status)! } : {}),
            observacoes: (observacoes ?? "") || null,
            ...(pagamento_entrada !== undefined ? { pagamento_entrada: d(pagamento_entrada) } : {}),
            ...(forma_pagamento_entrada !== undefined ? { forma_pagamento_entrada: forma_pagamento_entrada || null } : {}),
            ...(mapPagamentoStatus(status_pagamento_entrada) ? { status_pagamento_entrada: mapPagamentoStatus(status_pagamento_entrada)! } : {}),
            ...(pagamento_quitacao !== undefined ? { pagamento_quitacao: d(pagamento_quitacao) } : {}),
            ...(forma_pagamento_quitacao !== undefined ? { forma_pagamento_quitacao: forma_pagamento_quitacao || null } : {}),
            ...(mapPagamentoStatus(status_pagamento_quitacao) ? { status_pagamento_quitacao: mapPagamentoStatus(status_pagamento_quitacao)! } : {}),
            link_slide_orcamento: (orc as any).link_slide ?? null,
            link_pdf_orcamento: (orc as any).link_pdf ?? null,
            createdBy: { connect: { id: actorUserId } },
            updatedBy: { connect: { id: actorUserId } },
          },
          select: { id: true },
        })
        obraId = obra.id
      } catch (err: any) {
        const msg = String(err?.message ?? "")
        if (msg.includes("Unique") || msg.includes("P2002"))
          throw new ObraCreateError("ORCAMENTO_JA_LANCADO", "Já existe obra para este orçamento.", "obra-unique")
        throw new ObraCreateError("OBRA_CREATE_FAILED", "Erro ao criar a obra.", "create-obra", { err: msg })
      }

      // ORDEM DE SERVIÇO (cria junto com a obra — somente se todos os campos obrigatórios existirem)
      try {
        const equipeIdNum = Number(equipe_id)
        const prevInicio = parseDateLoose(data_prev_inicio ?? null)
        const prevConclusao = parseDateLoose(data_prev_conclusao ?? null)

        if (Number.isFinite(equipeIdNum) && equipeIdNum && prevInicio && prevConclusao) {
          await tx.ordem_servico.create({
            data: {
              obra_id: obraId,
              equipe_id: equipeIdNum,
              data_prev_inicio: prevInicio,
              data_prev_conclusao: prevConclusao,
            },
          })

          try {
            await tx.auditLog.create({
              data: {
                user_id: actorUserId ?? null,
                action: "ORDEM_SERVICO_CREATE",
                entity: "ordem_servico",
                entity_id: obraId,
                detail: {
                  obraId,
                  equipe_id: equipeIdNum,
                  data_prev_inicio: prevInicio,
                  data_prev_conclusao: prevConclusao,
                },
              },
            })
          } catch {}
        }
      } catch (err: any) {
        console.error("[ordem_servico] create durante obra-create falhou:", err?.message ?? err)
      }

      let pedidoCompraId = 0
      try {
        const head = await tx.pedido_compra.create({
          data: {
            obra: { connect: { id: obraId } },

            ...(areaTelhaEff !== undefined ? { area_telha: d(areaTelhaEff) } : {}),
            ...(orcTelhaEff !== undefined ? { orcamento_telha: d(orcTelhaEff) } : {}),
            ...(prevTelhaEff !== undefined ? { previsao_telha: parseDateLoose(prevTelhaEff) } : {}),
            ...(mapPedidoPadraoStatus(statusTelhaEff) ? { status_telha: mapPedidoPadraoStatus(statusTelhaEff)! } : {}),
            ...(Number.isFinite(Number(fornTelhaEff)) && Number(fornTelhaEff)
              ? { fornecedor_telha: { connect: { id: Number(fornTelhaEff) } } }
              : {}),

            ...(orcMadeiraEff !== undefined ? { orcamento_madeira: d(orcMadeiraEff) } : {}),
            ...(prevMadeiraEff !== undefined ? { previsao_madeira: parseDateLoose(prevMadeiraEff) } : {}),
            ...(mapPedidoPadraoStatus(statusMadeiraEff) ? { status_madeira: mapPedidoPadraoStatus(statusMadeiraEff)! } : {}),
            ...(Number.isFinite(Number(fornMadeiraEff)) && Number(fornMadeiraEff)
              ? { fornecedor_madeira: { connect: { id: Number(fornMadeiraEff) } } }
              : {}),

            ...(mapMateriaisStatus(statusMateriaisEff) ? { materiais_status: mapMateriaisStatus(statusMateriaisEff)! } : {}),

            ...(mapAndaimesStatus(statusAndaimesEff) ? { andaimes_status: mapAndaimesStatus(statusAndaimesEff)! } : {}),
            ...(Number.isFinite(Number(fornAndaimesEff)) && Number(fornAndaimesEff)
              ? { andaimes_fornecedor: { connect: { id: Number(fornAndaimesEff) } } }
              : {}),
          },
          select: { id: true },
        })
        pedidoCompraId = head.id
      } catch (err: any) {
        throw new ObraCreateError("PEDIDO_HEAD_CREATE_FAILED", "Erro ao criar pedido de compra (HEAD).", "create-pedido-head", {
          err: String(err?.message ?? ""),
        })
      }

      let ptId = 0, pmId = 0, pmatId = 0, paId = 0
      try {
        const telhaRows =
          Array.isArray(telhaItensEff) && telhaItensEff.length > 0
            ? await Promise.all(
                telhaItensEff.map((it) =>
                  tx.pedido_telha.create({
                    data: {
                      pedido_compra_id: pedidoCompraId,
                      descricao: it.descricao,
                      quantidade: d(it.quantidade),
                      preco_unitario: d(it.preco_unitario),
                      total: d(it.total),
                    },
                    select: { id: true },
                  })
                )
              )
            : [
                await tx.pedido_telha.create({
                  data: { pedido_compra_id: pedidoCompraId, descricao: "Item inicial", quantidade: d(0), preco_unitario: d(0), total: d(0) },
                  select: { id: true },
                }),
              ]
        ptId = telhaRows[0].id

        const madeiraRows =
          Array.isArray(madeiraItensEff) && madeiraItensEff.length > 0
            ? await Promise.all(
                madeiraItensEff.map((it) =>
                  tx.pedido_madeira.create({
                    data: {
                      pedido_compra_id: pedidoCompraId,
                      componente: it.componente,
                      madeira_nome: it.madeira_nome,
                      descricao: it.descricao,
                      quantidade: d(it.quantidade),
                      tamanho: d(it.tamanho),
                      preco_unitario: d(it.preco_unitario),
                      total: d(it.total),
                    },
                    select: { id: true },
                  })
                )
              )
            : [
                await tx.pedido_madeira.create({
                  data: {
                    pedido_compra_id: pedidoCompraId,
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
              ]
        pmId = madeiraRows[0].id

        const materiaisRows =
          Array.isArray(materiaisItensEff) && materiaisItensEff.length > 0
            ? await Promise.all(
                materiaisItensEff.map((it) =>
                  tx.pedido_materiais.create({
                    data: {
                      pedido_compra_id: pedidoCompraId,
                      descricao: it.descricao,
                      quantidade: d(it.quantidade),
                      preco_unitario: d(it.preco_unitario),
                      total: d(it.total),
                    },
                    select: { id: true },
                  })
                )
              )
            : [
                await tx.pedido_materiais.create({
                  data: { pedido_compra_id: pedidoCompraId, descricao: "Item inicial", quantidade: d(0), preco_unitario: d(0), total: d(0) },
                  select: { id: true },
                }),
              ]
        pmatId = materiaisRows[0].id

        const andaimesRows =
          Array.isArray(andaimesItensEff) && andaimesItensEff.length > 0
            ? await Promise.all(
                andaimesItensEff.map((it) =>
                  tx.pedido_andaimes.create({
                    data: {
                      pedido_compra_id: pedidoCompraId,
                      descricao: it.descricao,
                      quantidade: d(it.quantidade),
                      preco_unitario: d(it.preco_unitario),
                      total: d(it.total),
                    },
                    select: { id: true },
                  })
                )
              )
            : [
                await tx.pedido_andaimes.create({
                  data: { pedido_compra_id: pedidoCompraId, descricao: "Item inicial", quantidade: d(0), preco_unitario: d(0), total: d(0) },
                  select: { id: true },
                }),
              ]
        paId = andaimesRows[0].id

        await tx.pedido_compra.update({
          where: { id: pedidoCompraId },
          data: { pedido_telha_id: ptId, pedido_madeira_id: pmId, pedido_materiais_id: pmatId, pedido_andaimes_id: paId },
          select: { id: true },
        })
      } catch (err: any) {
        throw new ObraCreateError(
          "PEDIDO_LINK_CREATE_FAILED",
          "Erro ao criar/ligar subpedidos (telha/madeira/materiais/andaimes).",
          "create-pedido-links",
          { err: String(err?.message ?? "") }
        )
      }

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
          throw new ObraCreateError("IMAGENS_CREATE_FAILED", "Erro ao salvar imagens da obra.", "create-imagens", { err: String(err?.message ?? "") })
        }
      }

      try {
        await tx.orcamento.update({
          where: { id: orcamentoId },
          data: { lancado_obra: true, lancado_obra_em: new Date(), updatedBy: { connect: { id: actorUserId } } },
        })
      } catch (err: any) {
        throw new ObraCreateError("ORCAMENTO_UPDATE_FAILED", "Erro ao marcar orçamento como lançado.", "update-orcamento", { err: String(err?.message ?? "") })
      }

      try {
        await tx.auditLog.createMany({
          data: [
            {
              user_id: actorUserId,
              action: "OBRA_CREATE",
              entity: "obras",
              entity_id: obraId,
              detail: { orcamentoId, titulo: (orc as any).titulo ?? null, links: { slide: (orc as any).link_slide ?? null, pdf: (orc as any).link_pdf ?? null } },
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
      }

      return { obraId, orcamentoId, pedidoCompraId, pedidos: { telhaId: ptId, madeiraId: pmId, materiaisId: pmatId, andaimesId: paId } }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
