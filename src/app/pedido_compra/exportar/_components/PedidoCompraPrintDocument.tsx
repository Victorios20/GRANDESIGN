import Link from "next/link"

import { formatPedidoId } from "@/lib/pedido-compra-utils"

type PedidoItemPrint = {
  id: number
  quantidade: string | null
  descricao: string | null
  tamanho: string | null
  componente: string | null
}

type PedidoPrint = {
  id: number
  obraId: number
  titulo: string | null
  categoria: string
  obraTitulo: string | null
  clienteNome: string | null
  clienteTelefone: string | null
  bairro: string | null
  cidade: string | null
  rua: string | null
  mapsUrl: string | null
  observacoes: string | null
  itens: PedidoItemPrint[]
}

function hasValue(value: string | number | null | undefined) {
  return !!String(value ?? "").trim()
}

function renderItemSummary(item: PedidoItemPrint) {
  const parts = [item.componente, item.descricao].filter(hasValue)
  const summary = parts.join(" - ")

  if (hasValue(item.tamanho)) {
    return `${summary || "Item sem descricao"} (${item.tamanho}m)`
  }

  return summary || "Item sem descricao"
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!hasValue(value)) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-5 text-foreground">{value}</div>
    </div>
  )
}

export function PedidoCompraPrintDocument({ pedido }: { pedido: PedidoPrint }) {
  const mapsUrl = hasValue(pedido.mapsUrl) ? String(pedido.mapsUrl) : null

  return (
    <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:break-inside-avoid print:rounded-none print:border-slate-300 print:p-5 print:shadow-none">
      <header className="space-y-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pedido de compra
            </div>
            <h2 className="font-mono text-lg font-semibold text-slate-900">
              {formatPedidoId(pedido.id, pedido.obraId)}
            </h2>
            <div className="text-base font-medium text-slate-900">
              {hasValue(pedido.titulo) ? pedido.titulo : "Pedido sem titulo"}
            </div>
          </div>

          <div className="min-w-44 space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <InfoRow label="Obra" value={pedido.obraTitulo} />
            <InfoRow label="Categoria" value={pedido.categoria} />
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dados operacionais
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Cliente" value={pedido.clienteNome} />
            <InfoRow label="Telefone" value={pedido.clienteTelefone} />
            <InfoRow label="Bairro" value={pedido.bairro} />
            <InfoRow label="Cidade" value={pedido.cidade} />
          </div>

          <InfoRow label="Rua" value={pedido.rua} />

          {mapsUrl ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Google Maps
              </div>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-slate-700 underline underline-offset-2"
              >
                {mapsUrl}
              </Link>
            </div>
          ) : null}
        </div>

        {hasValue(pedido.observacoes) ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Observacoes
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {pedido.observacoes}
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Itens
          </div>
          <div className="text-xs text-slate-500">{pedido.itens.length} item(ns)</div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="w-20 px-3 py-2 text-left font-semibold">Qtd</th>
                <th className="px-3 py-2 text-left font-semibold">Resumo</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                    Nenhum item listado.
                  </td>
                </tr>
              ) : (
                pedido.itens.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-3 text-slate-700">
                      {hasValue(item.quantidade) ? item.quantidade : "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-800">{renderItemSummary(item)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  )
}
