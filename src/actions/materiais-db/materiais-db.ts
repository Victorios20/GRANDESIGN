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

export async function buscarMadeirasParaSelector(fornecedorId: number, q: string): Promise<Madeira[]> {
  return prisma.materiais.findMany({
    where: {
      tipo: "madeira",
      fornecedorId,
      descricao: { contains: q, mode: "insensitive" },
    },
    orderBy: { descricao: "asc" },
  })
}

export async function criarMadeira(data: {
  descricao: string
  preco_unitario: number
  unidade_de_medida?: string | null
  fornecedorId: number
}) {
  const descricao = String(data.descricao || "").trim()
  const preco = Number(data.preco_unitario)
  const unidade = typeof data.unidade_de_medida === "string" && data.unidade_de_medida.trim() ? data.unidade_de_medida.trim() : "un"
  const fornecedorId = Number(data.fornecedorId)
  if (!descricao) throw new Error("Descricao obrigatória")
  if (!Number.isFinite(preco) || preco < 0) throw new Error("preco_unitario inválido")
  if (!Number.isFinite(fornecedorId) || fornecedorId <= 0) throw new Error("fornecedorId inválido")
  return prisma.materiais.create({
    data: {
      descricao,
      tipo: "madeira",
      preco_unitario: preco,
      unidade_de_medida: unidade,
      fornecedorId,
    },
    select: { id: true },
  })
}

export async function criarMaterialGenerico(data: {
  descricao: string
  tipo: "geral" | "telha"
  preco_unitario: number
  unidade_de_medida?: string | null
  fornecedorId?: number | null
}) {
  const descricao = String(data.descricao || "").trim()
  const tipo = String(data.tipo || "")
  const preco = Number(data.preco_unitario)
  const unidade = typeof data.unidade_de_medida === "string" && data.unidade_de_medida.trim() ? data.unidade_de_medida.trim() : "un"
  if (!descricao) throw new Error("Descricao obrigatória")
  if (!["geral", "telha"].includes(tipo)) throw new Error("tipo inválido")
  if (!Number.isFinite(preco) || preco < 0) throw new Error("preco_unitario inválido")

  // Telha aceita fornecedor opcional (legado sem fornecedor continua válido); "geral" nunca tem.
  let fornecedorId: number | undefined
  if (tipo === "telha" && data.fornecedorId != null) {
    const f = Number(data.fornecedorId)
    if (Number.isFinite(f) && f > 0) fornecedorId = f
  }

  return prisma.materiais.create({
    data: {
      descricao,
      tipo,
      preco_unitario: preco,
      unidade_de_medida: unidade,
      ...(fornecedorId !== undefined ? { fornecedorId } : {}),
    },
    select: { id: true },
  })
}

export async function criarMaterial(data: {
  descricao: string
  tipo: "geral" | "madeira" | "telha"
  preco_unitario: number
  unidade_de_medida?: string | null
  fornecedorId?: number | null
}) {
  if (isMadeira(data.tipo)) {
    if (!Number.isFinite(Number(data.fornecedorId)) || Number(data.fornecedorId) <= 0) {
      throw new Error("fornecedorId inválido")
    }
    return criarMadeira({
      descricao: data.descricao,
      preco_unitario: data.preco_unitario,
      unidade_de_medida: data.unidade_de_medida,
      fornecedorId: Number(data.fornecedorId),
    })
  }
  return criarMaterialGenerico({
    descricao: data.descricao,
    tipo: data.tipo as "geral" | "telha",
    preco_unitario: data.preco_unitario,
    unidade_de_medida: data.unidade_de_medida ?? undefined,
    fornecedorId: data.fornecedorId,
  })
}

export async function atualizarMaterial(id: number, data: {
  descricao?: string
  preco_unitario?: number
  unidade_de_medida?: string | null
  fornecedorId?: number | null
}) {
  const payload: any = {}
  if (typeof data.descricao === "string") {
    const d = data.descricao.trim()
    if (!d) throw new Error("Descricao obrigatória")
    payload.descricao = d
  }
  if (data.preco_unitario !== undefined) {
    const p = Number(data.preco_unitario)
    if (!Number.isFinite(p) || p < 0) throw new Error("preco_unitario inválido")
    payload.preco_unitario = p
  }
  if (data.unidade_de_medida !== undefined) {
    payload.unidade_de_medida =
      typeof data.unidade_de_medida === "string" && data.unidade_de_medida.trim()
        ? data.unidade_de_medida.trim()
        : "un"
  }
  if (data.fornecedorId !== undefined && data.fornecedorId !== null) {
    const f = Number(data.fornecedorId)
    if (Number.isFinite(f) && f > 0) {
      payload.fornecedorId = f
    }
  }
  return prisma.materiais.update({
    where: { id },
    data: payload,
    select: { id: true },
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

export async function listarTodosMateriais(): Promise<Material[]> {
  return prisma.materiais.findMany({
    orderBy: { descricao: "asc" },
  })
}

export async function removerMaterial(id: number) {
  return prisma.materiais.delete({
    where: { id },
    select: { id: true },
  })
}

// compat com imports antigos:
export const atualizarMadeira = atualizarMaterial
export const removerMadeira = removerMaterial