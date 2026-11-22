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
    process.env.JWT_SECRET ||
    ""
  ).trim()

  let secret = configured
  if (!secret || INSECURE_DEFAULTS.has(secret)) {
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

    secret = createHash("sha256")
      .update(`modelvault-derived-encryption-key-v2:${deploymentEntropy}`)
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
