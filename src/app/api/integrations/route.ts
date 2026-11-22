import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { encryptSecret, keyPreview } from "@/lib/crypto"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const integrationSchema = z.object({
  providerSlug: z.string().trim().min(1).max(80),
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
    const records = await prisma.integrationCredential.findMany({
      where: { userId: user.id },
      orderBy: { providerSlug: "asc" },
    })
    return NextResponse.json({ data: records.map(serialize) })
  } catch (err) {
    logger.error("Failed to load integrations", errorContext(err))
    return authErrorResponse(err, "Failed to load integrations")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, integrationSchema)
    if ("response" in parsed) return parsed.response
    const { providerSlug, apiKey, status, notes, features } = parsed.data

    const existing = await prisma.integrationCredential.findUnique({
      where: { userId_providerSlug: { userId: user.id, providerSlug } },
    })

    const encryptedKey = apiKey ? encryptSecret(apiKey) : existing?.encryptedKey || null
    const preview = apiKey ? keyPreview(apiKey) : existing?.keyPreview || null

    const record = await prisma.integrationCredential.upsert({
      where: { userId_providerSlug: { userId: user.id, providerSlug } },
      update: {
        status: status || (apiKey ? "connected" : existing?.status || "manual"),
        notes: notes ?? existing?.notes ?? null,
        featuresJson: features ? JSON.stringify(features) : existing?.featuresJson || null,
        encryptedKey,
        keyPreview: preview,
        lastSyncAt: apiKey ? new Date() : existing?.lastSyncAt || null,
      },
      create: {
        userId: user.id,
        providerSlug,
        status: status || (apiKey ? "connected" : "manual"),
        notes: notes || null,
        featuresJson: features ? JSON.stringify(features) : null,
        encryptedKey,
        keyPreview: preview,
        lastSyncAt: apiKey ? new Date() : null,
      },
    })

    logger.info("Integration credential saved", { providerSlug, userId: user.id })
    return NextResponse.json({ data: serialize(record) }, { status: 201 })
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
