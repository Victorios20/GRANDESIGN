/* ────────────────────────────────────────────────────────────────
   File: app/home/editar-materiais/page.tsx
   Server component com SSR: carrega materiais do Postgres
   e passa por props para o componente client.
───────────────────────────────────────────────────────────────── */
import { prisma } from "@/lib/prisma"
import EditarMateriaisClient, {
  type ItemBase,
} from "./EditarMateriaisClient"

export const dynamic = "force-dynamic"

async function carregarPorTipo(tipo: "geral" | "madeira" | "telha") {
  const rows = await prisma.materiais.findMany({
    where: { tipo },
    orderBy: { descricao: "asc" },
    select: { id: true, descricao: true, preco_unitario: true },
  })
  const lista: ItemBase[] = rows.map((r) => ({
    id: r.id,
    nome: r.descricao,
    preco: Number(r.preco_unitario ?? 0),
  }))
  return lista
}

export default async function Page() {
  const [materiaisGerais, madeiras, telhas] = await Promise.all([
    carregarPorTipo("geral"),
    carregarPorTipo("madeira"),
    carregarPorTipo("telha"),
  ])

  return (
    <EditarMateriaisClient
      materiaisGerais={materiaisGerais}
      madeiras={madeiras}
      telhas={telhas}
    />
  )
}
