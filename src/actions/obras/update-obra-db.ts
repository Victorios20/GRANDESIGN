// GRANDESIGN · src/actions/obras/update-obra-db.ts
"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type Id = number | string
type EnumString = string

type ObraBasePayload = {
  titulo?: string
  endereco_obra?: string
  maps_url?: string
  tipo_obra?: string
  largura?: number | string
  comprimento?: number | string
  telha_escolhida?: string
  status?: EnumString
  observacoes?: string | null
}

type FinanceiroPayload = {
  valor_obra?: number | string
  valor_mao_de_obra?: number | string
  pagamento_entrada?: number | string
  forma_pagamento_entrada?: string | null
  status_pagamento_entrada?: EnumString
  pagamento_quitacao?: number | string
  forma_pagamento_quitacao?: string | null
  status_pagamento_quitacao?: EnumString
}

type PedidoLinksPayload = {
  telha?: { id?: Id; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
  madeira?: {
    id?: Id; componente?: string; madeira_nome?: string; descricao?: string;
    quantidade?: number | string; tamanho?: number | string; preco_unitario?: number | string; total?: number | string
  }
  materiais?: { id?: Id; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
  andaimes?: { id?: Id; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
}

type PedidoItensUpsert = {
  id?: Id
  _delete?: boolean
  descricao?: string
  quantidade?: number | string
  preco_unitario?: number | string
  total?: number | string
  componente?: string
  madeira_nome?: string
  tamanho?: number | string
}

type PedidoCompraPayload = {
  orcamento_telha?: number | string
  previsao_telha?: string | Date | null
  status_telha?: EnumString | null
  area_telha?: number | string

  orcamento_madeira?: number | string
  previsao_madeira?: string | Date | null
  status_madeira?: EnumString | null
  fornecedor_madeira_id?: Id | null

  materiais_status?: EnumString | null

  andaimes_status?: EnumString | null
  andaimes_fornecedor_id?: Id | null

  links?: PedidoLinksPayload

  itens?: {
    telha?: PedidoItensUpsert[]
    madeira?: PedidoItensUpsert[]
    materiais?: PedidoItensUpsert[]
    andaimes?: PedidoItensUpsert[]
  }
}

type OrdemServicoPayload = {
  _delete?: boolean
  id?: Id
  equipe_id?: Id | null
  data_prev_inicio?: string | Date | null
  data_prev_conclusao?: string | Date | null
}

type ImagemPayload = { id?: Id; url?: string; ordem?: number | null; legenda?: string | null; _delete?: boolean }
type ImagensPayload = { replace?: boolean; list?: ImagemPayload[] }

type ClientePayload = {
  nome?: string | null
  telefone?: string | null
  bairro?: string | null
  cidade_id?: Id | null
  cidade_nome?: string | null
}

type AnexosPayload = { contrato?: string | null; ordemServico?: string | null; propostaSlide?: string | null; propostaPdf?: string | null }

export type UpdateObraPayload = {
  obra?: ObraBasePayload
  financeiro?: FinanceiroPayload
  pedidoCompra?: PedidoCompraPayload
  ordemServico?: OrdemServicoPayload
  imagens?: ImagensPayload
  anexos?: AnexosPayload
  cliente?: ClientePayload
}

/* ======================== Helpers ======================== */

function n(v: any) {
  if (v === undefined || v === null || v === "") return undefined
  const num = typeof v === "string" ? Number(v.replace?.(",", ".")) : v
  return Number.isNaN(num) ? undefined : num
}
function d(v: any | null | undefined): Date | undefined {
  if (v === null || v === undefined) return undefined
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : undefined
  const dd = new Date(v)
  return Number.isFinite(dd.getTime()) ? dd : undefined
}
function setNullableString(target: Record<string, any>, key: string, v: string | null | undefined) {
  if (v === undefined) return
  target[key] = v === null ? null : String(v).trim()
}
function cleanText(s: string | null | undefined) {
  return (s ?? "").toString().trim().replace(/\s+/g, " ")
}
const ensureInt = (v: Id | null | undefined): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined
  const n2 = Number(v)
  return Number.isFinite(n2) ? n2 : undefined
}
function norm(s: unknown) {
  return String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim()
}

const OBRA_TOKENS = [
  "ASSINATURA_DE_CONTRATO", "AGUARDANDO_VALIDACAO_TECNICA", "COMPRAS",
  "A_INICIAR", "EXECUCAO", "AGUARDANDO_PAGAMENTO", "PENDENCIA", "FINALIZADO",
]
const PGM_TOKENS = ["PENDENTE", "EFETUADO"]
const PEDIDO_TOKENS = ["PENDENTE", "AGUARDANDO_PAGAMENTO", "PEDIDO_FEITO", "ENTREGUE"]
const MATERIAIS_TOKENS = ["PENDENTE", "EM_ESTOQUE", "ENTREGUE"]
const ANDAIMES_TOKENS = ["PENDENTE", "PEDIDO_FEITO", "A_COLETAR", "COLETADO", "ENTREGUE"]

function mapObraStatus(v: unknown): string | undefined {
  const raw = String(v ?? "").trim()
  const up = raw.toUpperCase()
  if (OBRA_TOKENS.includes(up)) return up
  switch (norm(raw)) {
    case "ASSINATURA DE CONTRATO": return "ASSINATURA_DE_CONTRATO"
    case "AGUARDANDO VALIDACAO TECNICA": return "AGUARDANDO_VALIDACAO_TECNICA"
    case "COMPRAS": return "COMPRAS"
    case "A INICIAR": return "A_INICIAR"
    case "EXECUCAO": return "EXECUCAO"
    case "AGUARDANDO PAGAMENTO": return "AGUARDANDO_PAGAMENTO"
    case "PENDENCIA": return "PENDENCIA"
    case "FINALIZADO": return "FINALIZADO"
    default: return undefined
  }
}
function mapPagStatus(v: unknown): string | undefined {
  const raw = String(v ?? "").trim()
  const up = raw.toUpperCase()
  if (PGM_TOKENS.includes(up)) return up
  switch (norm(raw)) {
    case "PENDENTE": return "PENDENTE"
    case "EFETUADO": return "EFETUADO"
    default: return undefined
  }
}
function mapPedidoStatusPadrao(v: unknown): string | undefined {
  const raw = String(v ?? "").trim()
  const up = raw.toUpperCase()
  if (PEDIDO_TOKENS.includes(up)) return up
  switch (norm(raw)) {
    case "PENDENTE": return "PENDENTE"
    case "AGUARDANDO PAGAMENTO": return "AGUARDANDO_PAGAMENTO"
    case "PEDIDO FEITO": return "PEDIDO_FEITO"
    case "ENTREGUE": return "ENTREGUE"
    default: return undefined
  }
}
function mapMateriaisStatus(v: unknown): string | undefined {
  const raw = String(v ?? "").trim()
  const up = raw.toUpperCase()
  if (MATERIAIS_TOKENS.includes(up)) return up
  switch (norm(raw)) {
    case "PENDENTE": return "PENDENTE"
    case "EM ESTOQUE": return "EM_ESTOQUE"
    case "ENTREGUE": return "ENTREGUE"
    default: return undefined
  }
}
function mapAndaimesStatus(v: unknown): string | undefined {
  const raw = String(v ?? "").trim()
  const up = raw.toUpperCase()
  if (ANDAIMES_TOKENS.includes(up)) return up
  switch (norm(raw)) {
    case "PENDENTE": return "PENDENTE"
    case "PEDIDO FEITO": return "PEDIDO_FEITO"
    case "A COLETAR": return "A_COLETAR"
    case "COLETADO": return "COLETADO"
    case "ENTREGUE": return "ENTREGUE"
    default: return undefined
  }
}

async function rowExists(tx: Prisma.TransactionClient, table: "equipes" | "fornecedores", id?: number) {
  if (!id) return false
  if (table === "equipes") {
    const r = await (tx as any).equipes.findUnique({ where: { id }, select: { id: true } })
    return !!r?.id
  }
  const r = await (tx as any).fornecedores.findUnique({ where: { id }, select: { id: true } })
  return !!r?.id
}

/* ======================== Error shape ======================== */

function errShape(
  code: string,
  title: string,
  description?: string,
  meta?: any
) {
  const dev = process.env.NODE_ENV !== "production"
  return {
    ok: false as const,
    status: 500,
    code,
    title,
    description: dev ? (description || "") : undefined,
    meta: dev ? meta : undefined,
  }
}

function badRequest(code: string, title: string, description?: string) {
  const dev = process.env.NODE_ENV !== "production"
  return {
    ok: false as const,
    status: 400,
    code,
    title,
    description: dev ? (description || "") : undefined,
  }
}

function notFound(code: string, title: string, description?: string) {
  const dev = process.env.NODE_ENV !== "production"
  return {
    ok: false as const,
    status: 404,
    code,
    title,
    description: dev ? (description || "") : undefined,
  }
}

/* ======================== Update principal ======================== */

export async function updateObraDB(obraId: Id, payload: UpdateObraPayload, userId: Id) {
  const id = Number(obraId)
  if (!id || Number.isNaN(id)) {
    return badRequest("OBRA_ID_INVALIDO", "ID da obra inválido", "O parâmetro 'id' deve ser um número > 0.")
  }

  const banidos = JSON.stringify(payload).match(/"cliente_id"|"orcamento_id"|"created_by"|"updated_by"/g)?.length ?? 0
  if (banidos) {
    return badRequest("EDICAO_DE_CAMPO_PROIBIDO", "Edição de campo proibido", "Payload contém campos protegidos.")
  }

  const obraAtual = await prisma.obras.findUnique({
    where: { id },
    select: {
      id: true,
      cliente_id: true,
      pedido_compra: { select: { id: true } },
      ordem_servico: { select: { id: true } },
    },
  })
  if (!obraAtual) {
    return notFound("OBRA_NAO_ENCONTRADA", "Obra não encontrada", `Obra id ${id} não existe.`)
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        /* -------- Cliente -------- */
        if (payload.cliente) {
          const patch: Prisma.clienteUpdateInput = {}
          if (payload.cliente.nome !== undefined) patch.nome = cleanText(payload.cliente.nome)
          if (payload.cliente.telefone !== undefined) patch.telefone = cleanText(payload.cliente.telefone)
          if (payload.cliente.bairro !== undefined) patch.bairro = cleanText(payload.cliente.bairro)
          if (payload.cliente.cidade_id === null) {
            patch.cidades = { disconnect: true }
          } else if (payload.cliente.cidade_id !== undefined) {
            const cid = ensureInt(payload.cliente.cidade_id)
            if (cid) patch.cidades = { connect: { id: cid } }
          } else if (payload.cliente.cidade_nome !== undefined) {
            const nome = cleanText(payload.cliente.cidade_nome)
            if (nome) {
              const row = await tx.cidades.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } }, select: { id: true } })
              if (row?.id) patch.cidades = { connect: { id: row.id } }
            }
          }
          if (Object.keys(patch).length > 0) {
            await tx.cliente.update({ where: { id: obraAtual.cliente_id }, data: patch })
          }
        }

        /* -------- Obra + Financeiro + Anexos + Imagens -------- */
        const obraData: Prisma.obrasUpdateInput = {}
        if (userId) obraData.updatedBy = { connect: { id: Number(userId) } }

        if (payload.obra) {
          if (payload.obra.titulo !== undefined) obraData.titulo = cleanText(payload.obra.titulo)
          obraData.endereco_obra = payload.obra.endereco_obra ?? undefined
          obraData.maps_url = payload.obra.maps_url ?? undefined
          obraData.tipo_obra = payload.obra.tipo_obra ?? undefined
          obraData.largura = n(payload.obra.largura)
          obraData.comprimento = n(payload.obra.comprimento)
          obraData.telha_escolhida = payload.obra.telha_escolhida ?? undefined
          const stObra = mapObraStatus(payload.obra.status)
          obraData.status = (stObra as any) ?? undefined
          obraData.observacoes = payload.obra.observacoes ?? undefined
        }

        if (payload.anexos) {
          setNullableString(obraData, "link_contrato", payload.anexos.contrato)
          setNullableString(obraData, "link_ordem_servico", payload.anexos.ordemServico)
          setNullableString(obraData, "link_slide_orcamento", payload.anexos.propostaSlide)
          setNullableString(obraData, "link_pdf_orcamento", payload.anexos.propostaPdf)
        }

        if (payload.financeiro) {
          obraData.valor_obra = n(payload.financeiro.valor_obra)
          obraData.valor_mao_de_obra = n(payload.financeiro.valor_mao_de_obra)
          obraData.pagamento_entrada = n(payload.financeiro.pagamento_entrada)
          obraData.forma_pagamento_entrada =
            payload.financeiro.forma_pagamento_entrada === undefined ? undefined : payload.financeiro.forma_pagamento_entrada
          obraData.status_pagamento_entrada = (mapPagStatus(payload.financeiro.status_pagamento_entrada) as any) ?? undefined
          obraData.pagamento_quitacao = n(payload.financeiro.pagamento_quitacao)
          obraData.forma_pagamento_quitacao =
            payload.financeiro.forma_pagamento_quitacao === undefined ? undefined : payload.financeiro.forma_pagamento_quitacao
          obraData.status_pagamento_quitacao = (mapPagStatus(payload.financeiro.status_pagamento_quitacao) as any) ?? undefined
        }

        if (payload.imagens?.list && payload.imagens.list.length >= 0) {
          const list = payload.imagens.list
          if (payload.imagens.replace) {
            obraData.imagens = {
              deleteMany: {},
              create: list.filter(i => !i._delete && i.url).map(i => ({
                url: i.url!, ordem: i.ordem ?? null, legenda: i.legenda ?? null,
              })),
            }
          } else {
            const updateOps = list.filter(i => i.id && !i._delete).map(i => ({
              where: { id: Number(i.id) },
              data: { url: i.url ?? undefined, ordem: i.ordem ?? undefined, legenda: i.legenda ?? undefined },
            }))
            const createOps = list.filter(i => !i.id && !i._delete && i.url).map(i => ({
              url: i.url!, ordem: i.ordem ?? null, legenda: i.legenda ?? null,
            }))
            const deleteIds = list.filter(i => i.id && i._delete).map(i => Number(i.id))
            obraData.imagens = {
              ...(deleteIds.length ? { deleteMany: { id: { in: deleteIds } } } : {}),
              ...(updateOps.length ? { update: updateOps as any } : {}),
              ...(createOps.length ? { create: createOps } : {}),
            }
          }
        }

        /* -------- Upsert head do pedido_compra -------- */
        const head = await tx.pedido_compra.upsert({
          where: { obra_id: id },
          update: {},
          create: { obra: { connect: { id } } },
          select: { id: true },
        })
        const pedidoCompraId = head.id

        /* -------- Ordem de Serviço (create/update/delete) -------- */
        if (payload.ordemServico) {
          const os = payload.ordemServico
          const hasOS = !!obraAtual.ordem_servico?.id
          const equipeIdNum = ensureInt(os.equipe_id)
          const prevInicio = d(os.data_prev_inicio)
          const prevConclusao = d(os.data_prev_conclusao)

          if (os._delete) {
            if (hasOS) obraData.ordem_servico = { delete: true }
          } else if (hasOS) {
            const patch: Prisma.ordem_servicoUpdateInput = {}
            if (os.equipe_id !== undefined) {
              if (equipeIdNum && await rowExists(tx, "equipes", equipeIdNum)) {
                patch.equipe = { connect: { id: equipeIdNum } }
              }
              // se vier null, ignora (relação required não aceita disconnect)
            }
            if (os.data_prev_inicio !== undefined) patch.data_prev_inicio = prevInicio ?? undefined
            if (os.data_prev_conclusao !== undefined) patch.data_prev_conclusao = prevConclusao ?? undefined
            obraData.ordem_servico = { update: patch }
          } else {
            if (equipeIdNum && prevInicio && prevConclusao && await rowExists(tx, "equipes", equipeIdNum)) {
              obraData.ordem_servico = {
                create: {
                  equipe: { connect: { id: equipeIdNum } },
                  data_prev_inicio: prevInicio,
                  data_prev_conclusao: prevConclusao,
                },
              }
            }
          }
        }

        /* -------- Pedido de Compra (head + itens + links) -------- */
        if (payload.pedidoCompra) {
          const pc = payload.pedidoCompra
          const pcUpdate: Prisma.pedido_compraUpdateInput = {}

          pcUpdate.orcamento_telha = n(pc.orcamento_telha)
          pcUpdate.previsao_telha = pc.previsao_telha === null ? null : d(pc.previsao_telha)
          pcUpdate.status_telha = (mapPedidoStatusPadrao(pc.status_telha) as any) ?? undefined
          pcUpdate.area_telha = n(pc.area_telha)

          pcUpdate.orcamento_madeira = n(pc.orcamento_madeira)
          pcUpdate.previsao_madeira = pc.previsao_madeira === null ? null : d(pc.previsao_madeira)
          pcUpdate.status_madeira = (mapPedidoStatusPadrao(pc.status_madeira) as any) ?? undefined

          pcUpdate.materiais_status = (mapMateriaisStatus(pc.materiais_status) as any) ?? undefined
          pcUpdate.andaimes_status = (mapAndaimesStatus(pc.andaimes_status) as any) ?? undefined

          if (pc.fornecedor_madeira_id === null) {
            pcUpdate.fornecedor_madeira = { disconnect: true }
          } else if (pc.fornecedor_madeira_id !== undefined) {
            const fm = ensureInt(pc.fornecedor_madeira_id)
            if (fm && (await rowExists(tx, "fornecedores", fm))) pcUpdate.fornecedor_madeira = { connect: { id: fm } }
          }

          if (pc.andaimes_fornecedor_id === null) {
            pcUpdate.andaimes_fornecedor = { disconnect: true }
          } else if (pc.andaimes_fornecedor_id !== undefined) {
            const fa = ensureInt(pc.andaimes_fornecedor_id)
            if (fa && (await rowExists(tx, "fornecedores", fa))) pcUpdate.andaimes_fornecedor = { connect: { id: fa } }
          }

          if (pc.links?.telha) {
            const l = pc.links.telha
            pcUpdate.pedido_telha_link = {
              upsert: {
                create: {
                  pedido_compra: { connect: { id: pedidoCompraId } },
                  descricao: l.descricao ?? "",
                  quantidade: n(l.quantidade) ?? 0,
                  preco_unitario: n(l.preco_unitario) ?? 0,
                  total: n(l.total) ?? 0,
                },
                update: {
                  descricao: l.descricao ?? undefined,
                  quantidade: n(l.quantidade),
                  preco_unitario: n(l.preco_unitario),
                  total: n(l.total),
                },
              },
            }
          }
          if (pc.links?.madeira) {
            const l = pc.links.madeira
            pcUpdate.pedido_madeira_link = {
              upsert: {
                create: {
                  pedido_compra: { connect: { id: pedidoCompraId } },
                  componente: l.componente ?? "",
                  madeira_nome: l.madeira_nome ?? "",
                  descricao: l.descricao ?? "",
                  quantidade: n(l.quantidade) ?? 0,
                  tamanho: n(l.tamanho) ?? 0,
                  preco_unitario: n(l.preco_unitario) ?? 0,
                  total: n(l.total) ?? 0,
                },
                update: {
                  componente: l.componente ?? undefined,
                  madeira_nome: l.madeira_nome ?? undefined,
                  descricao: l.descricao ?? undefined,
                  quantidade: n(l.quantidade),
                  tamanho: n(l.tamanho),
                  preco_unitario: n(l.preco_unitario),
                  total: n(l.total),
                },
              },
            }
          }
          if (pc.links?.materiais) {
            const l = pc.links.materiais
            pcUpdate.pedido_materiais_link = {
              upsert: {
                create: {
                  pedido_compra: { connect: { id: pedidoCompraId } },
                  descricao: l.descricao ?? "",
                  quantidade: n(l.quantidade) ?? 0,
                  preco_unitario: n(l.preco_unitario) ?? 0,
                  total: n(l.total) ?? 0,
                },
                update: {
                  descricao: l.descricao ?? undefined,
                  quantidade: n(l.quantidade),
                  preco_unitario: n(l.preco_unitario),
                  total: n(l.total),
                },
              },
            }
          }
          if (pc.links?.andaimes) {
            const l = pc.links.andaimes
            pcUpdate.pedido_andaimes_link = {
              upsert: {
                create: {
                  pedido_compra: { connect: { id: pedidoCompraId } },
                  descricao: l.descricao ?? "",
                  quantidade: n(l.quantidade) ?? 0,
                  preco_unitario: n(l.preco_unitario) ?? 0,
                  total: n(l.total) ?? 0,
                },
                update: {
                  descricao: l.descricao ?? undefined,
                  quantidade: n(l.quantidade),
                  preco_unitario: n(l.preco_unitario),
                  total: n(l.total),
                },
              },
            }
          }

          const upsertArr = (arr?: PedidoItensUpsert[]) =>
            (arr ?? [])
              .filter(i => !i._delete && i.id)
              .map(i => ({
                where: { id: Number(i.id) },
                update: {
                  descricao: i.descricao ?? undefined,
                  quantidade: n(i.quantidade),
                  preco_unitario: n(i.preco_unitario),
                  total: n(i.total),
                  componente: i.componente ?? undefined,
                  madeira_nome: i.madeira_nome ?? undefined,
                  tamanho: n(i.tamanho) ?? undefined,
                } as any,
                create: {
                  descricao: i.descricao ?? "",
                  quantidade: n(i.quantidade) ?? 0,
                  preco_unitario: n(i.preco_unitario) ?? 0,
                  total: n(i.total) ?? 0,
                  componente: i.componente ?? undefined,
                  madeira_nome: i.madeira_nome ?? undefined,
                  tamanho: n(i.tamanho) ?? undefined,
                } as any,
              }))

          const createArr = (arr?: PedidoItensUpsert[]) =>
            (arr ?? [])
              .filter(i => !i.id && !i._delete)
              .map(i => ({
                descricao: i.descricao ?? "",
                quantidade: n(i.quantidade) ?? 0,
                preco_unitario: n(i.preco_unitario) ?? 0,
                total: n(i.total) ?? 0,
                componente: i.componente ?? undefined,
                madeira_nome: i.madeira_nome ?? undefined,
                tamanho: n(i.tamanho) ?? undefined,
              } as any))

          const deleteIds = (arr?: PedidoItensUpsert[]) => (arr ?? []).filter(i => i.id && i._delete).map(i => Number(i.id))

          if (pc.itens?.telha) {
            pcUpdate.pedido_telha_itens = {
              ...(deleteIds(pc.itens.telha).length ? { deleteMany: { id: { in: deleteIds(pc.itens.telha) } } } : {}),
              ...(upsertArr(pc.itens.telha).length ? { upsert: upsertArr(pc.itens.telha) as any } : {}),
              ...(createArr(pc.itens.telha).length ? { create: createArr(pc.itens.telha) as any } : {}),
            }
          }
          if (pc.itens?.madeira) {
            pcUpdate.pedido_madeira_itens = {
              ...(deleteIds(pc.itens.madeira).length ? { deleteMany: { id: { in: deleteIds(pc.itens.madeira) } } } : {}),
              ...(upsertArr(pc.itens.madeira).length ? { upsert: upsertArr(pc.itens.madeira) as any } : {}),
              ...(createArr(pc.itens.madeira).length ? { create: createArr(pc.itens.madeira) as any } : {}),
            }
          }
          if (pc.itens?.materiais) {
            pcUpdate.pedido_materiais_itens = {
              ...(deleteIds(pc.itens.materiais).length ? { deleteMany: { id: { in: deleteIds(pc.itens.materiais) } } } : {}),
              ...(upsertArr(pc.itens.materiais).length ? { upsert: upsertArr(pc.itens.materiais) as any } : {}),
              ...(createArr(pc.itens.materiais).length ? { create: createArr(pc.itens.materiais) as any } : {}),
            }
          }
          if (pc.itens?.andaimes) {
            pcUpdate.pedido_andaimes_itens = {
              ...(deleteIds(pc.itens.andaimes).length ? { deleteMany: { id: { in: deleteIds(pc.itens.andaimes) } } } : {}),
              ...(upsertArr(pc.itens.andaimes).length ? { upsert: upsertArr(pc.itens.andaimes) as any } : {}),
              ...(createArr(pc.itens.andaimes).length ? { create: createArr(pc.itens.andaimes) as any } : {}),
            }
          }

          await tx.pedido_compra.update({ where: { id: pedidoCompraId }, data: pcUpdate, select: { id: true } })
        }

        await tx.obras.update({ where: { id }, data: obraData, select: { id: true } })

        await tx.auditLog.create({
          data: { user_id: userId ? Number(userId) : null, action: "OBRA_UPDATE", entity: "obras", entity_id: id, detail: payload as any },
        })

        return { id }
      },
      { timeout: 120_000, maxWait: 20_000 } // evita P2028; mesmo padrão do create
    )

    return { ok: true, status: 200, data: updated }
  } catch (err: any) {
    // Prisma known errors -> títulos legíveis
    const dev = process.env.NODE_ENV !== "production"
    const code: string = err?.code || err?.name || "UNEXPECTED_ERROR"

    if (code === "P2025") {
      return errShape(
        "P2025",
        "Registro relacionado não encontrado",
        dev ? String(err?.message || err) : undefined,
        err?.meta
      )
    }
    if (code === "P2003") {
      return errShape(
        "P2003",
        "Violação de integridade referencial",
        dev ? String(err?.message || err) : undefined,
        err?.meta
      )
    }
    if (code === "P2002") {
      return errShape(
        "P2002",
        "Violação de unicidade",
        dev ? String(err?.message || err) : undefined,
        err?.meta
      )
    }
    if (code === "P2028") {
      return errShape(
        "P2028",
        "Transação expirada",
        dev ? String(err?.message || err) : "A operação excedeu o tempo limite.",
        err?.meta
      )
    }

    // fallback
    return errShape(
      code,
      "Erro inesperado",
      dev ? String(err?.message || err) : undefined,
      err?.meta
    )
  }
}
