import { NextRequest, NextResponse } from "next/server"

const CLIENT_ID = process.env.GITHUB_CLIENT_ID

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." },
      { status: 503 }
    )
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/github/callback`
  const scope = "read:user user:email repo"
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`
  return NextResponse.redirect(url)
}
