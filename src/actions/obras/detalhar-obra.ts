// src/actions/obras/detalhar-obra.ts
"use server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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

export type PedidoCompraDTO = {
  id: number
  categoria: string
  status: string
  fornecedor: { id: number; nome: string } | null
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
    descricao: string
    quantidade: number
    tamanho: number | null
    precoUnitario: number
    total: number
  }>
}

export type ObraDetalheDTO = {
  id: number
  titulo: string | null
  status: string
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
          itens: true,
        },
        orderBy: { categoria: "asc" },
      },
      ordem_servico: { include: { equipe: true } },
      imagens: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
    },
  })

  if (!obra) {
    throw new AppError("OBRA_NOT_FOUND", "Obra não encontrada", "find-obra")
  }

  return {
    id: obra.id,
    titulo: obra.titulo,
    status: obra.status,
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
    pedidosCompra: obra.pedidos_compra.map((p) => ({
      id: p.id,
      categoria: p.categoria,
      status: p.status,
      fornecedor: p.fornecedor ? { id: p.fornecedor.id, nome: p.fornecedor.nome } : null,
      valores: {
        orcado: n(p.valor_orcado),
        realizado: n(p.valor_realizado),
        frete: n(p.frete),
      },
      entrega: {
        data: ymd(p.data_entrega),
        endereco: p.endereco_entrega,
        receptor: p.nome_receptor,
        telefone: p.telefone_receptor,
        maps: p.link_maps,
      },
      itens: p.itens.map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: n(i.quantidade)!,
        tamanho: n(i.tamanho),
        precoUnitario: n(i.preco_unitario)!,
        total: n(i.total)!,
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
    imagens: obra.imagens.map((i) => ({
      id: i.id,
      url: i.url,
      ordem: i.ordem,
      legenda: i.legenda,
    })),
  }
}
