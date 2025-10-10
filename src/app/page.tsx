// app/page.tsx (SERVER COMPONENT)
export const dynamic = "force-dynamic"

import { headers, cookies } from "next/headers"
import HomeClient from "./HomeClient"

async function fetchJSON<T>(path: string, base: string, init?: RequestInit) {
  const url = path.startsWith("http") ? path : new URL(path, base).toString()
  const cookieHeader = (await cookies()).toString()

  const reqInit: RequestInit = {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers || {}),
      cookie: cookieHeader,
    },
  }

  const res = await fetch(url, reqInit)
  if (!res.ok) throw new Error(`Falha em ${url}`)
  return res.json() as Promise<T>
}

export default async function Page() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")
  const base = `${proto}://${host}`

  const [listaBairros, lista] = await Promise.all([
    fetchJSON<string[]>("/api/bairros", base),
    fetchJSON<{ dados: any[]; total: number }>(
      "/api/Orcamentos?perPage=10&ordenarData=desc",
      base
    ),
  ])

  return (
    <HomeClient initial={{ listaBairros, dados: lista.dados, total: lista.total }} />
  )
}
