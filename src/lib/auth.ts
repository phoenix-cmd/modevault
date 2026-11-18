// MODELVAULT — Session signing and verification
import { cookies } from "next/headers"
import crypto from "node:crypto"
import service from "../../service.mjs"
import { getDb } from "@/lib/db"

const COOKIE_NAME = "mv_session"

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

// The session secret is a service input bound with envSecret("AUTH_SECRET")
// in module.mjs. Read at call time (never at module scope, never a default).
function jwtSecret(): string {
  return service.input().authSecret.expose()
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url")
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8")
}

export async function signSession(userId: string): Promise<string> {
  const payload = JSON.stringify({ sub: userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  const encodedPayload = base64UrlEncode(payload)
  const signature = crypto
    .createHmac("sha256", jwtSecret())
    .update(encodedPayload)
    .digest("base64url")
  return `${encodedPayload}.${signature}`
}

export async function verifySession(token: string): Promise<string | null> {
  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return null

  const expected = crypto
    .createHmac("sha256", jwtSecret())
    .update(encodedPayload)
    .digest("base64url")

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { sub?: string; exp?: number }
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) return null
    return payload.sub
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const userId = await verifySession(token)
    if (!userId) return null

    const db = getDb()
    const user = await db.orm.public.User.select("id", "email", "name").first({ id: userId })
    return user
  } catch {
    return null
  }
}

export async function getCurrentUserOrDefault(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (user) return user

  const db = getDb()
  const demo = await db.orm.public.User.select("id", "email", "name").first({ id: "user_demo_001" })
  if (demo) return demo

  throw new Error("No demo user available")
}

export { COOKIE_NAME }
