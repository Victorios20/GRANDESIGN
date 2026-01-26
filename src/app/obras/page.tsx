// app/obras/page.tsx
export const dynamic = "force-dynamic"

import ObrasClient from "./ObrasClient"
import { ssrJSON } from "@/lib/ssrFetch"

export default async function Page() {
  const [listaBairros, lista] = await Promise.all([
    ssrJSON<string[]>("/api/bairros"),
    ssrJSON<{ dados: any[]; total: number }>("/api/obras/table-search?page=1&perPage=20&ordem=desc"),
  ])

  return <ObrasClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
