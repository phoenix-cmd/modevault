import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"

const CLIENT_ID = process.env.GITHUB_CLIENT_ID
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", req.url))
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    })
    const tokenJson = await tokenRes.json()
    const accessToken = tokenJson.access_token as string | undefined
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=github_token", req.url))
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    })
    const githubUser = await userRes.json()

    const email =
      githubUser.email ||
      (await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      })
        .then((r) => r.json())
        .then((emails: Array<{ email: string; primary: boolean; verified: boolean }>) =>
          emails.find((e) => e.primary && e.verified)?.email
        )) ||
      `${githubUser.login}@github.local`

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const slugBase = String(githubUser.login || "user").toLowerCase().replace(/[^a-z0-9-]/g, "-")
      user = await prisma.user.create({
        data: {
          name: githubUser.name || githubUser.login,
          email,
          currency: "INR",
          timezone: "Asia/Kolkata",
          memberships: {
            create: {
              role: "owner",
              organization: {
                create: {
                  name: `${githubUser.login}'s Organization`,
                  slug: `${slugBase}-${Date.now().toString(36)}`,
                  workspaces: {
                    create: { name: "Default Workspace", slug: "default", isDefault: true },
                  },
                },
              },
            },
          },
        },
      })
    }

    const token = await signSession(user.id)
    const response = NextResponse.redirect(new URL("/overview", req.url))
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch {
    return NextResponse.redirect(new URL("/login?error=github_failed", req.url))
  }
}
