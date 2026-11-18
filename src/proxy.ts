import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/", "/register", "/login", "/api/auth", "/api/health", "/_next", "/favicon.ico"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Root landing page, register, login, auth APIs and static assets are public
  if (
    pathname === "/" ||
    PUBLIC_PATHS.some((path) => path !== "/" && pathname.startsWith(path))
  ) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get("mv_session")?.value)
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
