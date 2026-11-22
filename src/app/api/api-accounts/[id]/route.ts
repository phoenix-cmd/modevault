import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const apiAccountUpdateSchema = z.object({
  accountName: z.string().max(160).nullable().optional(),
  apiKeyLastFour: z.string().max(16).nullable().optional(),
  prepaidBalance: z.number().finite().nonnegative().max(10_000_000).nullable().optional(),
  totalSpent: z.number().finite().nonnegative().max(10_000_000).nullable().optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  rateLimit: z.number().int().nonnegative().nullable().optional(),
  rateLimitTokens: z.number().int().nonnegative().nullable().optional(),
  integrationStatus: z.enum(["connected", "manual", "error", "expired"]).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const account = await prisma.apiAccount.findFirst({
      where: { id, userId: user.id },
      include: {
        provider: true,
        apiUsageRecords: { orderBy: { date: "desc" }, take: 50 },
      },
    })

    if (!account) {
      return NextResponse.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: account })
  } catch (err: unknown) {
    logger.error("API Account GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch API account")
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const parsed = await parseJson(request, apiAccountUpdateSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const existing = await prisma.apiAccount.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      )
    }

    const account = await prisma.apiAccount.update({
      where: { id: existing.id },
      data: {
        ...(body.accountName !== undefined && { accountName: body.accountName }),
        ...(body.apiKeyLastFour !== undefined && { apiKeyLastFour: body.apiKeyLastFour }),
        ...(body.prepaidBalance !== undefined && { prepaidBalance: body.prepaidBalance }),
        ...(body.totalSpent !== undefined && { totalSpent: body.totalSpent }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.rateLimit !== undefined && { rateLimit: body.rateLimit }),
        ...(body.rateLimitTokens !== undefined && { rateLimitTokens: body.rateLimitTokens }),
        ...(body.integrationStatus !== undefined && { integrationStatus: body.integrationStatus }),
      },
      include: { provider: true },
    })

    return NextResponse.json({ data: account })
  } catch (err: unknown) {
    logger.error("API Account PUT error", errorContext(err))
    return authErrorResponse(err, "Failed to update API account")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.apiAccount.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      )
    }

    await prisma.apiAccount.delete({ where: { id: existing.id } })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (err: unknown) {
    logger.error("API Account DELETE error", errorContext(err))
    return authErrorResponse(err, "Failed to delete API account")
  }
}
