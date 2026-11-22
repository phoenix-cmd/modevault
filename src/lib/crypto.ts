import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const VERSION = "v1"
const INSECURE_DEFAULTS = new Set([
  "modelvault-local-development-secret",
  "modelvault-dev-secret-change-me",
  "change-me",
  "secret",
])

function getKey(): Buffer {
  const configured = (
    process.env.INTEGRATIONS_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  ).trim()

  let secret = configured
  if (!secret || INSECURE_DEFAULTS.has(secret)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: INTEGRATIONS_ENCRYPTION_KEY (or AUTH_SECRET / NEXTAUTH_SECRET) must be configured in production"
      )
    }
    secret = createHash("sha256")
      .update(`modelvault-local-encryption:${process.cwd()}`)
      .digest("hex")
  }

  return scryptSync(secret, "modelvault-integrations", 32)
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, encrypted] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("Unsupported secret payload")
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

export function keyPreview(secret: string): string {
  if (secret.length <= 4) return "••••"
  return `••••${secret.slice(-4)}`
}
