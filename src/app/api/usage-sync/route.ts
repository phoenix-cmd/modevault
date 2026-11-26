import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { runUsageSyncForUser } from "@/lib/usage-sync-pipeline"
import { checkRateLimit, parseJson } from "@/lib/validation"

const syncTriggerSchema = z.object({
  providerSlug: z.string().trim().min(1).max(80).optional(),
  apiAccountId: z.string().trim().min(1).max(128).optional(),
  days: z.coerce.number().int().min(1).max(90).optional(),
})

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const [snapshots, accounts, subscriptions] = await Promise.all([
      prisma.usageSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { syncedAt: "desc" },
        take: 100,
      }),
      prisma.apiAccount.findMany({
        where: { userId: user.id },
        include: { provider: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findMany({
        where: { userId: user.id },
        include: { provider: true, plan: true },
      }),
    ])

    const latestByAccount = new Map<string, (typeof snapshots)[number]>()
    for (const s of snapshots) {
      if (s.apiAccountId && !latestByAccount.has(s.apiAccountId)) {
        latestByAccount.set(s.apiAccountId, s)
      }
    }

    return NextResponse.json({
      data: {
        snapshots: snapshots.map((s) => ({
          ...s,
          syncedAt: s.syncedAt.toISOString(),
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
          capability: getProviderCapability(s.providerSlug),
          breakdown: s.breakdownJson ? safeJson(s.breakdownJson) : null,
        })),
        accounts: accounts.map((acc) => {
          const snap = latestByAccount.get(acc.id) || null
          const cap = getProviderCapability(acc.provider.slug)
          const source = snap?.dataSource || (cap.canSyncCredits || cap.canSyncUsage ? (acc.lastSyncStatus === "success" ? "live_api_sync" : "manual") : "unsupported")
          return {
            id: acc.id,
            accountName: acc.accountName || acc.provider.name,
            providerSlug: acc.provider.slug,
            providerName: acc.provider.name,
            prepaidBalance: acc.prepaidBalance ?? 0,
            totalSpent: acc.totalSpent ?? 0,
            currency: acc.currency,
            lastSyncAt: (snap?.syncedAt || acc.lastSyncAt)?.toISOString() || null,
            lastSyncStatus: acc.lastSyncStatus,
            lastSyncError: snap?.errorMessage || acc.lastSyncError,
            dataSource: source,
            capability: cap,
          }
        }),
        subscriptions: subscriptions.map((sub) => ({
          id: sub.id,
          providerSlug: sub.provider.slug,
          providerName: sub.provider.name,
          planName: sub.customPlanName || sub.plan?.name || "Standard Plan",
          dataSource: sub.dataSource || "manual",
          capability: getProviderCapability(sub.provider.slug),
        })),
      },
    })
  } catch (err) {
    return authErrorResponse(err, "Failed to load usage snapshots")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const limit = checkRateLimit(`usage-sync:user:${user.id}`, 12, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many usage sync requests. Please wait before retrying." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      )
    }

    const bodyText = await req.clone().text().catch(() => "")
    let options: z.infer<typeof syncTriggerSchema> = {}
    if (bodyText.trim()) {
      const parsed = await parseJson(req, syncTriggerSchema)
      if ("response" in parsed) return parsed.response
      options = parsed.data
    }

    const result = await runUsageSyncForUser(user.id, options)
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err, "Usage sync failed")
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
