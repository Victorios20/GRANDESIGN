"use client"

import { PedidoCompraSummaryModal } from "@/components/pedido-compra/PedidoCompraSummaryModal"

import type { PedidoCompraVM } from "./types"

type Props = {
  pedido: PedidoCompraVM
  obraId: number | null
  onClose: () => void
  onEdit: (pedidoId: number) => void
  onMutationComplete?: () => void | Promise<void>
}

function mapInitialData(pedido: PedidoCompraVM, obraId: number | null) {
  return {
    id: Number(pedido.id ?? 0),
    obraId: pedido.obraId ?? obraId ?? null,
    descricao: pedido.descricao ?? pedido.observacoes ?? null,
    categoria: pedido.categoria,
    status: pedido.status,
    fornecedorNome: pedido.fornecedorNome ?? null,
    valorOrcado: pedido.valorOrcado ?? null,
    valorRealizado: pedido.valorRealizado ?? null,
    dataEntrega: pedido.dataEntrega ?? null,
    integrado: pedido.integrado ?? false,
  }
}

export function PedidoCompraDetailsModal({ pedido, obraId, onClose, onEdit, onMutationComplete }: Props) {
  const pedidoId = Number(pedido.id ?? 0)

  return (
    <PedidoCompraSummaryModal
      open
      pedidoId={pedidoId > 0 ? pedidoId : null}
      obraId={pedido.obraId ?? obraId ?? null}
      initialData={mapInitialData(pedido, obraId)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      onEdit={onEdit}
      onMutationComplete={onMutationComplete}
    />
  )
}
