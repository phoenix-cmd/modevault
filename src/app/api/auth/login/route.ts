import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"
import { parseJson, loginSchema, checkRateLimit, getClientKey } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientKey(req)
    const ipLimit = checkRateLimit(`login:ip:${clientIp}`, 20, 60_000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      )
    }

    const parsed = await parseJson(req, loginSchema)
    if ("response" in parsed) return parsed.response
    const { email, password } = parsed.data

    const accountLimit = checkRateLimit(`login:acct:${email}`, 10, 60_000)
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts for this account. Please try again later." },
        { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSec) } }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await signSession(user.id)
    const response = NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name },
    })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (err: unknown) {
    logger.error("Login failed", errorContext(err))
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
