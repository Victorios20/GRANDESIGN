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

export function PedidoCompraPrintDocument({ pedido }: { pedido: PedidoPrint }) {
  const mapsUrl = hasValue(pedido.mapsUrl) ? String(pedido.mapsUrl) : null
  const isMadeira = pedido.categoria.toUpperCase().includes("MADEIRA")

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 print:break-inside-avoid print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            {pedido.categoria}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-mono">{formatPedidoId(pedido.id, pedido.obraId)}</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-900">
              {hasValue(pedido.titulo) ? pedido.titulo : "Sem descricao"}
            </span>
          </div>
        </div>

        <div className="text-right text-xs">
          <div className="uppercase tracking-[0.18em] text-slate-500">Obra</div>
          <div className="mt-1 font-mono font-medium text-slate-900">#{pedido.obraId}</div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2.5 rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            Dados de Entrega / Cliente
          </div>

          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <div><span className="font-medium text-slate-600">Cliente:</span> {pedido.clienteNome || "-"}</div>
            <div><span className="font-medium text-slate-600">Telefone:</span> {pedido.clienteTelefone || "-"}</div>
            <div><span className="font-medium text-slate-600">Bairro:</span> {pedido.bairro || "-"}</div>
            <div><span className="font-medium text-slate-600">Cidade:</span> {pedido.cidade || "-"}</div>
          </div>

          <div>
            <span className="font-medium text-slate-600">Obra:</span>{" "}
            {pedido.obraId ? `#${pedido.obraId} - ` : ""}
            {pedido.obraTitulo || "-"}
          </div>

          <div><span className="font-medium text-slate-600">Endereco/Rua:</span> {pedido.rua || "-"}</div>

          {mapsUrl ? (
            <div className="mt-1">
              <span className="font-medium text-slate-600">Maps: </span>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-slate-700 underline decoration-slate-400 underline-offset-2"
              >
                {mapsUrl}
              </Link>
            </div>
          ) : null}
        </div>

        {hasValue(pedido.observacoes) ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Observacoes
            </div>
            <div className="whitespace-pre-wrap leading-relaxed text-slate-600">{pedido.observacoes}</div>
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Itens</h3>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-200">
                {isMadeira ? (
                  <>
                    <th className="px-3 py-2 text-left font-semibold">Componente</th>
                    <th className="px-3 py-2 text-left font-semibold">Madeira</th>
                    <th className="w-20 px-3 py-2 text-left font-semibold">Qtd</th>
                    <th className="w-20 px-3 py-2 text-left font-semibold">Tam</th>
                  </>
                ) : (
                  <>
                    <th className="w-20 px-3 py-2 text-left font-semibold">Qtd</th>
                    <th className="px-3 py-2 text-left font-semibold">Resumo</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pedido.itens.length === 0 ? (
                <tr>
                  <td colSpan={isMadeira ? 4 : 2} className="px-3 py-4 text-center italic text-slate-400">
                    Nenhum item listado.
                  </td>
                </tr>
              ) : (
                pedido.itens.map((item) => (
                  <tr key={item.id} className="align-top">
                    {isMadeira ? (
                      <>
                        <td className="px-3 py-2 text-slate-700">{item.componente || "-"}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{item.descricao || "-"}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">{item.quantidade || "-"}</td>
                        <td className="px-3 py-2 text-slate-700">{item.tamanho ? `${item.tamanho}m` : "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">
                          {hasValue(item.quantidade) ? item.quantidade : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-800">{renderItemSummary(item)}</td>
                      </>
                    )}
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
