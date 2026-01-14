import { notFound } from "next/navigation"
import PedidoCompraForm from "@/app/pedido_compra/_components/PedidoCompraForm"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pedidoCompraId = Number(id)

  if (!Number.isFinite(pedidoCompraId) || pedidoCompraId <= 0) notFound()

  const [pedido, fornecedores] = await Promise.all([
    prisma.pedido_compra.findUnique({
      where: { id: pedidoCompraId },
      include: {
        fornecedor: { select: { id: true, nome: true, tipo: true } },
        itens: true,
      },
    }),
    prisma.fornecedores.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ])

  if (!pedido) notFound()

  const initialData = {
    id: pedido.id,
    obra_id: pedido.obra_id,
    categoria: pedido.categoria,
    status: pedido.status,
    valor_orcado: pedido.valor_orcado?.toString?.() ?? null,
    valor_realizado: pedido.valor_realizado?.toString?.() ?? null,
    frete: pedido.frete?.toString?.() ?? null,
    descricao: pedido.descricao ?? null,
    observacoes: pedido.observacoes ?? null,
    fornecedor_id: pedido.fornecedor_id ?? null,
    data_entrega: pedido.data_entrega ? pedido.data_entrega.toISOString() : null,
    endereco_entrega: pedido.endereco_entrega ?? null,
    nome_receptor: pedido.nome_receptor ?? null,
    telefone_receptor: pedido.telefone_receptor ?? null,
    link_maps: pedido.link_maps ?? null,
    created_at: pedido.created_at ? pedido.created_at.toISOString() : null,
    updated_at: pedido.updated_at ? pedido.updated_at.toISOString() : null,
    fornecedor: pedido.fornecedor
      ? { id: pedido.fornecedor.id, nome: pedido.fornecedor.nome, tipo: pedido.fornecedor.tipo ?? null }
      : null,
    itens: (pedido.itens ?? []).map((i) => ({
      id: i.id,
      pedido_compra_id: i.pedido_compra_id,
      descricao: i.descricao ?? "",
      quantidade: i.quantidade?.toString?.() ?? "0",
      tamanho: i.tamanho == null ? null : i.tamanho?.toString?.(),
      preco_unitario: i.preco_unitario?.toString?.() ?? "0",
      total: i.total?.toString?.() ?? "0",
      created_at: i.created_at ? i.created_at.toISOString() : null,
      updated_at: i.updated_at ? i.updated_at.toISOString() : null,
    })),
  }

  const initialFornecedores = fornecedores.map((f) => ({ id: f.id, nome: f.nome }))

  return (
    <PedidoCompraForm
      mode="edit"
      pedidoCompraId={pedidoCompraId}
      initialData={initialData}
      initialFornecedores={initialFornecedores}
    />
  )
}
