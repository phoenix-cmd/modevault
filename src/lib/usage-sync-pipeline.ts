import { prisma } from "@/lib/db"
import { decryptSecret } from "@/lib/crypto"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { getProviderAdapter } from "@/lib/providers/adapter"
import { evaluateReplenishmentForAccount } from "@/lib/replenishment"

export interface SyncRunResult {
  syncedAt: string
  accountsChecked: number
  snapshotsCreated: number
  liveUpdatedCount: number
  unsupportedCount: number
  errorCount: number
  snapshots: Array<{
    id: string
    providerSlug: string
    apiAccountId: string | null
    dataSource: string
    syncStatus: string
    cost: number
    creditsRemaining: number | null
    creditsUsed: number | null
    errorMessage: string | null
    syncedAt: string
  }>
}

/**
 * Run usage & credit synchronization across the user's connected API accounts and credentials.
 * Never overwrites previously verified live balances/spend with zero or fallback guesses if a
 * provider returns an error or marks an endpoint unsupported.
 */
export async function runUsageSyncForUser(
  userId: string,
  options: { providerSlug?: string; apiAccountId?: string; days?: number } = {}
): Promise<SyncRunResult> {
  const days = options.days ?? 30
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000)

  const [credentials, apiAccounts] = await Promise.all([
    prisma.integrationCredential.findMany({
      where: {
        userId,
        NOT: { providerSlug: "__user_preferences__" },
        ...(options.providerSlug ? { providerSlug: options.providerSlug } : {}),
      },
    }),
    prisma.apiAccount.findMany({
      where: {
        userId,
        ...(options.apiAccountId ? { id: options.apiAccountId } : {}),
      },
      include: { provider: true },
    }),
  ])

  const filteredAccounts = options.providerSlug
    ? apiAccounts.filter((a) => a.provider.slug === options.providerSlug)
    : apiAccounts

  const credBySlug = new Map(credentials.map((c) => [c.providerSlug, c]))

  const createdSnapshots: SyncRunResult["snapshots"] = []
  let liveUpdatedCount = 0
  let unsupportedCount = 0
  let errorCount = 0

  for (const account of filteredAccounts) {
    const slug = account.provider.slug
    const capability = getProviderCapability(slug)
    const cred = credBySlug.get(slug)

    let plaintextKey: string | null = null
    if (cred?.encryptedKey) {
      try {
        plaintextKey = decryptSecret(cred.encryptedKey).trim()
      } catch {
        plaintextKey = null
      }
    }

    const adapter = getProviderAdapter(slug)

    // Without a decrypted key or capability, log an honest manual/unsupported snapshot
    if (!plaintextKey) {
      const statusSource =
        capability.canSyncUsage || capability.canSyncCredits ? "manual" : "unsupported"
      const message = capability.canSyncUsage || capability.canSyncCredits
        ? `No API key saved in Integrations for ${account.provider.name}; retaining existing account balances.`
        : capability.capabilitiesNote

      const snap = await prisma.usageSnapshot.create({
        data: {
          userId,
          providerSlug: slug,
          apiAccountId: account.id,
          credentialId: cred?.id ?? null,
          periodStart,
          periodEnd,
          cost: account.totalSpent ?? 0,
          currency: account.currency,
          creditsRemaining: account.prepaidBalance ?? null,
          creditsUsed: account.totalSpent ?? null,
          dataSource: statusSource,
          syncStatus: capability.canSyncUsage || capability.canSyncCredits ? "ok" : "unsupported",
          errorMessage: message,
        },
      })
      if (snap.syncStatus === "unsupported") unsupportedCount += 1
      createdSnapshots.push({
        id: snap.id,
        providerSlug: snap.providerSlug,
        apiAccountId: snap.apiAccountId,
        dataSource: snap.dataSource,
        syncStatus: snap.syncStatus,
        cost: snap.cost,
        creditsRemaining: snap.creditsRemaining,
        creditsUsed: snap.creditsUsed,
        errorMessage: snap.errorMessage,
        syncedAt: snap.syncedAt.toISOString(),
      })
      continue
    }

    const [usageRes, creditsRes] = await Promise.all([
      adapter.fetchUsage({ providerSlug: slug, apiKey: plaintextKey }, { startDate: periodStart, endDate: periodEnd }),
      adapter.fetchCredits({ providerSlug: slug, apiKey: plaintextKey }),
    ])

    const hasLiveUsage = usageRes.dataSource === "live_api_sync"
    const hasLiveCredits = creditsRes.dataSource === "live_api_sync"
    const isLive = hasLiveUsage || hasLiveCredits
    const combinedError = [usageRes.errorMessage, creditsRes.errorMessage].filter(Boolean).join(" · ") || null

    const snap = await prisma.usageSnapshot.create({
      data: {
        userId,
        providerSlug: slug,
        apiAccountId: account.id,
        credentialId: cred?.id ?? null,
        periodStart,
        periodEnd,
        inputTokens: hasLiveUsage ? usageRes.inputTokens : 0,
        outputTokens: hasLiveUsage ? usageRes.outputTokens : 0,
        cachedTokens: hasLiveUsage ? usageRes.cachedTokens : 0,
        requests: hasLiveUsage ? usageRes.requests : 0,
        cost: hasLiveUsage ? usageRes.cost : 0,
        currency: account.currency || "USD",
        creditsRemaining: hasLiveCredits ? creditsRes.creditsRemaining : null,
        creditsUsed: hasLiveCredits ? creditsRes.creditsUsed : null,
        dataSource: isLive
          ? "live_api_sync"
          : !capability.canSyncUsage && !capability.canSyncCredits
            ? "unsupported"
            : "manual",
        syncStatus: isLive ? "ok" : combinedError ? "error" : "unsupported",
        errorMessage: isLive ? null : combinedError,
        rawReferenceHash: creditsRes.rawReferenceHash || usageRes.rawReferenceHash,
        breakdownJson: usageRes.breakdownByModel ? JSON.stringify(usageRes.breakdownByModel) : null,
      },
    })

    if (isLive) {
      liveUpdatedCount += 1
      await prisma.apiAccount.update({
        where: { id: account.id },
        data: {
          integrationStatus: "connected",
          lastSyncAt: snap.syncedAt,
          lastSyncStatus: "success",
          lastSyncError: null,
          ...(hasLiveCredits && creditsRes.creditsRemaining !== null
            ? { prepaidBalance: creditsRes.creditsRemaining }
            : {}),
          ...(hasLiveCredits && creditsRes.creditsUsed !== null
            ? { totalSpent: creditsRes.creditsUsed }
            : hasLiveUsage && usageRes.cost > 0
              ? { totalSpent: usageRes.cost }
              : {}),
        },
      })

      if (hasLiveCredits && creditsRes.creditsRemaining !== null) {
        await evaluateReplenishmentForAccount(account.id, "low_balance_sync").catch(() => {})
      }
    } else {
      if (combinedError && (capability.canSyncUsage || capability.canSyncCredits)) {
        errorCount += 1
      } else {
        unsupportedCount += 1
      }
      // Record error/status WITHOUT overwriting prepaidBalance or totalSpent!
      await prisma.apiAccount.update({
        where: { id: account.id },
        data: {
          lastSyncAt: account.lastSyncAt, // preserve last successful sync time if previously synced
          lastSyncStatus: combinedError ? "error" : "manual",
          lastSyncError: combinedError,
        },
      })
    }

    await prisma.syncLog.create({
      data: {
        userId,
        provider: slug,
        status: isLive ? "success" : "warning",
        message: isLive
          ? `Live usage sync completed (${creditsRes.creditsRemaining !== null ? `$${creditsRes.creditsRemaining.toFixed(2)} remaining` : `${usageRes.requests} reqs`})`
          : combinedError || `Recorded ${snap.dataSource} snapshot without overwriting live balances`,
      },
    })

    createdSnapshots.push({
      id: snap.id,
      providerSlug: snap.providerSlug,
      apiAccountId: snap.apiAccountId,
      dataSource: snap.dataSource,
      syncStatus: snap.syncStatus,
      cost: snap.cost,
      creditsRemaining: snap.creditsRemaining,
      creditsUsed: snap.creditsUsed,
      errorMessage: snap.errorMessage,
      syncedAt: snap.syncedAt.toISOString(),
    })
  }

  return {
    syncedAt: new Date().toISOString(),
    accountsChecked: filteredAccounts.length,
    snapshotsCreated: createdSnapshots.length,
    liveUpdatedCount,
    unsupportedCount,
    errorCount,
    snapshots: createdSnapshots,
  }
}
