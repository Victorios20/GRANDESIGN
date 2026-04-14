import PedidoCompraPageClient from "./_components/PedidoCompraPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

import {
  ListarResult,
  FornecedorOption,
  ObraSearchItem,
} from "@/types/pedido-compra"
import { ssrJSON } from "@/lib/ssrFetch"

function normalizeFornecedores(body: unknown): FornecedorOption[] {
  const arr = Array.isArray(body) ? body : Array.isArray((body as { data?: unknown[] } | null)?.data) ? (body as { data: unknown[] }).data : []
  return arr
    .map((fornecedor) => {
      if (typeof fornecedor !== "object" || fornecedor === null) return null
      const record = fornecedor as Record<string, unknown>
      const id = Number(record.id)
      if (!Number.isFinite(id) || id <= 0) return null
      return { id, nome: String(record.nome ?? "") }
    })
    .filter((item): item is FornecedorOption => item !== null)
}

export default async function Page() {
  const [listBody, fornBody] = await Promise.all([
    ssrJSON<{ data?: ListarResult }>("/api/pedido_compra/listar?page=1&pageSize=100"),
    ssrJSON<unknown>("/api/fornecedores"),
  ])

  const initialList: ListarResult =
    (listBody?.data as ListarResult) ?? { items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }

  const initialFornecedores = normalizeFornecedores(fornBody)

  const obraIds = Array.from(
    new Set(
      (initialList.items ?? [])
        .map((item) => Number(item?.obra_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  )

  const obraResults = await Promise.all(
    obraIds.map(async (id) => {
      const body = await ssrJSON<unknown>(`/api/obras/pesquisar?q=${encodeURIComponent(String(id))}`)
      const arr = typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown[] }).data)
        ? (body as { data: unknown[] }).data
        : Array.isArray(body)
          ? body
          : []

      const first = arr[0]
      if (typeof first !== "object" || first === null) return null

      const record = first as Record<string, unknown>
      const obra: ObraSearchItem = {
        id: Number(record.id),
        titulo: record.titulo == null ? null : String(record.titulo),
        nomeReceptor: record.nomeReceptor == null ? null : String(record.nomeReceptor),
        telefoneReceptor: record.telefoneReceptor == null ? null : String(record.telefoneReceptor),
        enderecoEntrega: record.enderecoEntrega == null ? null : String(record.enderecoEntrega),
        linkMaps: record.linkMaps == null ? null : String(record.linkMaps),
      }

      return Number.isFinite(obra.id) && obra.id > 0 ? obra : null
    })
  )

  const initialObrasById = obraResults
    .filter((obra): obra is ObraSearchItem => obra !== null)
    .reduce<Record<number, ObraSearchItem>>((acc, obra) => {
      acc[obra.id] = obra
      return acc
    }, {})

  return (
    <PedidoCompraPageClient
      initialList={initialList}
      initialFornecedores={initialFornecedores}
      initialObrasById={initialObrasById}
    />
  )
}
