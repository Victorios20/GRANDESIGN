// GRANDESIGN · src/actions/obras/detalhar-obra.ts
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type AppErrorCode = "OBRA_NOT_FOUND" | "INVALID_ID" | "UNEXPECTED_ERROR"
export class AppError extends Error {
  code: AppErrorCode
  step?: string
  constructor(code: AppErrorCode, message: string, step?: string) {
    super(message)
    this.code = code
    this.step = step
  }
}

const asNum = (v: any): number | null =>
  v === null || v === undefined ? null : typeof v?.toNumber === "function" ? v.toNumber() : Number(v)
const n0 = (v: any): number => asNum(v) ?? 0
const dateISO = (d?: Date | null): string | null => (d ? d.toISOString() : null)
const ymd = (d?: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null)

const obraInclude = Prisma.validator<Prisma.obrasInclude>()({
  cliente: { include: { cidades: true } },
  equipe: true,
  pedido_compra: {
    include: {
      fornecedor_telha: { select: { id: true, nome: true } },
      fornecedor_madeira: { select: { id: true, nome: true } },
      andaimes_fornecedor: { select: { id: true, nome: true } },
      pedido_telha_link: true,
      pedido_madeira_link: true,
      pedido_materiais_link: true,
      pedido_andaimes_link: true,
      pedido_telha_itens: true,
      pedido_madeira_itens: true,
      pedido_materiais_itens: true,
      pedido_andaimes_itens: true,
    },
  },
  ordem_servico: { include: { equipe: true } },
  imagens: { orderBy: [{ ordem: "asc" as const }, { id: "asc" as const }] },
  orcamento: { select: { id: true, titulo: true } },
})

type ObraRow = Prisma.obrasGetPayload<{ include: typeof obraInclude }>

export type ObraDetalheDTO = {
  id: number
  titulo: string | null
  orcamento: { id: number } | null
  anexos: {
    orcamentoId: number | null
    propostaSlide: string | null
    propostaPdf: string | null
    contrato: string | null
    ordemServico: string | null
  }
  cliente: {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade: { id: number | null; nome: string | null }
    cpf: string | null
  }
  equipe: { id: number; nome: string } | null
  dadosObra: {
    endereco: string
    mapsUrl: string
    tipoObra: string
    largura: number
    comprimento: number
    telhaEscolhida: string
    valorObra: number
    valorMaoDeObra: number
    status: string
    observacoes: string | null
    dataCriacao: string | null
    dataUltimaAlteracao: string | null
  }
  financeiro: {
    entrada: { valor: number | null; forma: string | null; status: string }
    quitacao: { valor: number | null; forma: string | null; status: string }
  }
  pedidoCompra: {
    id: number
    links: { telhaId: number | null; madeiraId: number | null; materiaisId: number | null; andaimesId: number | null }
    linksData: {
      telha?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
      madeira?: {
        id: number
        componente: string
        madeiraNome: string
        descricao: string
        quantidade: number
        tamanho: number
        precoUnitario: number
        total: number
      }
      materiais?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
      andaimes?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
    }
    telha: { orcamento: number; area: number; status: string; previsao: string | null }
    madeira: { orcamento: number; status: string; previsao: string | null }
    materiais: { status: string }
    andaimes: { status: string }
    fornecedores: {
      telha: { id: number; nome: string } | null
      madeira: { id: number; nome: string } | null
      andaimes: { id: number; nome: string } | null
    }
    itens: {
      telha: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
      madeira: Array<{
        id: number
        componente: string
        madeiraNome: string
        descricao: string
        quantidade: number
        tamanho: number
        precoUnitario: number
        total: number
      }>
      materiais: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
      andaimes: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
    }
  } | null
  ordemServico: {
    id: number
    equipeId: number
    equipe: { id: number; nome: string } | null
    dataPrevInicio: string
    dataPrevConclusao: string
  } | null
  imagens: Array<{ id: number; url: string; ordem: number | null; legenda: string | null; createdAt: string }>
}

export async function detalharObraDB(obraId: number): Promise<ObraDetalheDTO> {
  if (!Number.isFinite(obraId) || obraId <= 0) {
    throw new AppError("INVALID_ID", "Parâmetro id inválido.", "validate-id")
  }

  const row: ObraRow | null = await prisma.obras.findUnique({
    where: { id: obraId },
    include: obraInclude,
  })

  if (!row) throw new AppError("OBRA_NOT_FOUND", "Obra não encontrada.", "find-obra")

  const pc = row.pedido_compra

  const dto: ObraDetalheDTO = {
    id: row.id,
    titulo: row.titulo ?? row.orcamento?.titulo ?? null,

    orcamento: row.orcamento ? { id: row.orcamento.id } : null,

    anexos: {
      orcamentoId: row.orcamento?.id ?? null,
      propostaSlide: row.link_slide_orcamento ?? null,
      propostaPdf: row.link_pdf_orcamento ?? null,
      contrato: row.link_contrato ?? null,
      ordemServico: row.link_ordem_servico ?? null,
    },

    cliente: {
      id: row.cliente_id,
      nome: row.cliente.nome,
      telefone: row.cliente.telefone ?? null,
      bairro: row.cliente.bairro ?? null,
      cidade: { id: row.cliente.cidade_id ?? null, nome: row.cliente.cidades?.nome ?? null },
      cpf: row.cliente.cpf ?? null,
    },

    equipe: row.equipe ? { id: row.equipe.id, nome: row.equipe.nome } : null,

    dadosObra: {
      endereco: row.endereco_obra,
      mapsUrl: row.maps_url,
      tipoObra: row.tipo_obra,
      largura: n0(row.largura),
      comprimento: n0(row.comprimento),
      telhaEscolhida: row.telha_escolhida,
      valorObra: n0(row.valor_obra),
      valorMaoDeObra: n0(row.valor_mao_de_obra),
      status: row.status,
      observacoes: row.observacoes ?? null,
      dataCriacao: dateISO(row.data_criacao),
      dataUltimaAlteracao: dateISO(row.data_ultima_alteracao),
    },

    financeiro: {
      entrada: {
        valor: asNum(row.pagamento_entrada),
        forma: row.forma_pagamento_entrada ?? null,
        status: row.status_pagamento_entrada,
      },
      quitacao: {
        valor: asNum(row.pagamento_quitacao),
        forma: row.forma_pagamento_quitacao ?? null,
        status: row.status_pagamento_quitacao,
      },
    },

    pedidoCompra: pc
      ? {
          id: pc.id,
          links: {
            telhaId: pc.pedido_telha_id ?? null,
            madeiraId: pc.pedido_madeira_id ?? null,
            materiaisId: pc.pedido_materiais_id ?? null,
            andaimesId: pc.pedido_andaimes_id ?? null,
          },
          linksData: {
            telha: pc.pedido_telha_link
              ? {
                  id: pc.pedido_telha_link.id,
                  descricao: pc.pedido_telha_link.descricao,
                  quantidade: n0(pc.pedido_telha_link.quantidade),
                  precoUnitario: n0(pc.pedido_telha_link.preco_unitario),
                  total: n0(pc.pedido_telha_link.total),
                }
              : undefined,
            madeira: pc.pedido_madeira_link
              ? {
                  id: pc.pedido_madeira_link.id,
                  componente: pc.pedido_madeira_link.componente,
                  madeiraNome: pc.pedido_madeira_link.madeira_nome,
                  descricao: pc.pedido_madeira_link.descricao,
                  quantidade: n0(pc.pedido_madeira_link.quantidade),
                  tamanho: n0(pc.pedido_madeira_link.tamanho),
                  precoUnitario: n0(pc.pedido_madeira_link.preco_unitario),
                  total: n0(pc.pedido_madeira_link.total),
                }
              : undefined,
            materiais: pc.pedido_materiais_link
              ? {
                  id: pc.pedido_materiais_link.id,
                  descricao: pc.pedido_materiais_link.descricao,
                  quantidade: n0(pc.pedido_materiais_link.quantidade),
                  precoUnitario: n0(pc.pedido_materiais_link.preco_unitario),
                  total: n0(pc.pedido_materiais_link.total),
                }
              : undefined,
            andaimes: pc.pedido_andaimes_link
              ? {
                  id: pc.pedido_andaimes_link.id,
                  descricao: pc.pedido_andaimes_link.descricao,
                  quantidade: n0(pc.pedido_andaimes_link.quantidade),
                  precoUnitario: n0(pc.pedido_andaimes_link.preco_unitario),
                  total: n0(pc.pedido_andaimes_link.total),
                }
              : undefined,
          },
          telha: {
            orcamento: n0(pc.orcamento_telha),
            area: n0(pc.area_telha),
            status: pc.status_telha,
            previsao: ymd(pc.previsao_telha),
          },
          madeira: {
            orcamento: n0(pc.orcamento_madeira),
            status: pc.status_madeira,
            previsao: ymd(pc.previsao_madeira),
          },
          materiais: { status: pc.materiais_status },
          andaimes: { status: pc.andaimes_status },
          fornecedores: {
            telha: pc.fornecedor_telha ? { id: pc.fornecedor_telha.id, nome: pc.fornecedor_telha.nome } : null,
            madeira: pc.fornecedor_madeira ? { id: pc.fornecedor_madeira.id, nome: pc.fornecedor_madeira.nome } : null,
            andaimes: pc.andaimes_fornecedor ? { id: pc.andaimes_fornecedor.id, nome: pc.andaimes_fornecedor.nome } : null,
          },
          itens: {
            telha: (pc.pedido_telha_itens ?? []).map((i) => ({
              id: i.id,
              descricao: i.descricao,
              quantidade: n0(i.quantidade),
              precoUnitario: n0(i.preco_unitario),
              total: n0(i.total),
            })),
            madeira: (pc.pedido_madeira_itens ?? []).map((i) => ({
              id: i.id,
              componente: i.componente,
              madeiraNome: i.madeira_nome,
              descricao: i.descricao,
              quantidade: n0(i.quantidade),
              tamanho: n0(i.tamanho),
              precoUnitario: n0(i.preco_unitario),
              total: n0(i.total),
            })),
            materiais: (pc.pedido_materiais_itens ?? []).map((i) => ({
              id: i.id,
              descricao: i.descricao,
              quantidade: n0(i.quantidade),
              precoUnitario: n0(i.preco_unitario),
              total: n0(i.total),
            })),
            andaimes: (pc.pedido_andaimes_itens ?? []).map((i) => ({
              id: i.id,
              descricao: i.descricao,
              quantidade: n0(i.quantidade),
              precoUnitario: n0(i.preco_unitario),
              total: n0(i.total),
            })),
          },
        }
      : null,

    ordemServico: row.ordem_servico
      ? {
          id: row.ordem_servico.id,
          equipeId: row.ordem_servico.equipe_id,
          equipe: row.ordem_servico.equipe ? { id: row.ordem_servico.equipe.id, nome: row.ordem_servico.equipe.nome } : null,
          dataPrevInicio: ymd(row.ordem_servico.data_prev_inicio)!,
          dataPrevConclusao: ymd(row.ordem_servico.data_prev_conclusao)!,
        }
      : null,

    imagens: (row.imagens ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      ordem: img.ordem ?? null,
      legenda: img.legenda ?? null,
      createdAt: dateISO(img.created_at)!,
    })),
  }

  return dto
}
