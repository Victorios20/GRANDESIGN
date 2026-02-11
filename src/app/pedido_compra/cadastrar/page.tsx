import PedidoCompraForm from "@/app/pedido_compra/_components/PedidoCompraForm"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page() {
  const [madeiras, telhas, gerais, andaimes] = await Promise.all([
    prisma.materiais.findMany({
      where: { tipo: "madeira" },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true, fornecedorId: true },
    }),
    prisma.materiais.findMany({
      where: { tipo: "telha" },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true, fornecedorId: true },
    }),
    prisma.materiais.findMany({
      where: { tipo: "geral" },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true, fornecedorId: true },
    }),
    prisma.materiais.findMany({
      where: { tipo: "andaime" },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true, fornecedorId: true },
    }),
  ])

  const initialMateriaisByTipo = {
    madeira: madeiras.map((m) => ({
      id: m.id,
      descricao: m.descricao,
      tipo: m.tipo,
      preco_unitario: Number(m.preco_unitario?.toString?.() ?? 0),
      unidade_de_medida: m.unidade_de_medida ?? "un",
      fornecedorId: m.fornecedorId ?? null,
    })),
    telha: telhas.map((m) => ({
      id: m.id,
      descricao: m.descricao,
      tipo: m.tipo,
      preco_unitario: Number(m.preco_unitario?.toString?.() ?? 0),
      unidade_de_medida: m.unidade_de_medida ?? "un",
      fornecedorId: m.fornecedorId ?? null,
    })),
    geral: gerais.map((m) => ({
      id: m.id,
      descricao: m.descricao,
      tipo: m.tipo,
      preco_unitario: Number(m.preco_unitario?.toString?.() ?? 0),
      unidade_de_medida: m.unidade_de_medida ?? "un",
      fornecedorId: m.fornecedorId ?? null,
    })),
    andaime: andaimes.map((m) => ({
      id: m.id,
      descricao: m.descricao,
      tipo: m.tipo,
      preco_unitario: Number(m.preco_unitario?.toString?.() ?? 0),
      unidade_de_medida: m.unidade_de_medida ?? "un",
      fornecedorId: m.fornecedorId ?? null,
    })),
  }

  return <PedidoCompraForm mode="create" initialMateriaisByTipo={initialMateriaisByTipo} />
}
