import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { signSession, COOKIE_NAME } from "@/lib/auth"
import { OAUTH_STATE_COOKIE } from "@/app/api/auth/github/route"

const CLIENT_ID = process.env.GITHUB_CLIENT_ID
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

function verifyOAuthState(cookieValue: string | undefined, queryState: string | null): string | null {
  if (!cookieValue || !queryState) return null
  const [expectedState, codeVerifier] = cookieValue.split(".")
  if (!expectedState || !codeVerifier) return null
  const a = Buffer.from(expectedState, "utf8")
  const b = Buffer.from(queryState, "utf8")
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return codeVerifier
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value
  const codeVerifier = verifyOAuthState(stateCookie, state)

  if (!codeVerifier) {
    return NextResponse.json({ error: "Invalid or missing OAuth state parameter" }, { status: 400 })
  }

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
        code_verifier: codeVerifier,
      }),
    })
    const tokenJson = await tokenRes.json()
    const accessToken = tokenJson.access_token as string | undefined
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=github_token", req.url))
    }

    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      }),
    ])
    const githubUser = await userRes.json()
    const emailsJson = await emailsRes.json()
    const verifiedEmail = Array.isArray(emailsJson)
      ? (emailsJson as Array<{ email: string; primary: boolean; verified: boolean }>).find(
          (e) => e.primary && e.verified
        )?.email ||
        (emailsJson as Array<{ email: string; verified: boolean }>).find((e) => e.verified)?.email
      : null

    if (!verifiedEmail) {
      return NextResponse.redirect(new URL("/login?error=github_unverified_email", req.url))
    }

    let user = await prisma.user.findUnique({ where: { email: verifiedEmail } })
    if (!user) {
      const slugBase = String(githubUser.login || "user").toLowerCase().replace(/[^a-z0-9-]/g, "-")
      user = await prisma.user.create({
        data: {
          name: githubUser.name || githubUser.login,
          email: verifiedEmail,
          emailVerified: new Date(),
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
    response.cookies.delete(OAUTH_STATE_COOKIE)
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
