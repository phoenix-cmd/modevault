import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionSignatureOnly } from "@/lib/auth"

const PUBLIC_EXACT_PATHS = new Set(["/", "/login", "/register", "/favicon.ico", "/api/health"])
const PUBLIC_PREFIX_PATHS = ["/api/auth/", "/_next/"]
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (pathname === "/api/auth") return true
  return PUBLIC_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix))
}

function isValidSameOriginMutation(request: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) return true

  const secFetchSite = request.headers.get("sec-fetch-site")
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return false
  }

  const origin = request.headers.get("origin")
  if (origin) {
    try {
      const originUrl = new URL(origin)
      const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host
      if (originUrl.host !== hostHeader && originUrl.host !== request.nextUrl.host) {
        return false
      }
    } catch {
      return false
    }
  }

  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isValidSameOriginMutation(request)) {
    return NextResponse.json({ data: null, error: "Forbidden: cross-origin state-changing request blocked" }, { status: 403 })
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get("mv_session")?.value
  const verified = token ? verifySessionSignatureOnly(token) : null

  if (!verified) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
