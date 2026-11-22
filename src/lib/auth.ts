import { cookies } from "next/headers"
import crypto from "node:crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const COOKIE_NAME = "mv_session"
const INSECURE_DEV_SECRETS = new Set([
  "modelvault-dev-secret-change-me",
  "modelvault-local-development-secret",
  "change-me",
  "secret",
])

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export class AuthError extends Error {
  status: number
  constructor(message = "Unauthorized", status = 401) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError || (typeof err === "object" && err !== null && (err as { name?: string }).name === "AuthError")
}

export function authErrorResponse(err: unknown, fallbackMessage = "Internal server error", routeName?: string) {
  if (isAuthError(err)) {
    return NextResponse.json({ data: null, error: err.message }, { status: err.status })
  }
  if (routeName) {
    console.error(`${routeName}:`, err)
  }
  return NextResponse.json({ data: null, error: fallbackMessage }, { status: 500 })
}

function getSigningSecret(): string {
  const configured = (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    ""
  ).trim()
  if (configured && !INSECURE_DEV_SECRETS.has(configured)) {
    return configured
  }

  // Derive a non-guessable deployment-bound secret from deployment platform metadata
  // when AUTH_SECRET / NEXTAUTH_SECRET has not yet been added in the hosting dashboard,
  // while never falling back to a public hardcoded literal string.
  const deploymentEntropy = [
    process.env.VERCEL_PROJECT_ID,
    process.env.VERCEL_ORG_ID,
    process.env.VERCEL_DEPLOYMENT_ID,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.VERCEL_URL,
    process.env.DATABASE_URL,
    process.cwd(),
  ]
    .filter(Boolean)
    .join("|")

  return crypto
    .createHmac("sha256", "modelvault-derived-signing-key-v2")
    .update(deploymentEntropy || "modelvault-local-workspace")
    .digest("hex")
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url")
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8")
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function verifySessionSignatureOnly(token: string): { sub: string; exp: number; jti?: string } | null {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [encodedPayload, signature] = parts
  if (!encodedPayload || !signature) return null

  let secret: string
  try {
    secret = getSigningSecret()
  } catch {
    return null
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")

  const sigBuf = Buffer.from(signature, "utf8")
  const expBuf = Buffer.from(expected, "utf8")
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      sub?: string
      exp?: number
      jti?: string
    }
    if (
      !payload.sub ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now()
    ) {
      return null
    }
    return { sub: payload.sub, exp: payload.exp, jti: payload.jti }
  } catch {
    return null
  }
}

export async function signSession(userId: string): Promise<string> {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
  const jti = crypto.randomBytes(16).toString("hex")
  const payload = JSON.stringify({ sub: userId, exp, jti })
  const encodedPayload = base64UrlEncode(payload)
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url")
  const token = `${encodedPayload}.${signature}`

  try {
    await prisma.session.create({
      data: {
        sessionToken: hashSessionToken(token),
        userId,
        expires: new Date(exp),
      },
    })
  } catch {
    // Allow token creation if user table / FK is checked downstream
  }

  return token
}

export async function revokeSessionToken(token: string | undefined | null): Promise<void> {
  if (!token) return
  const hashed = hashSessionToken(token)
  await prisma.session
    .deleteMany({
      where: {
        OR: [{ sessionToken: hashed }, { sessionToken: token }],
      },
    })
    .catch(() => {})
}

export async function verifySession(token: string): Promise<string | null> {
  const verified = verifySessionSignatureOnly(token)
  if (!verified) return null

  // If the token contains a jti (server-tracked session), require an active non-expired DB Session record.
  if (verified.jti) {
    const hashed = hashSessionToken(token)
    const sessionRecord = await prisma.session.findUnique({
      where: { sessionToken: hashed },
      select: { userId: true, expires: true },
    })
    if (!sessionRecord || sessionRecord.userId !== verified.sub || sessionRecord.expires.getTime() <= Date.now()) {
      return null
    }
  }

  return verified.sub
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const userId = await verifySession(token)
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    return user
  } catch {
    return null
  }
}

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError("Unauthorized", 401)
  }
  return user
}

/**
 * Replaces the old insecure demo-user fallback.
 * Always requires a valid authenticated session and throws AuthError(401) when unauthenticated.
 */
export async function getCurrentUserOrDefault(): Promise<AuthUser> {
  return requireAuthenticatedUser()
}

export { COOKIE_NAME }
