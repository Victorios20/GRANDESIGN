/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/componentes-db/componentes-db.ts
   Camada DB (server-only) usando Prisma ($queryRaw).
   Mantém o contrato atual:
   - Tipo Componente { id: number; nome: string }
   - listarComponentesDB(): SELECT id, nome FROM componentes ORDER BY id ASC
   - Em erro: lança (a rota trata com 500)
------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma"

/** Shape usado no front */
export interface Componente {
  id: number
  nome: string
}

/** SELECT id, nome FROM componentes ORDER BY id ASC */
export async function listarComponentesDB(): Promise<Componente[]> {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT id, nome
      FROM componentes
      ORDER BY id ASC
    `) as Array<{ id: number; nome: string | null }>

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome ?? "",
    }))
  } catch (err) {
    console.error("listarComponentesDB: erro ao listar componentes:", err)
    // Mantemos o comportamento "falha => erro", igual ao Supabase (throw error)
    throw err
  }
}
