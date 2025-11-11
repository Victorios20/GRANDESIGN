// GRANDESIGN · src/actions/obras/update-obra-db.ts
"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type Id = number | string
type EnumString = string

type ObraBasePayload = {
  endereco_obra?: string
  maps_url?: string
  tipo_obra?: string
  largura?: number | string
  comprimento?: number | string
  telha_escolhida?: string
  status?: EnumString
  observacoes?: string
}

type FinanceiroPayload = {
  valor_obra?: number | string
  valor_mao_de_obra?: number | string
  pagamento_entrada?: number | string
  forma_pagamento_entrada?: string
  status_pagamento_entrada?: EnumString
  pagamento_quitacao?: number | string
  forma_pagamento_quitacao?: string
  status_pagamento_quitacao?: EnumString
}

type PedidoLinksPayload = {
  telha?: {
    id?: Id
    descricao?: string
    quantidade?: number | string
    preco_unitario?: number | string
    total?: number | string
  }
  madeira?: {
    id?: Id
    componente?: string
    madeira_nome?: string
    descricao?: string
    quantidade?: number | string
    tamanho?: number | string
    preco_unitario?: number | string
    total?: number | string
  }
  materiais?: {
    id?: Id
    descricao?: string
    quantidade?: number | string
    preco_unitario?: number | string
    total?: number | string
  }
  andaimes?: {
    id?: Id
    descricao?: string
    quantidade?: number | string
    preco_unitario?: number | string
    total?: number | string
  }
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
  previsao_telha?: string | Date
  status_telha?: EnumString
  area_telha?: number | string

  orcamento_madeira?: number | string
  previsao_madeira?: string | Date
  status_madeira?: EnumString
  fornecedor_madeira_id?: Id | null

  materiais_status?: EnumString

  andaimes_status?: EnumString
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
  equipe_id?: Id
  data_prev_inicio?: string | Date
  data_prev_conclusao?: string | Date
}

type ImagemPayload = {
  id?: Id
  url?: string
  ordem?: number
  legenda?: string
  _delete?: boolean
}
type ImagensPayload = {
  replace?: boolean
  list?: ImagemPayload[]
}

type AnexosPayload = {
  contrato?: string | null
  ordemServico?: string | null
  propostaSlide?: string | null
  propostaPdf?: string | null
}

export type UpdateObraPayload = {
  obra?: ObraBasePayload
  financeiro?: FinanceiroPayload
  pedidoCompra?: PedidoCompraPayload
  ordemServico?: OrdemServicoPayload
  imagens?: ImagensPayload
  anexos?: AnexosPayload
}

function n(v: any) {
  if (v === undefined || v === null) return undefined
  const num = typeof v === "string" ? Number(v) : v
  return Number.isNaN(num) ? undefined : num
}

function setNullableString(target: Record<string, any>, key: string, v: string | null | undefined) {
  if (v === undefined) return
  target[key] = v === null ? null : String(v).trim()
}

export async function updateObraDB(obraId: Id, payload: UpdateObraPayload, userId: Id) {
  const id = Number(obraId)
  if (!id || Number.isNaN(id)) {
    return { ok: false, status: 400, error: "OBRA_ID_INVALIDO" }
  }

  const hasForbidden =
    JSON.stringify(payload).match(/"cliente_id"|"orcamento_id"|"created_by"|"updated_by"/g)?.length ?? 0
  if (hasForbidden) {
    return { ok: false, status: 400, error: "EDICAO_DE_CAMPO_PROIBIDO" }
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
    return { ok: false, status: 404, error: "OBRA_NAO_ENCONTRADA" }
  }

  const obraData: Prisma.obrasUpdateInput = {}
  if (userId) {
    obraData.updatedBy = { connect: { id: Number(userId) } }
  }

  if (payload.obra) {
    obraData.endereco_obra = payload.obra.endereco_obra ?? undefined
    obraData.maps_url = payload.obra.maps_url ?? undefined
    obraData.tipo_obra = payload.obra.tipo_obra ?? undefined
    obraData.largura = n(payload.obra.largura)
    obraData.comprimento = n(payload.obra.comprimento)
    obraData.telha_escolhida = payload.obra.telha_escolhida ?? undefined
    obraData.status = payload.obra.status as any
    obraData.observacoes = payload.obra.observacoes ?? undefined
  }

  // Anexos (novos campos em obras): undefined = não altera; null = seta NULL; string = grava
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
    obraData.forma_pagamento_entrada = payload.financeiro.forma_pagamento_entrada ?? undefined
    obraData.status_pagamento_entrada = payload.financeiro.status_pagamento_entrada as any
    obraData.pagamento_quitacao = n(payload.financeiro.pagamento_quitacao)
    obraData.forma_pagamento_quitacao = payload.financeiro.forma_pagamento_quitacao ?? undefined
    obraData.status_pagamento_quitacao = payload.financeiro.status_pagamento_quitacao as any
  }

  // imagens (1:N)
  if (payload.imagens?.list && payload.imagens.list.length >= 0) {
    const list = payload.imagens.list
    if (payload.imagens.replace) {
      obraData.imagens = {
        deleteMany: {},
        create: list
          .filter(i => !i._delete && i.url)
          .map(i => ({
            url: i.url!,
            ordem: i.ordem ?? null,
            legenda: i.legenda ?? null,
          })),
      }
    } else {
      const updateOps = list
        .filter(i => i.id && !i._delete)
        .map(i => ({
          where: { id: Number(i.id) },
          data: {
            url: i.url ?? undefined,
            ordem: i.ordem ?? undefined,
            legenda: i.legenda ?? undefined,
          },
        }))

      const createOps = list
        .filter(i => !i.id && !i._delete && i.url)
        .map(i => ({
          url: i.url!,
          ordem: i.ordem ?? null,
          legenda: i.legenda ?? null,
        }))

      const deleteIds = list.filter(i => i.id && i._delete).map(i => Number(i.id))

      obraData.imagens = {
        ...(deleteIds.length ? { deleteMany: { id: { in: deleteIds } } } : {}),
        ...(updateOps.length ? { update: updateOps as any } : {}),
        ...(createOps.length ? { create: createOps } : {}),
      }
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1) garante o HEAD do pedido_compra e pega o id
    const head = await tx.pedido_compra.upsert({
      where: { obra_id: id },
      update: {},
      create: { obra: { connect: { id } } },
      select: { id: true },
    })
    const pedidoCompraId = head.id

    // 2) ORDEM DE SERVIÇO
    if (payload.ordemServico) {
      const os = payload.ordemServico
      const hasOS = !!obraAtual.ordem_servico?.id

      if (os._delete) {
        obraData.ordem_servico = { delete: true }
      } else if (hasOS) {
        obraData.ordem_servico = {
          update: {
            ...(os.equipe_id !== undefined ? { equipe: { connect: { id: Number(os.equipe_id) } } } : {}),
            ...(os.data_prev_inicio ? { data_prev_inicio: new Date(os.data_prev_inicio) } : {}),
            ...(os.data_prev_conclusao ? { data_prev_conclusao: new Date(os.data_prev_conclusao) } : {}),
          },
        }
      } else {
        const canCreate =
          os.equipe_id !== undefined && !!os.data_prev_inicio && !!os.data_prev_conclusao

        if (!canCreate) {
          throw Object.assign(new Error("Dados insuficientes para criar a ordem de serviço."), {
            code: "ORDEM_SERVICO_DADOS_INSUFICIENTES",
          })
        }

        obraData.ordem_servico = {
          create: {
            equipe: { connect: { id: Number(os.equipe_id) } },
            data_prev_inicio: new Date(os.data_prev_inicio!),
            data_prev_conclusao: new Date(os.data_prev_conclusao!),
          },
        }
      }
    }

    // 3) PEDIDO DE COMPRA (head + links + itens)
    if (payload.pedidoCompra) {
      const pc = payload.pedidoCompra
      const pcUpdate: Prisma.pedido_compraUpdateInput = {}

      pcUpdate.orcamento_telha = n(pc.orcamento_telha)
      pcUpdate.previsao_telha = pc.previsao_telha ? new Date(pc.previsao_telha) : undefined
      pcUpdate.status_telha = pc.status_telha as any
      pcUpdate.area_telha = n(pc.area_telha)

      pcUpdate.orcamento_madeira = n(pc.orcamento_madeira)
      pcUpdate.previsao_madeira = pc.previsao_madeira ? new Date(pc.previsao_madeira) : undefined
      pcUpdate.status_madeira = pc.status_madeira as any

      pcUpdate.materiais_status = pc.materiais_status as any
      pcUpdate.andaimes_status = pc.andaimes_status as any

      if (pc.fornecedor_madeira_id === null) {
        pcUpdate.fornecedor_madeira = { disconnect: true }
      } else if (pc.fornecedor_madeira_id !== undefined) {
        pcUpdate.fornecedor_madeira = { connect: { id: Number(pc.fornecedor_madeira_id) } }
      }

      if (pc.andaimes_fornecedor_id === null) {
        pcUpdate.andaimes_fornecedor = { disconnect: true }
      } else if (pc.andaimes_fornecedor_id !== undefined) {
        pcUpdate.andaimes_fornecedor = { connect: { id: Number(pc.andaimes_fornecedor_id) } }
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

      const deleteIds = (arr?: PedidoItensUpsert[]) =>
        (arr ?? []).filter(i => i.id && i._delete).map(i => Number(i.id))

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

      await tx.pedido_compra.update({
        where: { id: pedidoCompraId },
        data: pcUpdate,
        select: { id: true },
      })
    }

    await tx.obras.update({
      where: { id },
      data: obraData,
      select: { id: true },
    })

    await tx.auditLog.create({
      data: {
        user_id: userId ? Number(userId) : null,
        action: "OBRA_UPDATE",
        entity: "obras",
        entity_id: id,
        detail: payload as any,
      },
    })

    return { id }
  })

  return { ok: true, status: 200, data: updated }
}
