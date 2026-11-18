import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"
import { parseJson, loginSchema } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJson(req, loginSchema)
    if ("response" in parsed) return parsed.response
    const { email, password } = parsed.data

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
