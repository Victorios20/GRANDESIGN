/* ────────────────────────────────────────────────────────────────
   File: app/home/editar-materiais/page.tsx
   Server component com SSR:
   - Carrega Materiais por tipo (geral, madeira, telha)
   - Carrega Componentes
   - Passa tudo via props para o componente client
───────────────────────────────────────────────────────────────── */
import { prisma } from "@/lib/prisma"
import EditarMateriaisClient, {
  type ItemBase,
  type ComponenteItem,
} from "./EditarMateriaisClient"

export const dynamic = "force-dynamic"

async function carregarMateriaisPorTipo(
  tipo: "geral" | "madeira" | "telha"
): Promise<ItemBase[]> {
  const rows = await prisma.materiais.findMany({
    where: { tipo },
    orderBy: { descricao: "asc" },
    select: { id: true, descricao: true, preco_unitario: true },
  })
  return rows.map((r) => ({
    id: r.id,
    nome: r.descricao,
    preco: Number(r.preco_unitario ?? 0),
  }))
}

async function carregarComponentes(): Promise<ComponenteItem[]> {
  const rows = await prisma.componentes.findMany({
    orderBy: { id: "asc" },
    select: { id: true, nome: true },
  })
  return rows.map((r) => ({ id: r.id, nome: r.nome }))
}

export default async function Page() {
  const [materiaisGerais, madeiras, telhas, componentes] = await Promise.all([
    carregarMateriaisPorTipo("geral"),
    carregarMateriaisPorTipo("madeira"),
    carregarMateriaisPorTipo("telha"),
    carregarComponentes(),
  ])

  return (
    <EditarMateriaisClient
      materiaisGerais={materiaisGerais}
      madeiras={madeiras}
      telhas={telhas}
      componentes={componentes}
    />
  )
}
