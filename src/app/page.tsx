// app/page.tsx (SERVER COMPONENT)
export const dynamic = "force-dynamic" // garante renderização no runtime

import HomeClient from "./HomeClient"

async function fetchJSON<T>(url: string, init?: RequestInit) {
  const reqInit: RequestInit = { cache: "no-store", ...(init || {}) }
  const res = await fetch(url, reqInit)
  if (!res.ok) throw new Error(`Falha em ${url}`)
  return res.json() as Promise<T>
}

export default async function Page() {
  const [listaBairros, lista] = await Promise.all([
    fetchJSON<string[]>("/api/bairros"),
    fetchJSON<{ dados: any[]; total: number }>("/api/Orcamentos?perPage=10&ordenarData=desc"),
  ])

  return <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
