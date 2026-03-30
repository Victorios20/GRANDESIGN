// src/lib/ssrFetch.ts
import { headers, cookies } from "next/headers"

/**
 * Faz fetch no SSR carregando os cookies do usuário e
 * usando a URL do próprio host (com fallback para loopback).
 */
export async function ssrJSON<T>(path: string, init?: RequestInit) {
  // monta URL absoluta a partir da própria requisição (proxy-friendly)
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost"
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")
  const baseExternal = `${proto}://${host}`
  const urlExternal = path.startsWith("http") ? path : new URL(path, baseExternal).toString()

  // cola o cookie da sessão
  const cookieHeader = (await cookies()).toString()
  const commonInit: RequestInit = {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers || {}),
      cookie: cookieHeader,
      "x-internal-ssr": "1", // sinal p/ middleware liberar
    },
  }

  const port = process.env.PORT || "3000"
  const urlLoopback = new URL(path, `http://127.0.0.1:${port}`).toString()

  let res: Response

  // 1ª tentativa: via host/proxy (público)
  try {
    res = await fetch(urlExternal, commonInit)
  } catch {
    res = await fetch(urlLoopback, commonInit)
  }

  // fallback: loopback (caso o proxy/middleware embaralhe algo)
  if (!res.ok && urlExternal !== urlLoopback) {
    res = await fetch(urlLoopback, commonInit)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`SSR fetch FAIL ${res.status} ${res.statusText} :: ${path} :: ${body.slice(0, 200)}`)
  }

  return (await res.json()) as T
}
