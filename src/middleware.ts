// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"]
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

const LOGIN_PATH = "/login"

// Só essas duas rotas GET são públicas (exatas, sem subrotas), case-insensitive
function isExactPublicApiGet(req: NextRequest) {
  if (req.method?.toUpperCase() !== "GET") return false
  const lower = req.nextUrl.pathname.toLowerCase()
  // /api/Orcamentos (com “O” maiúsculo) também passa por causa do toLowerCase()
  return lower === "/api/bairros" || lower === "/api/orcamentos"
}

function isPublicAsset(pathname: string) {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_EXACT.some((p) => pathname.startsWith(p + "/")) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  )
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const method = req.method?.toUpperCase()

  // bypass opcional p/ seu helper SSR (ssrJSON)
  if (req.headers.get("x-internal-ssr") === "1") {
    return NextResponse.next()
  }

  // assets públicos
  if (isPublicAsset(pathname)) return NextResponse.next()

  // NextAuth (signin/callback etc) sempre liberado
  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  // exemplo de endpoint público POST (se precisar)
  if (pathname === "/api/users" && method === "POST") return NextResponse.next()

  // ✅ Só estas duas APIs em GET são públicas
  if (isExactPublicApiGet(req)) return NextResponse.next()

  // ❌ Nada de “liberação geral de GET”. Daqui pra baixo tudo exige auth.
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

  // se tiver regras de role, aplique aqui

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
