import { prisma } from "@/lib/prisma"

export type Fornecedor = {
  id: number
  nome: string
  tipo: string | null
}

const selectFornecedor = {
  id: true,
  nome: true,
  tipo: true,
} as const

export async function listarFornecedores(): Promise<Fornecedor[]> {
  return prisma.fornecedores.findMany({
    select: selectFornecedor,
    orderBy: { id: "asc" },
  })
}

export async function listarFornecedoresPorTipo(tipo: string): Promise<Fornecedor[]> {
  const t = String(tipo || "").trim()
  if (!t) return listarFornecedores()

  return prisma.fornecedores.findMany({
    select: selectFornecedor,
    where: { tipo: { equals: t, mode: "insensitive" } },
    orderBy: { nome: "asc" },
  })
}

export async function criarFornecedor(nome: string, tipo?: string | null): Promise<Fornecedor> {
  return prisma.fornecedores.create({
    data: { nome, tipo: tipo ?? null },
    select: selectFornecedor,
  })
}

export async function atualizarFornecedor(id: number, nome: string, tipo?: string | null): Promise<Fornecedor> {
  return prisma.fornecedores.update({
    where: { id },
    data: { nome, ...(tipo !== undefined ? { tipo } : {}) },
    select: selectFornecedor,
  })
}

export async function removerFornecedor(id: number): Promise<void> {
  await prisma.fornecedores.delete({ where: { id } })
}
