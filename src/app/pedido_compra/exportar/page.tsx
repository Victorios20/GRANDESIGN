import { notFound } from "next/navigation"

import { PedidoCompraExportActions } from "./_components/PedidoCompraExportActions"
import { PedidoCompraPrintDocument } from "./_components/PedidoCompraPrintDocument"

import { prisma } from "@/lib/prisma"

type SearchParams = Promise<{ ids?: string }>

function parseIds(raw: string | undefined) {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  )
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { ids: rawIds } = await searchParams
  const ids = parseIds(rawIds)

  if (ids.length === 0) {
    notFound()
  }

  const pedidos = await prisma.pedido_compra.findMany({
    where: { id: { in: ids } },
    include: {
      obra: {
        include: {
          cliente: {
            include: { cidades: true },
          },
        },
      },
      itens: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantidade: true,
          descricao: true,
          tamanho: true,
          componente: true,
        },
      },
    },
    orderBy: { id: "asc" },
  })

  if (pedidos.length === 0) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PedidoCompraExportActions />

      <header className="space-y-2 border-b border-slate-200 pb-4 print:pb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pedidos de Compra</h1>
        <p className="text-sm text-slate-600">
          {pedidos.length} {pedidos.length === 1 ? "pedido neste documento" : "pedidos neste documento"}
        </p>
      </header>

      <section className="space-y-6">
        {pedidos.map((pedido) => (
          <PedidoCompraPrintDocument
            key={pedido.id}
            pedido={{
              id: pedido.id,
              obraId: pedido.obra_id,
              titulo: pedido.descricao,
              categoria: String(pedido.categoria),
              obraTitulo: pedido.obra?.titulo ?? null,
              clienteNome: pedido.nome_receptor || pedido.obra?.cliente?.nome || null,
              clienteTelefone: pedido.telefone_receptor || pedido.obra?.cliente?.telefone || null,
              bairro: pedido.obra?.cliente?.bairro ?? null,
              cidade: pedido.obra?.cliente?.cidades?.nome ?? null,
              rua: pedido.endereco_entrega || pedido.obra?.endereco_obra || null,
              mapsUrl: pedido.link_maps || pedido.obra?.maps_url || null,
              observacoes: pedido.observacoes ?? null,
              itens: (pedido.itens ?? []).map((item) => ({
                id: item.id,
                quantidade: item.quantidade?.toString?.() ?? null,
                descricao: item.descricao,
                tamanho: item.tamanho?.toString?.() ?? null,
                componente: item.componente,
              })),
            }}
          />
        ))}
      </section>
    </main>
  )
}
