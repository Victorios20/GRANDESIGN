import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"]
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

const LOGIN_PATH = "/login"

// GET liberados (exatos)
function isExactPublicApiGet(req: NextRequest) {
  if (req.method?.toUpperCase() !== "GET") return false
  const lower = req.nextUrl.pathname.toLowerCase()
  return lower === "/api/bairros" || lower === "/api/orcamentos"
}

function isPublicAsset(pathname: string) {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_EXACT.some((p) => pathname.startsWith(p + "/")) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  )
}

function isExpired(exp?: number | null) {
  if (!exp || typeof exp !== "number") return false
  return exp * 1000 < Date.now()
}

function clearNextAuthCookies(res: NextResponse) {
  // Nomes possíveis de cookies do NextAuth (dev/prod, secure/não-secure)
  const names = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "next-auth.callback-url",
    "__Secure-next-auth.csrf-token",
    "next-auth.csrf-token",
  ]
  for (const name of names) {
    res.cookies.set(name, "", { path: "/", httpOnly: true, secure: true, expires: new Date(0) })
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const method = req.method?.toUpperCase()

  // bypass opcional p/ SSR helper
  if (req.headers.get("x-internal-ssr") === "1") {
    return NextResponse.next()
  }

  // assets públicos
  if (isPublicAsset(pathname)) return NextResponse.next()

  // NextAuth (signin/callback etc) sempre liberado
  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  // exemplo de endpoint público POST (se precisar)
  if (pathname === "/api/users" && method === "POST") return NextResponse.next()

  // GET públicos exatos
  if (isExactPublicApiGet(req)) return NextResponse.next()

  // Daqui pra baixo: tudo exige auth
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({ req, secret })

  const isApi = pathname.startsWith("/api/")
  const isLogin = pathname === LOGIN_PATH

  // Sem token ou token expirado => trata como não autenticado
  if (!token || isExpired((token as any).exp)) {
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

    const res = NextResponse.redirect(url)
    clearNextAuthCookies(res)
    return res
  }

  // Se quiser checar roles, faça aqui com base no token
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
