/* ------------------------------------------------------------------
   Camada DB para Componentes (Prisma) – Grandesign
   - listarComponentesDB()
   - atualizarComponenteDB({ id, nome })
   - criarComponenteDB({ nome })
   - deletarComponenteDB(id)
------------------------------------------------------------------- */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export interface Componente {
  id: number
  nome: string
}

/** Lista componentes (id, nome) ordenados por ID asc. */
export async function listarComponentesDB(): Promise<Componente[]> {
  const rows = await prisma.componentes.findMany({
    select: { id: true, nome: true },
    orderBy: { id: "asc" },
  })
  return rows
}

/** Atualiza apenas o nome do componente. */
export async function atualizarComponenteDB(input: {
  id: number
  nome: string
}) {
  const id = Number(input.id)
  if (!Number.isFinite(id)) throw new Error("ID inválido")

  const nome = input.nome?.trim()
  if (!nome) throw new Error("Nome é obrigatório")

  try {
    const res = await prisma.componentes.update({
      where: { id },
      data: { nome },
      select: { id: true },
    })
    return res
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2002") {
      // Unique constraint failed
      throw new Error("Já existe um componente com esse nome.")
    }
    if (err?.code === "P2025") {
      throw new Error("Componente não encontrado para atualização.")
    }
    throw new Error("Falha ao atualizar componente.")
  }
}

/** Cria novo componente (para “Adicionar”). */
export async function criarComponenteDB(input: { nome: string }) {
  const nome = input.nome?.trim()
  if (!nome) throw new Error("Nome é obrigatório")

  try {
    const created = await prisma.componentes.create({
      data: { nome },
      select: { id: true },
    })
    return created
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2002") {
      throw new Error("Já existe um componente com esse nome.")
    }
    throw new Error("Falha ao criar componente.")
  }
}

/** Deleta componente por ID (trata FK genérico). */
export async function deletarComponenteDB(id: number) {
  const cid = Number(id)
  if (!Number.isFinite(cid)) throw new Error("ID inválido")
  try {
    const res = await prisma.componentes.delete({
      where: { id: cid },
      select: { id: true },
    })
    return res
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2025") {
      throw new Error("Componente não encontrado para exclusão.")
    }
    if (err?.code === "P2003") {
      throw new Error("Não é possível excluir o componente por estar em uso.")
    }
    throw new Error("Falha ao excluir componente.")
  }
}
