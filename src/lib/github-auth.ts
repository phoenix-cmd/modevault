import { prisma } from "@/lib/db"
import { decryptSecret } from "@/lib/crypto"

/**
 * Resolves the user's GitHub personal access token or OAuth access token
 * from connected integrations or linked GitHub OAuth accounts.
 */
export async function resolveUserGithubToken(userId: string): Promise<string | null> {
  const cred = await prisma.integrationCredential.findUnique({
    where: { userId_providerSlug: { userId, providerSlug: "github" } },
  })
  if (cred?.encryptedKey && cred.status !== "not_connected") {
    try {
      const token = decryptSecret(cred.encryptedKey).trim()
      if (token) return token
    } catch {
      // Ignore malformed/stale integration credential
    }
  }
  const oauthAccount = await prisma.account.findFirst({
    where: { userId, provider: "github", access_token: { not: null } },
    select: { access_token: true },
  })
  return oauthAccount?.access_token?.trim() || null
}
