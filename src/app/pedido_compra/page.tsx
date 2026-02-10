import PedidoCompraPageClient from "./_components/PedidoCompraPageClient"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"
export const revalidate = 0

type PedidoCategoria = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES"
type PedidoStatus =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "EM_COMPRA"
  | "AGUARDANDO_PAGAMENTO"
  | "AGUARDANDO_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO"

type PedidoCompraListItem = {
  id: number
  descricao: string | null
  categoria: PedidoCategoria
  status: PedidoStatus
  valor_orcado: string | number | null
  valor_realizado: string | number | null
  data_entrega: string | null
  fornecedor: { id: number; nome: string } | null
  obra_id: number
  obra_status: string | null
  created_at: string
}

type ListarResult = {
  items: PedidoCompraListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type FornecedorOption = { id: number; nome: string }

type ObraSearchItem = {
  id: number
  titulo: string | null
  nomeReceptor: string | null
  telefoneReceptor: string | null
  enderecoEntrega: string | null
  linkMaps: string | null
}

async function getBaseUrl() {
  const h = await headers()
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return "http://localhost:3000"
  return `${proto}://${host}`
}

async function safeJson(res: Response) {
  return res.json().catch(() => null)
}

function normalizeFornecedores(body: any): FornecedorOption[] {
  const arr: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  return arr
    .map((f) => ({ id: Number(f?.id), nome: String(f?.nome ?? "") }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0)
}

export default async function Page() {
  const baseUrl = await getBaseUrl()

  const h = await headers()
  const cookie = h.get("cookie") ?? ""
  const authorization = h.get("authorization") ?? ""

  const forwardHeaders: Record<string, string> = {}
  if (cookie) forwardHeaders.cookie = cookie
  if (authorization) forwardHeaders.authorization = authorization

  const [listRes, fornRes] = await Promise.all([
    fetch(`${baseUrl}/api/pedido_compra/listar?page=1&pageSize=100`, {
      cache: "no-store",
      headers: forwardHeaders,
    }),
    fetch(`${baseUrl}/api/fornecedores`, {
      cache: "no-store",
      headers: forwardHeaders,
    }),
  ])

  const listBody = await safeJson(listRes)
  const fornBody = await safeJson(fornRes)

  console.log("[PedidoCompra/Page] baseUrl:", baseUrl)
  console.log("[PedidoCompra/Page] list status:", listRes.status, listRes.statusText)
  console.log("[PedidoCompra/Page] forn status:", fornRes.status, fornRes.statusText)
  console.log("[PedidoCompra/Page] RAW listBody JSON:\n", JSON.stringify(listBody, null, 2))
  console.log("[PedidoCompra/Page] RAW fornBody JSON:\n", JSON.stringify(fornBody, null, 2))

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
      const r = await fetch(`${baseUrl}/api/obras/pesquisar?q=${encodeURIComponent(String(id))}`, {
        cache: "no-store",
        headers: forwardHeaders,
      })
      const b = await safeJson(r)

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
