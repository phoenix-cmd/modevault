import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, revokeSessionToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  await revokeSessionToken(token)

  const response = NextResponse.json({ data: { success: true } })
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}
