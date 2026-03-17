"use server"

import { prisma } from "@/lib/prisma"
import { Prisma, PedidoCategoria, ObraStatus } from "@prisma/client"

type Id = number | string

type PedidoItemInput = {
  id?: Id
  _delete?: boolean
  descricao?: string
  quantidade?: number | string
  tamanho?: number | string
  preco_unitario?: number | string
  total?: number | string
}

type ImagemInput = {
  id?: number | string
  url?: string
  ordem?: number
  legenda?: string
  _delete?: boolean
}

export type UpdateObraPayload = {
  obra?: {
    titulo?: string
    endereco_obra?: string
    maps_url?: string
    tipo_obra?: string
    largura?: number | string
    comprimento?: number | string
    largura_maior?: number | string | null
    largura_menor?: number | string | null
    comprimento_maior?: number | string | null
    comprimento_menor?: number | string | null
    telha_escolhida?: string
    observacoes?: string | null
    status?: string
    data_inicio_obra?: string | Date | null
    data_fim_obra?: string | Date | null
    data_contrato?: string | Date | null
    data_conclusao?: string | Date | null
  }
  financeiro?: {
    valor_obra?: number | string
    valor_mao_de_obra?: number | string
    pagamento_entrada?: number | string
    forma_pagamento_entrada?: string | null
    status_pagamento_entrada?: string | null
    pagamento_quitacao?: number | string
    forma_pagamento_quitacao?: string | null
    status_pagamento_quitacao?: string | null
  }
  imagens?: {
    replace?: boolean
    list?: ImagemInput[]
  }
  pedidoCompra?: {
    categoria?: PedidoCategoria
    itens?: PedidoItemInput[]
  }
}

const n = (v: any) => {
  if (v === undefined || v === null || v === "") return undefined
  const num = Number(String(v).replace(",", "."))
  return Number.isFinite(num) ? num : undefined
}

export async function updateObraDB(obraId: Id, payload: UpdateObraPayload, userId: Id) {
  const id = Number(obraId)
  if (!id || Number.isNaN(id)) {
    return { ok: false as const, status: 400, code: "OBRA_ID_INVALIDO" }
  }

  const obra = await prisma.obras.findUnique({
    where: { id },
    // @ts-ignore
    select: { id: true, status: true, data_conclusao: true },
  })

  if (!obra) {
    return { ok: false as const, status: 404, code: "OBRA_NAO_ENCONTRADA" }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      /* ================= OBRA ================= */
      console.log("Payload recebido updateObraDB:", JSON.stringify(payload, null, 2))

      const obraData: any = {
        updatedBy: { connect: { id: Number(userId) } },
      }

      let shouldClosePedidos = false

      if (payload.obra) {
        obraData.titulo = payload.obra.titulo
        obraData.endereco_obra = payload.obra.endereco_obra
        obraData.maps_url = payload.obra.maps_url
        obraData.tipo_obra = payload.obra.tipo_obra
        obraData.largura = n(payload.obra.largura)
        obraData.comprimento = n(payload.obra.comprimento)
        obraData.largura_maior = n(payload.obra.largura_maior)
        obraData.largura_menor = n(payload.obra.largura_menor)
        obraData.comprimento_maior = n(payload.obra.comprimento_maior)
        obraData.comprimento_menor = n(payload.obra.comprimento_menor)
        obraData.telha_escolhida = payload.obra.telha_escolhida
        obraData.observacoes = payload.obra.observacoes ?? undefined
        if (payload.obra.status) {
          const s = String(payload.obra.status).trim()
          const mapa: Record<string, ObraStatus> = {
            "Assinatura de contrato": "ASSINATURA_DE_CONTRATO",
            "Aguardando validação técnica": "AGUARDANDO_VALIDACAO_TECNICA",
            "Compras": "COMPRAS",
            "À iniciar": "A_INICIAR",
            "Execução": "EXECUCAO",
            "Aguardando pagamento": "AGUARDANDO_PAGAMENTO",
            "Pendência": "PENDENCIA",
            "Finalizado": "FINALIZADO",
          }
          const valid = mapa[s]
          if (valid) obraData.status = valid
        }
        // Datas de prazo contratual
        if (payload.obra.data_inicio_obra !== undefined) {
          const dIni = payload.obra.data_inicio_obra;
          obraData.data_inicio_obra = dIni ? new Date(dIni) : null;
        }
        if (payload.obra.data_fim_obra !== undefined) {
          const dFim = payload.obra.data_fim_obra;
          obraData.data_fim_obra = dFim ? new Date(dFim) : null;
        }
        if (payload.obra.data_contrato !== undefined) {
          const dContrato = payload.obra.data_contrato;
          obraData.data_contrato = dContrato ? new Date(dContrato) : null;
        }

        // Lógica de conclusão
        const newStatus = obraData.status; // status alterado neste payload (se houver)
        const oldStatus = obra.status;

        // Se mandou data explicita, usa
        if (payload.obra.data_conclusao !== undefined) {
          const dConclusao = payload.obra.data_conclusao;
          obraData.data_conclusao = dConclusao ? new Date(dConclusao) : null;
        }
        // Se NÃO mandou data, mas está mudando para FINALIZADO agora (e não estava antes), auto-set
        else if (newStatus === ObraStatus.FINALIZADO && oldStatus !== ObraStatus.FINALIZADO) {
          obraData.data_conclusao = new Date();
          obraData.status_pagamento_entrada = "EFETUADO";
          obraData.status_pagamento_quitacao = "EFETUADO";
          shouldClosePedidos = true;
        }
      }

      if (payload.financeiro) {
        obraData.valor_obra = n(payload.financeiro.valor_obra)
        obraData.valor_mao_de_obra = n(payload.financeiro.valor_mao_de_obra)
        obraData.pagamento_entrada = n(payload.financeiro.pagamento_entrada)
        obraData.forma_pagamento_entrada = payload.financeiro.forma_pagamento_entrada
        obraData.pagamento_quitacao = n(payload.financeiro.pagamento_quitacao)
        obraData.forma_pagamento_quitacao = payload.financeiro.forma_pagamento_quitacao

        // Map payment status strings to enum values
        const statusMap: Record<string, string> = { Efetuado: "EFETUADO", Pendente: "PENDENTE" }
        if (payload.financeiro.status_pagamento_entrada) {
          const mapped = statusMap[payload.financeiro.status_pagamento_entrada]
          if (mapped) obraData.status_pagamento_entrada = mapped
        }
        if (payload.financeiro.status_pagamento_quitacao) {
          const mapped = statusMap[payload.financeiro.status_pagamento_quitacao]
          if (mapped) obraData.status_pagamento_quitacao = mapped
        }
      }

      console.log("ObraData final updateObraDB:", obraData)

      await tx.obras.update({
        where: { id },
        data: obraData,
      })

      if (shouldClosePedidos) {
        await tx.pedido_compra.updateMany({
          where: {
            obra_id: id,
            status: { not: "CANCELADO" },
          },
          data: { status: "ENTREGUE" },
        })
      }

      /* ================= IMAGENS ================= */
      if (payload.imagens && payload.imagens.replace && Array.isArray(payload.imagens.list)) {
        // Delete all existing images for this obra
        await tx.obra_imagens.deleteMany({ where: { obra_id: id } })

        // Insert the new list (preserving order)
        const imgList = payload.imagens.list
          .filter((img) => String(img?.url ?? "").trim() !== "")
          .map((img, i) => ({
            obra_id: id,
            url: String(img.url ?? "").trim(),
            ordem: Number.isFinite(Number(img.ordem)) ? Number(img.ordem) : i + 1,
            legenda: img.legenda && String(img.legenda).trim() !== "" ? String(img.legenda).trim() : null,
          }))

        if (imgList.length > 0) {
          await tx.obra_imagens.createMany({ data: imgList })
        }
      }

      /* ================= PEDIDO COMPRA ================= */
      if (payload.pedidoCompra) {
        let pedido = await tx.pedido_compra.findFirst({
          where: { obra_id: id },
          select: { id: true },
        })

        if (!pedido) {
          if (!payload.pedidoCompra.categoria) {
            throw new Error("CATEGORIA_PEDIDO_OBRIGATORIA")
          }

          pedido = await tx.pedido_compra.create({
            data: {
              obra: { connect: { id } },
              categoria: payload.pedidoCompra.categoria,
            },
            select: { id: true },
          })
        }

        if (payload.pedidoCompra.itens) {
          await tx.pedido_itens.deleteMany({
            where: { pedido_compra_id: pedido.id },
          })

          const itensValidos = payload.pedidoCompra.itens.filter((i) => !i._delete)

          if (itensValidos.length) {
            await tx.pedido_itens.createMany({
              data: itensValidos.map((i) => ({
                pedido_compra_id: pedido!.id,
                descricao: i.descricao ?? "",
                quantidade: n(i.quantidade) ?? 0,
                tamanho: n(i.tamanho) ?? null,
                preco_unitario: n(i.preco_unitario) ?? 0,
                total: n(i.total) ?? 0,
              })),
            })
          }
        }
      }

      await tx.auditLog.create({
        data: {
          user_id: Number(userId),
          action: "OBRA_UPDATE",
          entity: "obras",
          entity_id: id,
          detail: payload as any,
        },
      })

      return { id }
    })

    return { ok: true, status: 200, data: result }
  } catch (err: any) {
    console.error("[updateObraDB] Erro ao salvar obra:", err?.message ?? err, err?.stack ?? "")
    return { ok: false as const, status: 500, code: "UPDATE_FAILED" }
  }
}
