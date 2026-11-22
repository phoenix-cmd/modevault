import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

const CLIENT_ID = process.env.GITHUB_CLIENT_ID
export const OAUTH_STATE_COOKIE = "mv_github_oauth_state"

export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(32).toString("base64url")
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")

  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." },
      { status: 503 }
    )
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/github/callback`
  // Least-privilege sign-in scope (repository access should be requested separately via GitHub App)
  const scope = "read:user user:email"
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`

  const response = NextResponse.redirect(url)
  response.cookies.set(OAUTH_STATE_COOKIE, `${state}.${codeVerifier}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/github",
    maxAge: 600,
  })
  return response
}
