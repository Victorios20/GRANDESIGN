// app/page.tsx (SERVER COMPONENT)
export const dynamic = "force-dynamic"

import HomeClient from "./OrcamentoClient"
import { ssrJSON } from "@/lib/ssrFetch"

export default async function Page() {
  const [listaBairros, lista] = await Promise.all([
    ssrJSON<string[]>("/api/bairros"),
    // usa "ordem" (asc|desc), não "ordenarData"
    ssrJSON<{ dados: any[]; total: number }>("/api/Orcamentos?perPage=10&ordem=desc"),
  ])

  return <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
