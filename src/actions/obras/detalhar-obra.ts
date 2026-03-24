import { prisma } from "@/lib/prisma"
import { ObraDetalheDTO, ObraStatus, PedidoCompraDTO } from "@/app/obras/lib/types"

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

function ymd(d?: Date | null) {
  if (!d) return null

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}
const iso = (d?: Date | null) => (d ? d.toISOString() : null)

export type ObraAgendaSegmentoDTO = {
  id: number
  start: string
  end: string
  tipo: string
  status: string
  equipe: { id: number; nome: string; cor: string | null } | null
  observacoes: string | null
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
      segmentos: {
        orderBy: { inicio: "asc" },
        include: { equipe: true },
      },
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
        id_fornecedor: true,
      },
    })
    : null

  const orcamentoOut = orcamento
    ? {
      id: orcamento.id,
      linkSlide: orcamento.link_slide ?? null,
      linkPdf: orcamento.link_pdf ?? null,
      titulo: orcamento.titulo ?? null,
      fornecedorId: orcamento.id_fornecedor ?? null,
    }
    : null

  const anexos = {
    orcamentoId: orcamentoId,
    propostaSlide: orcamentoOut?.linkSlide ?? null,
    propostaPdf: orcamentoOut?.linkPdf ?? null,
    orcamentoPdf: orcamentoOut?.linkPdf ?? null,
    contrato: obra.link_contrato ?? null,
    linkContratoAssinado: obra.link_contrato_assinado ?? null,
    ordemServico: obra.link_ordem_servico ?? null,
  }

  return {
    id: obra.id,
    titulo: obra.titulo,
    status: obra.status,
    dataInicioObra: ymd(obra.data_inicio_obra),
    dataFimObra: ymd(obra.data_fim_obra),
    orcamentoId,
    dataContrato: ymd(obra.data_contrato),
    dataConclusao: ymd(obra.data_conclusao),

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

    dadosObra: {
      endereco: obra.endereco_obra,
      mapsUrl: obra.maps_url,
      tipoObra: obra.tipo_obra,
      isLShape: !!obra.is_l_shape,
      largura: n(obra.largura)!,
      comprimento: n(obra.comprimento)!,
      larguraMaior: n(obra.largura_maior),
      larguraMenor: n(obra.largura_menor),
      comprimentoMaior: n(obra.comprimento_maior),
      comprimentoMenor: n(obra.comprimento_menor),
      telhaEscolhida: obra.telha_escolhida,
      valorObra: n(obra.valor_obra)!,
      valorMaoDeObra: n(obra.valor_mao_de_obra)!,
      status: obra.status as ObraStatus,
      observacoes: obra.observacoes ?? null,
      dataCriacao: ymd(obra.data_criacao),
      dataUltimaAlteracao: iso(obra.data_ultima_alteracao),
    },

    financeiro: {
      entrada: {
        valor: n(obra.pagamento_entrada),
        forma: obra.forma_pagamento_entrada,
        status: (obra.status_pagamento_entrada || "PENDENTE") as any,
      },
      quitacao: {
        valor: n(obra.pagamento_quitacao),
        forma: obra.forma_pagamento_quitacao,
        status: (obra.status_pagamento_quitacao || "PENDENTE") as any,
      },
    },

    equipe: obra.ordem_servico?.equipe 
      ? { id: obra.ordem_servico.equipe.id, nome: obra.ordem_servico.equipe.nome } 
      : null,

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

    pedidosCompra: (obra.pedidos_compra || []).map((p: any) => ({
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
      createdAt: iso(p.created_at || p.data_criacao),
      updatedAt: iso(p.updated_at || p.data_ultima_alteracao),
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
        createdAt: iso(i.created_at || i.data_criacao),
        updatedAt: iso(i.updated_at || i.data_ultima_alteracao),
      })),
    })),

    ordemServico: obra.ordem_servico
      ? {
        id: obra.ordem_servico.id,
        equipeId: obra.ordem_servico.equipe_id,
        equipe: obra.ordem_servico.equipe
          ? { id: obra.ordem_servico.equipe.id, nome: obra.ordem_servico.equipe.nome }
          : null,
        dataPrevInicio: ymd(obra.ordem_servico.data_prev_inicio)!,
        dataPrevConclusao: ymd(obra.ordem_servico.data_prev_conclusao)!,
      }
      : null,

    imagens: (obra.imagens || []).map((i: any) => ({
      id: i.id,
      url: i.url,
      ordem: i.ordem,
      legenda: i.legenda,
      createdAt: iso(i.created_at) || "",
    })),

    agenda: (obra.segmentos || []).map((s: any) => ({
      id: s.id,
      start: ymd(s.inicio)!,
      end: ymd(s.fim)!,
      tipo: s.tipo ?? "EXECUCAO",
      status: s.status ?? "AGENDADO",
      equipe: s.equipe
        ? { id: s.equipe.id, nome: s.equipe.nome, cor: s.equipe.cor }
        : null,
      observacoes: s.observacoes,
    })),
  }
}
