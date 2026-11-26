import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  getProviderCapability,
  listProviderCapabilities,
} from "@/lib/providers/capabilities"
import { ensureProviderCapabilitiesInDb } from "@/lib/providers/capabilities-db"

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    await ensureProviderCapabilitiesInDb().catch(() => {})

    const [dbCaps, credentials, apiAccounts, subscriptions, latestSnapshots] = await Promise.all([
      prisma.providerCapability.findMany({ orderBy: { providerSlug: "asc" } }),
      prisma.integrationCredential.findMany({
        where: { userId: user.id, NOT: { providerSlug: "__user_preferences__" } },
      }),
      prisma.apiAccount.findMany({
        where: { userId: user.id },
        include: { provider: true },
      }),
      prisma.subscription.findMany({
        where: { userId: user.id },
        include: { provider: true },
      }),
      prisma.usageSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { syncedAt: "desc" },
        take: 100,
      }),
    ])

    const credBySlug = new Map(credentials.map((c) => [c.providerSlug, c]))
    const snapshotBySlug = new Map<string, (typeof latestSnapshots)[number]>()
    for (const snap of latestSnapshots) {
      if (!snapshotBySlug.has(snap.providerSlug)) {
        snapshotBySlug.set(snap.providerSlug, snap)
      }
    }

    const baseSpecs =
      dbCaps.length > 0
        ? dbCaps.map((row) => ({
            ...getProviderCapability(row.providerSlug),
            id: row.id,
            canSyncUsage: row.canSyncUsage,
            canSyncCredits: row.canSyncCredits,
            canReplenish: row.canReplenish,
            canCode: row.canCode,
            authMode: row.authMode,
            syncCadence: row.syncCadence,
            termsStatus: row.termsStatus,
            billingUrl: row.billingUrl,
            capabilitiesNote: row.capabilitiesNote || "",
          }))
        : listProviderCapabilities()

    const enriched = baseSpecs.map((spec) => {
      const cred = credBySlug.get(spec.providerSlug)
      const matchingAccounts = apiAccounts.filter((a) => a.provider.slug === spec.providerSlug)
      const matchingSubs = subscriptions.filter((s) => s.provider.slug === spec.providerSlug)
      const latestSnapshot = snapshotBySlug.get(spec.providerSlug) || null

      return {
        ...spec,
        connectionStatus: cred?.status || (matchingAccounts.some((a) => a.integrationStatus === "connected") ? "connected" : matchingSubs.length > 0 ? "manual" : "not_connected"),
        hasCredentialKey: Boolean(cred?.encryptedKey),
        apiAccountsCount: matchingAccounts.length,
        subscriptionsCount: matchingSubs.length,
        latestSnapshot: latestSnapshot
          ? {
              id: latestSnapshot.id,
              syncedAt: latestSnapshot.syncedAt.toISOString(),
              dataSource: latestSnapshot.dataSource,
              syncStatus: latestSnapshot.syncStatus,
              cost: latestSnapshot.cost,
              creditsRemaining: latestSnapshot.creditsRemaining,
              creditsUsed: latestSnapshot.creditsUsed,
              errorMessage: latestSnapshot.errorMessage,
            }
          : null,
      }
    })

    return NextResponse.json({
      data: {
        capabilities: enriched,
        unknownFallbackExample: getProviderCapability("unknown-provider"),
      },
    })
  } catch (err) {
    return authErrorResponse(err, "Failed to load provider capabilities")
  }
}
