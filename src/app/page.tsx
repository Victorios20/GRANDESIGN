// app/page.tsx (SERVER COMPONENT)
export const dynamic = "force-dynamic"

import HomeClient from "./HomeClient"
import { ssrJSON } from "@/lib/ssrFetch"

export default async function Page() {
  const [listaBairros, lista] = await Promise.all([
    ssrJSON<string[]>("/api/bairros"),
    ssrJSON<{ dados: any[]; total: number }>("/api/Orcamentos?perPage=10&ordenarData=desc"),
  ])

  return <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
