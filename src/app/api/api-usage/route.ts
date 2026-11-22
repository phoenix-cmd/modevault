import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const apiUsageCreateSchema = z.object({
  apiAccountId: z.string().min(1).max(128),
  date: z.string().max(64).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  inputTokens: z.number().int().nonnegative().max(1_000_000_000).optional(),
  outputTokens: z.number().int().nonnegative().max(1_000_000_000).optional(),
  cachedTokens: z.number().int().nonnegative().max(1_000_000_000).optional(),
  totalTokens: z.number().int().nonnegative().max(2_000_000_000).optional(),
  cost: z.number().finite().nonnegative().max(1_000_000).optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  requestCount: z.number().int().nonnegative().max(100_000_000).optional(),
  dataSource: z.string().max(40).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const apiAccountId = searchParams.get("apiAccountId")
    const model = searchParams.get("model")
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100

    const where: Prisma.ApiUsageRecordWhereInput = {
      apiAccount: {
        userId: user.id,
      },
    }

    if (apiAccountId) {
      where.apiAccountId = apiAccountId
    }

    if (model) {
      where.model = model
    }

    const records = await prisma.apiUsageRecord.findMany({
      where,
      include: {
        apiAccount: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    })

    return NextResponse.json({ data: records })
  } catch (err: unknown) {
    logger.error("API usage GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch API usage records")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, apiUsageCreateSchema)
    if ("response" in parsed) return parsed.response
    const {
      apiAccountId,
      date,
      model,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens,
      cost,
      currency,
      requestCount,
      dataSource,
    } = parsed.data

    // Enforce tenant/user ownership of target ApiAccount
    const account = await prisma.apiAccount.findFirst({
      where: { id: apiAccountId, userId: user.id },
    })
    if (!account) {
      return NextResponse.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      )
    }

    const computedTotal = totalTokens ?? ((inputTokens || 0) + (outputTokens || 0))
    const safeCost = cost ?? 0

    const record = await prisma.apiUsageRecord.create({
      data: {
        apiAccountId: account.id,
        date: date ? new Date(date) : new Date(),
        model: model || "custom",
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        cachedTokens: cachedTokens || 0,
        totalTokens: computedTotal,
        cost: safeCost,
        currency: currency || "USD",
        requestCount: requestCount || 1,
        dataSource: dataSource || "manual",
      },
    })

    if (safeCost > 0) {
      await prisma.apiAccount.update({
        where: { id: account.id },
        data: {
          totalSpent: { increment: safeCost },
          prepaidBalance: { decrement: safeCost },
        },
      })
    }

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Failed to create API usage record", errorContext(err))
    return authErrorResponse(err, "Failed to create API usage record")
  }
}
