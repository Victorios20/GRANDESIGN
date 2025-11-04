// middleware.ts (alterado)
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"] // "/" continua fora daqui
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

const LOGIN_PATH = "/login" // troque para "/api/auth/signin" se você NÃO tiver página /login

function isPublicAsset(pathname: string) {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_EXACT.some((p) => pathname.startsWith(p + "/")) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  )
}

function isHomePublicApi(req: NextRequest) {
  const pathname = req.nextUrl.pathname.toLowerCase()
  const method = req.method?.toUpperCase()
  if (method !== "GET") return false
  return pathname === "/api/bairros" || pathname === "/api/orcamentos"
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // bypass do SSR helper
  if (req.headers.get("x-internal-ssr") === "1") {
    return NextResponse.next()
  }

  // assets públicos
  if (isPublicAsset(pathname)) return NextResponse.next()

  // NextAuth (signin/callback etc) sempre liberado
  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  // cadastro público
  if (pathname === "/api/users" && req.method === "POST") return NextResponse.next()

  // APIs públicas da Home
  if (isHomePublicApi(req)) return NextResponse.next()

  // 🔓 LIBERAÇÃO GERAL DE LEITURA:
  // GET/HEAD/OPTIONS SEMPRE liberados (páginas e APIs)
  const method = req.method?.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next()
  }

  // 🔐 para qualquer outro método (POST/PUT/PATCH/DELETE), exige auth
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({ req, secret })

  const isApi = pathname.startsWith("/api/")
  const isLogin = pathname === LOGIN_PATH

  if (!token) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }
    if (isLogin) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.search = new URLSearchParams({ callbackUrl: pathname + search }).toString()
    return NextResponse.redirect(url)
  }

  // ... (resto das regras de roles iguais às suas)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
