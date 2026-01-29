import { prisma } from "@/lib/prisma"

export class AppError extends Error {
  code: "INVALID_ID" | "OBRA_NOT_FOUND" | "UNEXPECTED_ERROR"
  step?: string
  constructor(code: AppError["code"], message: string, step?: string) {
    super(message)
    this.code = code
    this.step = step
  }
}

const n = (v: any) =>
  v == null ? null : typeof v?.toNumber === "function" ? v.toNumber() : Number(v)

const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
const iso = (d?: Date | null) => (d ? d.toISOString() : null)

export type PedidoCompraDTO = {
  id: number

  obraId: number

  categoria: string
  status: string

  fornecedorId: number | null
  fornecedor: { id: number; nome: string } | null

  valorOrcado: number | null
  valorRealizado: number | null
  frete: number | null

  descricao: string | null
  observacoes: string | null

  dataEntrega: string | null
  enderecoEntrega: string | null
  nomeReceptor: string | null
  telefoneReceptor: string | null
  linkMaps: string | null

  createdAt: string | null
  updatedAt: string | null

  valores: {
    orcado: number | null
    realizado: number | null
    frete: number | null
  }

  entrega: {
    data: string | null
    endereco: string | null
    receptor: string | null
    telefone: string | null
    maps: string | null
  }

  itens: Array<{
    id: number
    pedidoCompraId: number

    descricao: string
    quantidade: number
    tamanho: number | null
    precoUnitario: number
    total: number

    createdAt: string | null
    updatedAt: string | null
  }>
}

export type ObraDetalheDTO = {
  id: number
  titulo: string | null
  status: string

  orcamentoId: number | null
  orcamento: {
    id: number
    linkSlide: string | null
    linkPdf: string | null
    titulo: string | null
  } | null

  anexos: {
    propostaSlide: string | null
    orcamentoPdf: string | null
    contrato: string | null
    ordemServico: string | null
  }

  cliente: {
    id: number
    nome: string
    cpf: string | null
    telefone: string | null
    bairro: string | null
    cidade: { id: number | null; nome: string | null }
  }
  obra: {
    endereco: string
    mapsUrl: string
    tipo: string
    largura: number
    comprimento: number
    telha: string
    valorObra: number
    valorMaoDeObra: number
    observacoes: string | null
  }
  financeiro: {
    entrada: { valor: number | null; forma: string | null; status: string }
    quitacao: { valor: number | null; forma: string | null; status: string }
  }

  pedidosCompra: PedidoCompraDTO[]

  ordemServico: {
    id: number
    equipe: { id: number; nome: string } | null
    dataPrevInicio: string
    dataPrevConclusao: string
  } | null

  imagens: Array<{ id: number; url: string; ordem: number | null; legenda: string | null }>
}

function pickOrcamentoIdFromObraRow(obra: any): number | null {
  const candidates = [
    obra?.orcamento_id,
    obra?.orcamentoId,
    obra?.orcamento?.id,
    obra?.orcamento?.orcamento_id,
  ]
  for (const c of candidates) {
    const v = Number(c)
    if (Number.isFinite(v) && v > 0) return v
  }
  return null
}

export async function detalharObraDB(obraId: number): Promise<ObraDetalheDTO> {
  if (!Number.isFinite(obraId) || obraId <= 0) {
    throw new AppError("INVALID_ID", "ID inválido", "validate-id")
  }

  const obra = await prisma.obras.findUnique({
    where: { id: obraId },
    include: {
      cliente: { include: { cidades: true } },
      pedidos_compra: {
        include: {
          fornecedor: { select: { id: true, nome: true } },
          itens: { orderBy: [{ id: "asc" }] },
        },
        orderBy: [{ categoria: "asc" }, { id: "asc" }],
      },
      ordem_servico: { include: { equipe: true } },
      imagens: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
    },
  })

  if (!obra) {
    throw new AppError("OBRA_NOT_FOUND", "Obra não encontrada", "find-obra")
  }

  const orcamentoId = pickOrcamentoIdFromObraRow(obra)

  const orcamento = orcamentoId
    ? await prisma.orcamento.findUnique({
        where: { id: orcamentoId },
        select: {
          id: true,
          link_slide: true,
          link_pdf: true,
          titulo: true,
        },
      })
    : null

  const orcamentoOut = orcamento
    ? {
        id: orcamento.id,
        linkSlide: orcamento.link_slide ?? null,
        linkPdf: orcamento.link_pdf ?? null,
        titulo: orcamento.titulo ?? null,
      }
    : null

  const anexos = {
    propostaSlide: orcamentoOut?.linkSlide ?? null,
    orcamentoPdf: orcamentoOut?.linkPdf ?? null,
    contrato: obra.link_contrato ?? null,
    ordemServico: obra.link_ordem_servico ?? null,
  }

  return {
    id: obra.id,
    titulo: obra.titulo,
    status: obra.status,

    orcamentoId,
    orcamento: orcamentoOut,
    anexos,

    cliente: {
      id: obra.cliente.id,
      nome: obra.cliente.nome,
      cpf: obra.cliente.cpf ?? null,
      telefone: obra.cliente.telefone ?? null,
      bairro: obra.cliente.bairro ?? null,
      cidade: {
        id: obra.cliente.cidade_id ?? null,
        nome: obra.cliente.cidades?.nome ?? null,
      },
    },

    obra: {
      endereco: obra.endereco_obra,
      mapsUrl: obra.maps_url,
      tipo: obra.tipo_obra,
      largura: n(obra.largura)!,
      comprimento: n(obra.comprimento)!,
      telha: obra.telha_escolhida,
      valorObra: n(obra.valor_obra)!,
      valorMaoDeObra: n(obra.valor_mao_de_obra)!,
      observacoes: obra.observacoes ?? null,
    },

    financeiro: {
      entrada: {
        valor: n(obra.pagamento_entrada),
        forma: obra.forma_pagamento_entrada,
        status: obra.status_pagamento_entrada,
      },
      quitacao: {
        valor: n(obra.pagamento_quitacao),
        forma: obra.forma_pagamento_quitacao,
        status: obra.status_pagamento_quitacao,
      },
    },

    pedidosCompra: obra.pedidos_compra.map((p: any) => ({
      id: p.id,

      obraId: p.obra_id,

      categoria: p.categoria,
      status: p.status,

      fornecedorId: p.fornecedor_id ?? null,
      fornecedor: p.fornecedor ? { id: p.fornecedor.id, nome: p.fornecedor.nome } : null,

      valorOrcado: n(p.valor_orcado),
      valorRealizado: n(p.valor_realizado),
      frete: n(p.frete),

      descricao: p.descricao ?? null,
      observacoes: p.observacoes ?? null,

      dataEntrega: ymd(p.data_entrega),
      enderecoEntrega: p.endereco_entrega ?? null,
      nomeReceptor: p.nome_receptor ?? null,
      telefoneReceptor: p.telefone_receptor ?? null,
      linkMaps: p.link_maps ?? null,

      createdAt: iso(p.created_at),
      updatedAt: iso(p.updated_at),

      valores: {
        orcado: n(p.valor_orcado),
        realizado: n(p.valor_realizado),
        frete: n(p.frete),
      },

      entrega: {
        data: ymd(p.data_entrega),
        endereco: p.endereco_entrega ?? null,
        receptor: p.nome_receptor ?? null,
        telefone: p.telefone_receptor ?? null,
        maps: p.link_maps ?? null,
      },

      itens: (p.itens || []).map((i: any) => ({
        id: i.id,
        pedidoCompraId: i.pedido_compra_id,

        descricao: i.descricao,
        quantidade: n(i.quantidade)!,
        tamanho: n(i.tamanho),
        precoUnitario: n(i.preco_unitario)!,
        total: n(i.total)!,

        createdAt: iso(i.created_at),
        updatedAt: iso(i.updated_at),
      })),
    })),

    ordemServico: obra.ordem_servico
      ? {
          id: obra.ordem_servico.id,
          equipe: obra.ordem_servico.equipe
            ? { id: obra.ordem_servico.equipe.id, nome: obra.ordem_servico.equipe.nome }
            : null,
          dataPrevInicio: ymd(obra.ordem_servico.data_prev_inicio)!,
          dataPrevConclusao: ymd(obra.ordem_servico.data_prev_conclusao)!,
        }
      : null,

    imagens: obra.imagens.map((i: any) => ({
      id: i.id,
      url: i.url,
      ordem: i.ordem,
      legenda: i.legenda,
    })),
  }
}
