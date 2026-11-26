import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { logger, errorContext } from "@/lib/logger"

const apiAccountCreateSchema = z.object({
  providerId: z.string().min(1).max(128),
  accountName: z.string().max(160).nullable().optional(),
  apiKeyLastFour: z.string().max(16).nullable().optional(),
  prepaidBalance: z.number().finite().nonnegative().max(10_000_000).nullable().optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  rateLimit: z.number().int().nonnegative().nullable().optional(),
  rateLimitTokens: z.number().int().nonnegative().nullable().optional(),
  integrationStatus: z.enum(["connected", "manual", "error", "expired"]).optional(),
})

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const [accounts, snapshots] = await Promise.all([
      prisma.apiAccount.findMany({
        where: { userId: user.id },
        include: { provider: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.usageSnapshot.findMany({
        where: { userId: user.id, apiAccountId: { not: null } },
        orderBy: { syncedAt: "desc" },
        take: 100,
      }),
    ])

    const latestSnapByAccount = new Map<string, (typeof snapshots)[number]>()
    for (const snap of snapshots) {
      if (snap.apiAccountId && !latestSnapByAccount.has(snap.apiAccountId)) {
        latestSnapByAccount.set(snap.apiAccountId, snap)
      }
    }

    return NextResponse.json({
      data: accounts.map((acc) => {
        const snap = latestSnapByAccount.get(acc.id) || null
        const effectiveDataSource =
          snap?.dataSource ||
          (acc.integrationStatus === "connected" && acc.lastSyncAt && acc.lastSyncStatus === "success"
            ? getProviderCapability(acc.provider.slug).canSyncCredits ||
              getProviderCapability(acc.provider.slug).canSyncUsage
              ? "live_api_sync"
              : "manual"
            : "manual")
        return {
          ...acc,
          dataSource: effectiveDataSource,
          capability: getProviderCapability(acc.provider.slug),
          latestSnapshot: snap
            ? {
                id: snap.id,
                syncedAt: snap.syncedAt.toISOString(),
                dataSource: snap.dataSource,
                syncStatus: snap.syncStatus,
                errorMessage: snap.errorMessage,
                creditsRemaining: snap.creditsRemaining,
                creditsUsed: snap.creditsUsed,
              }
            : null,
        }
      }),
    })
  } catch (err: unknown) {
    logger.error("API Accounts GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch API accounts")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, apiAccountCreateSchema)
    if ("response" in parsed) return parsed.response

    const {
      providerId,
      accountName,
      apiKeyLastFour,
      prepaidBalance,
      currency,
      rateLimit,
      rateLimitTokens,
      integrationStatus,
    } = parsed.data

    const account = await prisma.apiAccount.create({
      data: {
        userId: user.id,
        providerId,
        accountName: accountName ?? null,
        apiKeyLastFour: apiKeyLastFour ?? null,
        prepaidBalance: prepaidBalance ?? 0,
        currency: currency ?? "USD",
        rateLimit: rateLimit ?? null,
        rateLimitTokens: rateLimitTokens ?? null,
        integrationStatus: integrationStatus ?? "manual",
      },
      include: { provider: true },
    })

    return NextResponse.json({ data: account }, { status: 201 })
  } catch (err: unknown) {
    logger.error("API Accounts POST error", errorContext(err))
    return authErrorResponse(err, "Failed to create API account")
  }
}
