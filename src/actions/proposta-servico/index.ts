"use server"

import { z } from "zod"

import { calcularValorFinalProposta } from "@/lib/proposta-utils"
import { prisma } from "@/lib/prisma"

export const propostaInputSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório").max(200),
  cliente_id: z.number().int().positive(),
  descricao_servico: z.string().min(1, "Descrição obrigatória"),
  dimensoes: z.string().optional().nullable(),
  itens: z.array(z.string().min(1)).default([]),
  custo_mao_obra: z.number().min(0).default(0),
  custo_materiais: z.number().min(0).default(0),
  custo_frete: z.number().min(0).default(0),
  lucro: z.number().min(0).default(0),
  forma_pagamento: z.string().optional().nullable(),
  prazo_execucao: z.string().optional().nullable(),
  validade: z.string().optional().nullable(), // ISO date-only
  observacoes: z.string().optional().nullable(),
  status: z.enum(["RASCUNHO", "ENVIADA"]).default("RASCUNHO"),
})

export type PropostaInput = z.infer<typeof propostaInputSchema>

function toData(input: PropostaInput, userId?: number) {
  const valorFinal = calcularValorFinalProposta({
    maoObra: input.custo_mao_obra,
    materiais: input.custo_materiais,
    frete: input.custo_frete,
    lucro: input.lucro,
  })

  return {
    titulo: input.titulo,
    cliente_id: input.cliente_id,
    descricao_servico: input.descricao_servico,
    dimensoes: input.dimensoes ?? null,
    status: input.status,
    custo_mao_obra: input.custo_mao_obra,
    custo_materiais: input.custo_materiais,
    custo_frete: input.custo_frete,
    lucro: input.lucro,
    valor_final: valorFinal,
    forma_pagamento: input.forma_pagamento ?? null,
    prazo_execucao: input.prazo_execucao ?? null,
    validade: input.validade ? new Date(input.validade) : null,
    observacoes: input.observacoes ?? null,
    created_by: userId ?? null,
  }
}

export async function salvarProposta(rawInput: PropostaInput, userId?: number) {
  const input = propostaInputSchema.parse(rawInput)
  const proposta = await prisma.proposta_servico.create({
    data: {
      ...toData(input, userId),
      itens: { create: input.itens.map((descricao) => ({ descricao })) },
    },
    select: { id: true },
  })
  return proposta
}

export async function atualizarProposta(id: number, rawInput: PropostaInput) {
  const input = propostaInputSchema.parse(rawInput)
  const data = toData(input)
  // created_by não deve ser sobrescrito na atualização
  delete (data as { created_by?: number | null }).created_by

  await prisma.$transaction(async (tx) => {
    await tx.proposta_servico.update({ where: { id }, data })
    await tx.proposta_servico_item.deleteMany({ where: { proposta_id: id } })
    if (input.itens.length > 0) {
      await tx.proposta_servico_item.createMany({
        data: input.itens.map((descricao) => ({ proposta_id: id, descricao })),
      })
    }
  })
  return { id }
}

export async function getProposta(id: number) {
  return prisma.proposta_servico.findUnique({
    where: { id },
    include: { itens: true, cliente: true },
  })
}

export async function listPropostas() {
  return prisma.proposta_servico.findMany({
    orderBy: { created_at: "desc" },
    include: { cliente: { select: { nome: true } } },
  })
}

export async function excluirProposta(id: number) {
  await prisma.proposta_servico.delete({ where: { id } })
}
