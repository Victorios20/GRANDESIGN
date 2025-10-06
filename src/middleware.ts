import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"]
const PUBLIC_PREFIX = ["/_next", "/assets", "/images", "/public"]

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_EXACT.some((p) => pathname.startsWith(p + "/")) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
  ) return NextResponse.next()

  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  const token = await getToken({ req, secret })

  const isLogin = pathname === "/login"
  const isApi = pathname.startsWith("/api/")

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

  if (isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|public).*)"],
}
