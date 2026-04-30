import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { isRestrictedVendedor, isVendedorAllowedPage, normalizeRoleList } from "@/lib/vendedor-access"

const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"]
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

const PUBLIC_LOGIN_PATHS = ["/login", "/esqueci-senha", "/reset-senha"]

// GET liberados (exatos)
function isExactPublicApiGet(req: NextRequest) {
  if (req.method?.toUpperCase() !== "GET") return false
  const lower = req.nextUrl.pathname.toLowerCase()
  if (lower === "/api/bairros") return true
  if (lower === "/api/orcamentos") return true
  if (lower === "/api/test-roles") return true
  return lower.startsWith("/api/orcamentos/")
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

  if (req.headers.get("x-internal-ssr") === "1") {
    return NextResponse.next()
  }

  if (isPublicAsset(pathname)) return NextResponse.next()

  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  if (pathname === "/api/users" && method === "POST") return NextResponse.next()

  if (isExactPublicApiGet(req)) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({ req, secret })

  const isApi = pathname.startsWith("/api/")
  const isPublicAuthPage = PUBLIC_LOGIN_PATHS.includes(pathname)

  if (!token || isExpired((token as { exp?: number | null }).exp)) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }

    if (isPublicAuthPage) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.search = new URLSearchParams({ callbackUrl: pathname + search }).toString()

    const res = NextResponse.redirect(url)
    clearNextAuthCookies(res)
    return res
  }

  const roles = (token as { roles?: string[] }).roles ?? []
  const rolesUpper = normalizeRoleList(roles)
  
  const canSeeAdmin = rolesUpper.includes("ADMIN") || rolesUpper.includes("DEV")

  // Bloquear acesso a páginas diferentes dos módulos permitidos para VENDEDOR
  if (isRestrictedVendedor(rolesUpper) && !isApi) {
    if (!isVendedorAllowedPage(pathname)) {
      const url = req.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  // 🔒 BLOQUEIO DE EXCLUSÃO DE ORÇAMENTO
  if (pathname === "/api/Orcamentos/excluir" && method === "PATCH") {
    if (!canSeeAdmin) {
      return new NextResponse(
        JSON.stringify({ error: "Você não tem permissão para excluir um orçamento" }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
