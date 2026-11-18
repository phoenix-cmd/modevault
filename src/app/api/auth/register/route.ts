import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body?.name || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 })
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
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 })
  }
}
