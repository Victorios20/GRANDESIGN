import { prisma } from "@/lib/prisma"


export type Fornecedor = Awaited<ReturnType<typeof prisma.fornecedores.findMany>>[number]

export async function listarFornecedores(): Promise<Fornecedor[]> {
  return prisma.fornecedores.findMany({
    orderBy: { id: "asc" },
  })
}

export async function criarFornecedor(nome: string): Promise<Fornecedor> {
  return prisma.fornecedores.create({
    data: { nome },
  })
}

export async function atualizarFornecedor(id: number, nome: string): Promise<Fornecedor> {
  return prisma.fornecedores.update({
    where: { id },
    data: { nome },
  })
}

export async function removerFornecedor(id: number): Promise<void> {
  await prisma.fornecedores.delete({
    where: { id },
  })
}
