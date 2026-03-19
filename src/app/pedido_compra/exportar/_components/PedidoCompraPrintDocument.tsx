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
  const isMadeira = pedido.categoria.toUpperCase().includes("MADEIRA")

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 p-5 print:break-inside-avoid print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Solicitação de Materiais
          </h2>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="font-mono">{formatPedidoId(pedido.id, pedido.obraId)}</span>
            <span>•</span>
            <span>{hasValue(pedido.titulo) ? pedido.titulo : "Sem descrição"}</span>
          </div>
        </div>
        <div className="text-right text-xs font-medium text-slate-500">
          <div className="uppercase tracking-wider">#{pedido.obraId}</div>
          <div>{pedido.categoria}</div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div className="font-semibold uppercase text-xs text-slate-500 tracking-tight">Dados de Entrega / Cliente</div>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <div><span className="font-medium text-slate-500">Cliente:</span> {pedido.clienteNome || "—"}</div>
            <div><span className="font-medium text-slate-500">Telefone:</span> {pedido.clienteTelefone || "—"}</div>
            <div><span className="font-medium text-slate-500">Bairro:</span> {pedido.bairro || "—"}</div>
            <div><span className="font-medium text-slate-500">Cidade:</span> {pedido.cidade || "—"}</div>
          </div>
          <div><span className="font-medium text-slate-500">Obra:</span> {pedido.obraId ? `#${pedido.obraId} • ` : ""}{pedido.obraTitulo || "—"}</div>
          <div><span className="font-medium text-slate-500">Endereço/Rua:</span> {pedido.rua || "—"}</div>
          
          {mapsUrl && (
            <div className="mt-1">
              <span className="font-medium text-slate-500">Maps: </span>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                {mapsUrl}
              </Link>
            </div>
          )}
        </div>

        {hasValue(pedido.observacoes) && (
          <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900 mb-1 uppercase text-xs tracking-wider">Observações</div>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{pedido.observacoes}</div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Itens</h3>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b">
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
                  <td colSpan={isMadeira ? 4 : 2} className="px-3 py-4 text-center text-slate-400 italic">
                    Nenhum item listado.
                  </td>
                </tr>
              ) : (
                pedido.itens.map((item) => (
                  <tr key={item.id} className="align-top">
                    {isMadeira ? (
                      <>
                        <td className="px-3 py-2 text-slate-700">{item.componente || "—"}</td>
                        <td className="px-3 py-2 text-slate-800 font-medium">{item.descricao || "—"}</td>
                        <td className="px-3 py-2 text-slate-700 font-medium">{item.quantidade || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{item.tamanho ? `${item.tamanho}m` : "—"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">
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
