// app/page.tsx  (SERVER COMPONENT)
import { headers, cookies } from "next/headers"
import HomeClient from "./HomeClient"

async function fetchJSON<T>(url: string, init?: RequestInit) {
  const reqInit: RequestInit = { cache: "no-store", ...(init || {}) }

  // No SSR, precisamos enviar os cookies da sessão para passar pelo middleware/API protegida
  if (typeof window === "undefined") {
    const cookieHeader = cookies().toString()
    reqInit.headers = { ...(reqInit.headers || {}), cookie: cookieHeader }
  }

  const res = await fetch(url, reqInit)
  if (!res.ok) throw new Error(`Falha em ${url}`)
  return res.json() as Promise<T>
}

export default async function Page() {
  // Mantemos o await porque no seu setup headers() está como Promise
  const hdrs = await headers()
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000"
  const proto = hdrs.get("x-forwarded-proto") ?? "http"
  const base = `${proto}://${host}`

  // mesmas rotas do cliente, agora com cookies no SSR
  const [listaBairros, lista] = await Promise.all([
    fetchJSON<string[]>(`${base}/api/bairros`),
    fetchJSON<{ dados: any[]; total: number }>(`${base}/api/Orcamentos?perPage=10&ordenarData=desc`),
  ])

  return <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
}
