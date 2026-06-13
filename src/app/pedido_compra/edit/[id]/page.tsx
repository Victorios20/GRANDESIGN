import { notFound } from "next/navigation"
import PedidoCompraForm from "@/app/pedido_compra/_components/PedidoCompraForm"
import { fromDateOnlyDb } from "@/lib/date-only"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pedidoCompraId = Number(id)

  if (!Number.isFinite(pedidoCompraId) || pedidoCompraId <= 0) notFound()

  const [pedido, fornecedores, madeiras, telhas, gerais, andaimes, componentes] = await Promise.all([
    prisma.pedido_compra.findUnique({
      where: { id: pedidoCompraId },
      include: {
        fornecedor: { select: { id: true, nome: true, tipo: true } },
        contas_pagar: {
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, status: true, valor_total: true, valor_pago: true },
        },
        itens: true,
      },
    }),
    prisma.fornecedores.findMany({
      select: { id: true, nome: true, tipo: true },
      orderBy: { nome: "asc" },
    }),
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
    prisma.componentes.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ])

  if (!pedido) notFound()

  const initialData = {
    id: pedido.id,
    obra_id: pedido.obra_id,
    categoria: pedido.categoria,
    status: pedido.status,
    valor_orcado: pedido.valor_orcado?.toString?.() ?? null,
    valor_pedido: (
      (pedido.itens ?? []).reduce((acc, item) => acc + Number(item.total ?? 0), 0) + Number(pedido.frete ?? 0)
    ).toFixed(2),
    valor_realizado: pedido.valor_realizado?.toString?.() ?? null,
    frete: pedido.frete?.toString?.() ?? null,
    descricao: pedido.descricao ?? null,
    observacoes: pedido.observacoes ?? null,
    nao_previsto: pedido.nao_previsto ?? false,
    motivo_extra: pedido.motivo_extra ?? null,
    fornecedor_id: pedido.fornecedor_id ?? null,
    financeiro_integracao_status: pedido.financeiro_integracao_status,
    financeiro_integrado_em: pedido.financeiro_integrado_em?.toISOString?.() ?? null,
    financeiro_estornado_em: pedido.financeiro_estornado_em?.toISOString?.() ?? null,
    financeiro_conta_pagar_id: pedido.contas_pagar?.[0]?.id ?? null,
    financeiro_conta_pagar_status: pedido.contas_pagar?.[0]?.status ?? null,
    financeiro_conta_pagar_valor_total: pedido.contas_pagar?.[0]?.valor_total?.toString?.() ?? null,
    financeiro_conta_pagar_valor_pago: pedido.contas_pagar?.[0]?.valor_pago?.toString?.() ?? null,
    data_entrega: fromDateOnlyDb(pedido.data_entrega),
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
      componente: i.componente ?? null,
      created_at: i.created_at ? i.created_at.toISOString() : null,
      updated_at: i.updated_at ? i.updated_at.toISOString() : null,
    })),
  }

  const initialFornecedores = fornecedores.map((f) => ({ id: f.id, nome: f.nome }))
  const initialFornecedoresRaw = fornecedores.map((f) => ({ id: f.id, nome: f.nome, tipo: f.tipo ?? null }))
  const isFinanceLocked = pedido.financeiro_integracao_status === "INTEGRADO"

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

  return (
    <PedidoCompraForm
      mode={isFinanceLocked ? "view" : "edit"}
      pedidoCompraId={pedidoCompraId}
      initialData={initialData}
      initialFornecedores={initialFornecedores}
      initialFornecedoresRaw={initialFornecedoresRaw}
      initialMateriaisByTipo={initialMateriaisByTipo}
      initialComponentes={componentes}
      lockedMessage={isFinanceLocked ? "Pedido integrado ao financeiro. Estorne a integração para liberar edição." : null}
      disableEditAction={isFinanceLocked}
      financeiroIntegracaoStatus={pedido.financeiro_integracao_status}
    />
  )
}
