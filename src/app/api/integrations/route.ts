import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { decryptSecret, encryptSecret, keyPreview } from "@/lib/crypto"
import { verifyAndSyncProvider } from "@/lib/provider-sync"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { checkRateLimit, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const integrationSchema = z.object({
  providerSlug: z.string().trim().min(1).max(80),
  action: z.enum(["save", "sync"]).optional(),
  apiKey: z.string().trim().max(500).optional(),
  status: z.enum(["connected", "manual", "not_connected"]).optional(),
  notes: z.string().max(2000).optional(),
  features: z
    .object({
      subscriptionQuotas: z.boolean().optional(),
      apiTokens: z.boolean().optional(),
      invoices: z.boolean().optional(),
    })
    .optional(),
})

function serialize(record: {
  id: string
  providerSlug: string
  status: string
  featuresJson: string | null
  notes: string | null
  keyPreview: string | null
  encryptedKey: string | null
  lastSyncAt: Date | null
  updatedAt: Date
}) {
  return {
    id: record.id,
    providerSlug: record.providerSlug,
    status: record.status,
    features: record.featuresJson ? safeParse(record.featuresJson) : null,
    notes: record.notes,
    hasKey: Boolean(record.encryptedKey),
    keyPreview: record.keyPreview,
    lastSyncAt: record.lastSyncAt?.toISOString() || null,
    updatedAt: record.updatedAt.toISOString(),
  }
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const [records, syncLogs] = await Promise.all([
      prisma.integrationCredential.findMany({
        where: {
          userId: user.id,
          NOT: { providerSlug: "__user_preferences__" },
        },
        orderBy: { providerSlug: "asc" },
      }),
      prisma.syncLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ])

    const latestLogByProvider = new Map<string, { status: string; message: string | null; duration: number | null }>()
    for (const log of syncLogs) {
      if (!latestLogByProvider.has(log.provider)) {
        latestLogByProvider.set(log.provider, {
          status: log.status,
          message: log.message,
          duration: log.duration,
        })
      }
    }

    return NextResponse.json({
      data: records.map((rec) => ({
        ...serialize(rec),
        capability: getProviderCapability(rec.providerSlug),
        lastSyncLog: latestLogByProvider.get(rec.providerSlug) || null,
      })),
    })
  } catch (err) {
    logger.error("Failed to load integrations", errorContext(err))
    return authErrorResponse(err, "Failed to load integrations")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const limit = checkRateLimit(`integrations:user:${user.id}`, 20, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many integration sync requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      )
    }
    const parsed = await parseJson(req, integrationSchema)
    if ("response" in parsed) return parsed.response
    const { providerSlug, action, apiKey, status, notes, features } = parsed.data

    const existing = await prisma.integrationCredential.findUnique({
      where: { userId_providerSlug: { userId: user.id, providerSlug } },
    })

    let plaintextKey = apiKey || ""
    if (!plaintextKey && existing?.encryptedKey) {
      try {
        plaintextKey = decryptSecret(existing.encryptedKey)
      } catch {
        plaintextKey = ""
      }
    }

    if (action === "sync" && !plaintextKey) {
      return NextResponse.json(
        { error: "Connect and save an API key before running live verification." },
        { status: 400 }
      )
    }

    const encryptedKey = apiKey ? encryptSecret(apiKey) : existing?.encryptedKey || null
    const preview = apiKey ? keyPreview(apiKey) : existing?.keyPreview || null

    const shouldVerify = Boolean(plaintextKey) && (action === "sync" || Boolean(apiKey))
    const verification = shouldVerify
      ? await verifyAndSyncProvider(providerSlug, plaintextKey)
      : null

    const nextStatus = status || (encryptedKey ? "connected" : existing?.status || "manual")
    const syncTimestamp = verification || apiKey ? new Date() : existing?.lastSyncAt || null

    const record = await prisma.integrationCredential.upsert({
      where: { userId_providerSlug: { userId: user.id, providerSlug } },
      update: {
        status: nextStatus,
        notes: notes ?? existing?.notes ?? null,
        featuresJson: features ? JSON.stringify(features) : existing?.featuresJson || null,
        encryptedKey,
        keyPreview: preview,
        lastSyncAt: syncTimestamp,
      },
      create: {
        userId: user.id,
        providerSlug,
        status: nextStatus,
        notes: notes || null,
        featuresJson: features ? JSON.stringify(features) : null,
        encryptedKey,
        keyPreview: preview,
        lastSyncAt: syncTimestamp,
      },
    })

    await prisma.syncLog.create({
      data: {
        userId: user.id,
        provider: providerSlug,
        status: verification ? verification.status : "success",
        message: verification
          ? verification.message
          : `Integration mode updated to ${record.status}`,
        duration: verification?.durationMs ?? 12,
      },
    })

    // Keep linked ApiAccount in sync when provider exists in Provider table
    if (verification && plaintextKey) {
      const providerRow = await prisma.provider.findUnique({ where: { slug: providerSlug } })
      if (providerRow) {
        const existingAccount = await prisma.apiAccount.findFirst({
          where: { userId: user.id, providerId: providerRow.id },
        })
        const lastFour = plaintextKey.slice(-4)
        if (existingAccount) {
          await prisma.apiAccount.update({
            where: { id: existingAccount.id },
            data: {
              apiKeyLastFour: lastFour,
              integrationStatus: verification.ok ? "connected" : "error",
              lastSyncAt: new Date(),
              lastSyncStatus: verification.status,
              lastSyncError: verification.ok ? null : verification.message,
              ...(verification.creditsRemaining !== undefined && {
                prepaidBalance: verification.creditsRemaining,
              }),
              ...(verification.creditsUsed !== undefined && {
                totalSpent: verification.creditsUsed,
              }),
            },
          })
        } else if (verification.ok) {
          await prisma.apiAccount.create({
            data: {
              userId: user.id,
              providerId: providerRow.id,
              accountName: verification.accountLabel || `${providerRow.name} API`,
              apiKeyLastFour: lastFour,
              prepaidBalance: verification.creditsRemaining ?? 0,
              totalSpent: verification.creditsUsed ?? 0,
              currency: "USD",
              integrationStatus: "connected",
              lastSyncAt: new Date(),
              lastSyncStatus: "success",
            },
          })
        }
      }
    }

    logger.info("Integration credential saved", { providerSlug, userId: user.id, verified: verification?.ok })
    return NextResponse.json(
      {
        data: {
          ...serialize(record),
          lastSyncLog: verification
            ? { status: verification.status, message: verification.message, duration: verification.durationMs }
            : null,
        },
        verification,
      },
      { status: 201 }
    )
  } catch (err) {
    logger.error("Failed to save integration", errorContext(err))
    return authErrorResponse(err, "Failed to save integration")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const providerSlug = new URL(req.url).searchParams.get("providerSlug")
    if (!providerSlug) {
      return NextResponse.json({ error: "providerSlug is required" }, { status: 400 })
    }
    await prisma.integrationCredential.deleteMany({
      where: { userId: user.id, providerSlug },
    })
    return NextResponse.json({ data: { providerSlug, disconnected: true } })
  } catch (err) {
    logger.error("Failed to disconnect integration", errorContext(err))
    return authErrorResponse(err, "Failed to disconnect integration")
  }
}
