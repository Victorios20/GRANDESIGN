// app/page.tsx  (SERVER COMPONENT)
import { headers } from "next/headers"
import HomeClient from "./HomeClient"

async function fetchJSON<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" }) // primeira dobra sempre “ao vivo”
  if (!res.ok) throw new Error(`Falha em ${url}`)
  return res.json() as Promise<T>
}

export default async function Page() {
  const hdrs = await headers() // <— aqui o await corrige o TS
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000"
  const proto = hdrs.get("x-forwarded-proto") ?? "http"
  const base = `${proto}://${host}`

  // chame as MESMAS rotas que você já usa no cliente, em paralelo:
  const [listaBairros, lista] = await Promise.all([
    fetchJSON<string[]>(`${base}/api/bairros`),
    fetchJSON<{ dados: any[]; total: number }>(`${base}/api/Orcamentos?perPage=10&ordenarData=desc`),
  ])

  return <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
