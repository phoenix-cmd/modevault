import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"
import { parseJson, registerSchema, checkRateLimit, getClientKey } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientKey(req)
    const ipLimit = checkRateLimit(`register:ip:${clientIp}`, 15, 60_000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      )
    }

    const parsed = await parseJson(req, registerSchema)
    if ("response" in parsed) return parsed.response
    const { name, email, password, inviteToken } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (inviteToken && !existing.passwordHash) {
        const verification = await prisma.verificationToken.findUnique({
          where: { token: inviteToken },
        })
        if (
          verification &&
          verification.expires.getTime() > Date.now() &&
          verification.identifier.toLowerCase().endsWith(`:${email.toLowerCase()}`)
        ) {
          const passwordHash = await bcrypt.hash(password, 10)
          const activated = await prisma.user.update({
            where: { id: existing.id },
            data: { name, passwordHash, emailVerified: new Date() },
            select: { id: true, email: true, name: true },
          })
          await prisma.verificationToken
            .delete({ where: { token: inviteToken } })
            .catch(() => {})

          const token = await signSession(activated.id)
          const response = NextResponse.json(
            { data: activated, invited: true },
            { status: 201 }
          )
          response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          })
          return response
        }
      }

      // Avoid explicit account enumeration oracle
      return NextResponse.json(
        { error: "Unable to complete registration with the provided details." },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const slugBase = name.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "user"
    const orgSlug = `${slugBase}-${Date.now().toString(36)}`

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        currency: "INR",
        timezone: "Asia/Kolkata",
        memberships: {
          create: {
            role: "owner",
            organization: {
              create: {
                name: `${name}'s Organization`,
                slug: orgSlug,
                workspaces: {
                  create: {
                    name: "Default Workspace",
                    slug: "default",
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    })

    const token = await signSession(user.id)
    const response = NextResponse.json({ data: user }, { status: 201 })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (err: unknown) {
    logger.error("Registration failed", errorContext(err))
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
