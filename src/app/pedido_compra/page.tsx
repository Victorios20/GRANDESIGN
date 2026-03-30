import PedidoCompraPageClient from "./_components/PedidoCompraPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

import {
  ListarResult,
  FornecedorOption,
  ObraSearchItem,
} from "@/types/pedido-compra"
import { ssrJSON } from "@/lib/ssrFetch"

function normalizeFornecedores(body: any): FornecedorOption[] {
  const arr: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  return arr
    .map((f) => ({ id: Number(f?.id), nome: String(f?.nome ?? "") }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0)
}

export default async function Page() {
  const [listBody, fornBody] = await Promise.all([
    ssrJSON<{ data?: ListarResult }>("/api/pedido_compra/listar?page=1&pageSize=100"),
    ssrJSON<unknown>("/api/fornecedores"),
  ])

  const initialList: ListarResult =
    (listBody?.data as ListarResult) ?? { items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }

  const initialFornecedores: FornecedorOption[] = normalizeFornecedores(fornBody)

  const obraIds = Array.from(
    new Set(
      (initialList.items ?? [])
        .map((x) => Number(x?.obra_id))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  )

  const obraResults = await Promise.all(
    obraIds.map(async (id) => {
      const b = await ssrJSON<any>(`/api/obras/pesquisar?q=${encodeURIComponent(String(id))}`)

      const arr: any[] = Array.isArray(b?.data) ? b.data : Array.isArray(b) ? b : []
      const first = arr?.[0]
      if (!first) return null

      const mapped: ObraSearchItem = {
        id: Number(first?.id),
        titulo: first?.titulo == null ? null : String(first.titulo),
        nomeReceptor: first?.nomeReceptor == null ? null : String(first.nomeReceptor),
        telefoneReceptor: first?.telefoneReceptor == null ? null : String(first.telefoneReceptor),
        enderecoEntrega: first?.enderecoEntrega == null ? null : String(first.enderecoEntrega),
        linkMaps: first?.linkMaps == null ? null : String(first.linkMaps),
      }

      return Number.isFinite(mapped.id) && mapped.id > 0 ? mapped : null
    })
  )

  const obraById = obraResults
    .filter(Boolean)
    .reduce((acc, o) => {
      acc[(o as ObraSearchItem).id] = o as ObraSearchItem
      return acc
    }, {} as Record<number, ObraSearchItem>)

  return (
    <PedidoCompraPageClient
      initialList={initialList}
      initialFornecedores={initialFornecedores}
      initialObrasById={obraById}
    />
  )
}
