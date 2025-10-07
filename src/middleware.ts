import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_EXACT = ["/", "/favicon.ico", "/robots.txt", "/sitemap.xml"]
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

function isPublicAsset(pathname: string) {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_EXACT.some((p) => pathname.startsWith(p + "/")) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  )
}

// APIs públicas da Home (somente GET)
function isHomePublicApi(req: NextRequest) {
  const pathname = req.nextUrl.pathname.toLowerCase()
  const method = req.method?.toUpperCase()
  if (method !== "GET") return false
  return pathname === "/api/bairros" || pathname === "/api/orcamentos"
}

// util para normalizar roles -> UPPERCASE
function rolesUpper(token: unknown): string[] {
  const raw = (token as any)?.roles ?? []
  return Array.isArray(raw) ? raw.map((r) => String(r).toUpperCase()) : []
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Assets e páginas públicas
  if (isPublicAsset(pathname)) return NextResponse.next()

  // Home é pública
  if (pathname === "/") return NextResponse.next()

  // NextAuth
  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  // Cadastro público (visitante)
  if (pathname === "/api/users" && req.method === "POST") return NextResponse.next()

  // APIs da Home liberadas (GET /api/bairros e GET /api/orcamentos)
  if (isHomePublicApi(req)) return NextResponse.next()

  // Auth
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({ req, secret })

  const isApi = pathname.startsWith("/api/")
  const isLogin = pathname === "/login"

  // Sem token
  if (!token) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }
    if (isLogin) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.search = new URLSearchParams({ callbackUrl: pathname + search }).toString()
    return NextResponse.redirect(url)
  }

  // Com token: verificar roles
  const roles = rolesUpper(token)
  const isVisitor = roles.includes("VISITANTE")
  const isAdminOrDev = roles.includes("ADMIN") || roles.includes("DEV")
  const isVendedor = roles.includes("VENDEDOR")

  // Usuário logado não acessa /login
  if (isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // Visitante: só Home e APIs públicas da Home (+ POST /api/users)
  if (isVisitor) {
    if (isApi) {
      const p = pathname.toLowerCase()
      const m = req.method?.toUpperCase()
      if (isHomePublicApi(req) || (p === "/api/users" && m === "POST")) {
        return NextResponse.next()
      }
      return new NextResponse(JSON.stringify({ error: "forbidden_for_visitor" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      })
    }
    if (pathname === "/") return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // Painel admin: só ADMIN e DEV
  if (pathname.startsWith("/admin")) {
    if (!isAdminOrDev) {
      const url = req.nextUrl.clone()
      url.pathname = "/"
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  // Fora do /admin:
  // - ADMIN e DEV: liberado
  // - VENDEDOR: liberado
  // (apenas VISITANTE já foi tratado acima)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
