/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/cidades-db/cidades-db.ts
   Camada DB (server-only) usando Prisma (via $queryRaw).
   Mantém o contrato consumido pelo front:
   - Tipo Cidade { id: number; nome: string }
   - Leitura ordenada A–Z
   - Helpers de escrita opcionais (add/update/delete) p/ uso futuro
------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma"

/** Shape usado no front */
export type Cidade = {
  id: number
  nome: string
  cor?: string | null
}

/** Normalização leve para entradas de escrita */
function cleanName(nome: string): string {
  return (nome ?? "").trim().replace(/\s+/g, " ")
}

/** Lista todas as cidades (A–Z), retornando apenas { id, nome } */
export async function getCidadesDB(): Promise<Cidade[]> {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT id, nome, cor
      FROM cidades
      WHERE nome IS NOT NULL AND TRIM(nome) <> ''
      ORDER BY nome ASC
    `) as Array<{ id: number; nome: string | null; cor: string | null }>

    return rows.map((r) => ({ id: r.id, nome: r.nome ?? "", cor: r.cor }))
  } catch (err) {
    console.error("getCidadesDB: erro ao listar cidades:", err)
    return [] // compatível com comportamento atual do front
  }
}

/* ======= Escritas (opcionais para uso futuro; mantêm contratos simples) ======= */

/** Insere uma cidade e retorna { id, nome, cor } ou null em erro (ex.: duplicado) */
export async function addCidadeDB(nome: string, cor?: string | null): Promise<Cidade & { cor?: string | null } | null> {
  try {
    const n = cleanName(nome)
    if (!n) return null

    const rows = (await prisma.$queryRaw`
      INSERT INTO cidades (nome, cor)
      VALUES (${n}, ${cor || null})
      RETURNING id, nome, cor
    `) as Array<{ id: number; nome: string; cor: string | null }>
    return rows?.[0] ?? null
  } catch (err: any) {
    // Conflito de unicidade (se houver UNIQUE(nome) no banco)
    console.error("addCidadeDB: erro ao inserir cidade:", err)
    return null
  }
}

/** Atualiza o nome e/ou cor; retorna true/false */
export async function updateCidadeDB(id: number, nome: string, cor?: string | null): Promise<boolean> {
  try {
    const n = cleanName(nome)
    if (!Number.isFinite(id) || id <= 0 || !n) return false

    const rows = (await prisma.$queryRaw`
      UPDATE cidades
      SET nome = ${n}, cor = ${cor || null}
      WHERE id = ${id}
      RETURNING id
    `) as Array<{ id: number }>
    return !!rows?.[0]
  } catch (err) {
    console.error("updateCidadeDB: erro ao atualizar cidade:", err)
    return false
  }
}

/** Exclui por id; retorna true/false */
export async function deleteCidadeDB(id: number): Promise<boolean> {
  try {
    if (!Number.isFinite(id) || id <= 0) return false

    const rows = (await prisma.$queryRaw`
      DELETE FROM cidades
      WHERE id = ${id}
      RETURNING id
    `) as Array<{ id: number }>
    return !!rows?.[0]
  } catch (err) {
    console.error("deleteCidadeDB: erro ao excluir cidade:", err)
    return false
  }
}
