import { prisma } from "@/lib/prisma"


export type Material = Awaited<ReturnType<typeof prisma.materiais.findMany>>[number]
export type Madeira = Material

function isMadeira(tipo?: string) {
  return tipo === "madeira"
}

export async function listarMadeirasPorFornecedor(fornecedorId: number): Promise<Madeira[]> {
  return prisma.materiais.findMany({
    where: { tipo: "madeira", fornecedorId },
    orderBy: { descricao: "asc" },
  })
}

export async function buscarMadeirasParaSelector(fornecedorId: number, query?: string): Promise<Madeira[]> {
  return prisma.materiais.findMany({
    where: {
      tipo: "madeira",
      fornecedorId,
      descricao: query ? { contains: query, mode: "insensitive" } : undefined,
    },
    orderBy: { descricao: "asc" },
  })
}

export async function obterMadeiraPorDescricaoEFornecedor(descricao: string, fornecedorId: number): Promise<Madeira | null> {
  return prisma.materiais.findFirst({
    where: { tipo: "madeira", fornecedorId, descricao },
  })
}

export async function criarMadeira(data: {
  descricao: string
  preco_unitario: number
  unidade_de_medida?: string | null
  fornecedorId: number
}): Promise<Madeira> {
  try {
    return await prisma.materiais.create({
      data: {
        descricao: data.descricao,
        tipo: "madeira",
        preco_unitario: data.preco_unitario as any,
        unidade_de_medida: data.unidade_de_medida ?? undefined,
        fornecedorId: data.fornecedorId,
      } as any,
    })
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("Já existe uma madeira com essa descrição para este fornecedor.")
    }
    throw e
  }
}

export async function atualizarMadeira(
  id: number,
  data: {
    descricao?: string
    preco_unitario?: number
    unidade_de_medida?: string | null
    fornecedorId?: number
  }
): Promise<Madeira> {
  const updateData: any = {}
  if (data.descricao !== undefined) updateData.descricao = data.descricao
  if (data.preco_unitario !== undefined) updateData.preco_unitario = data.preco_unitario as any
  if (data.unidade_de_medida !== undefined) updateData.unidade_de_medida = data.unidade_de_medida
  if (data.fornecedorId !== undefined) updateData.fornecedorId = data.fornecedorId
  try {
    return await prisma.materiais.update({
      where: { id },
      data: updateData as any,
    })
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("Já existe uma madeira com essa descrição para este fornecedor.")
    }
    throw e
  }
}

export async function removerMadeira(id: number): Promise<void> {
  await prisma.materiais.delete({
    where: { id },
  })
}

export async function criarMaterial(data: {
  descricao: string
  preco_unitario: number
  unidade_de_medida?: string | null
  tipo: "madeira" | "geral" | "telha"
  fornecedorId?: number | null
}): Promise<Material> {
  if (isMadeira(data.tipo) && (data.fornecedorId === null || data.fornecedorId === undefined)) {
    throw new Error("Fornecedor é obrigatório para madeiras.")
  }
  const payload: any = {
    descricao: data.descricao,
    tipo: data.tipo,
    preco_unitario: data.preco_unitario as any,
    unidade_de_medida: data.unidade_de_medida ?? undefined,
    fornecedorId: isMadeira(data.tipo) ? (data.fornecedorId as number) : null,
  }
  try {
    return await prisma.materiais.create({ data: payload })
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error(isMadeira(data.tipo) ? "Já existe uma madeira com essa descrição para este fornecedor." : "Já existe um material com essa descrição.")
    }
    throw e
  }
}

export async function atualizarMaterial(
  id: number,
  data: {
    descricao?: string
    preco_unitario?: number
    unidade_de_medida?: string | null
    tipo?: "madeira" | "geral" | "telha"
    fornecedorId?: number | null
}): Promise<Material> {
  const registro = await prisma.materiais.findUnique({ where: { id } })
  if (!registro) {
    throw new Error("Material não encontrado.")
  }
  const tipoDestino = data.tipo ?? registro.tipo
  if (isMadeira(tipoDestino) && (data.fornecedorId === null || data.fornecedorId === undefined) && registro.fornecedorId === null) {
    throw new Error("Fornecedor é obrigatório para madeiras.")
  }
  const updateData: any = {}
  if (data.descricao !== undefined) updateData.descricao = data.descricao
  if (data.preco_unitario !== undefined) updateData.preco_unitario = data.preco_unitario as any
  if (data.unidade_de_medida !== undefined) updateData.unidade_de_medida = data.unidade_de_medida
  if (data.tipo !== undefined) updateData.tipo = data.tipo
  updateData.fornecedorId = isMadeira(tipoDestino) ? (data.fornecedorId ?? registro.fornecedorId) : null
  try {
    return await prisma.materiais.update({
      where: { id },
      data: updateData as any,
    })
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error(isMadeira(tipoDestino) ? "Já existe uma madeira com essa descrição para este fornecedor." : "Já existe um material com essa descrição.")
    }
    throw e
  }
}

export async function removerMaterial(id: number): Promise<void> {
  await prisma.materiais.delete({
    where: { id },
  })
}

export async function listarTelhas(): Promise<Material[]> {
  return prisma.materiais.findMany({
    where: { tipo: "telha" },
    orderBy: { descricao: "asc" },
  })
}

export async function listarMateriaisGerais(): Promise<Material[]> {
  return prisma.materiais.findMany({
    where: { tipo: "geral" },
    orderBy: { descricao: "asc" },
  })
}
