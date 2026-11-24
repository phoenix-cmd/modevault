import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { emitNotification } from "@/lib/notifications"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const subscriptionUpdateSchema = z.object({
  providerId: z.string().min(1).max(128).optional(),
  planId: z.string().max(128).nullable().optional(),
  customPlanName: z.string().max(160).nullable().optional(),
  type: z.enum(["consumer", "api"]).optional(),
  status: z.enum(["active", "paused", "expired", "cancelled", "trial"]).optional(),
  billingCycle: z.enum(["monthly", "yearly", "custom"]).optional(),
  price: z.coerce.number().finite().nonnegative().max(10_000_000).optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  startDate: z.string().max(64).optional(),
  renewalDate: z.string().max(64).nullable().optional(),
  expiryDate: z.string().max(64).nullable().optional(),
  quotaMessages: z.number().int().nonnegative().nullable().optional(),
  quotaTokens: z.number().int().nonnegative().nullable().optional(),
  quotaRequests: z.number().int().nonnegative().nullable().optional(),
  quotaCredits: z.number().finite().nonnegative().nullable().optional(),
  quotaResetPeriod: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const subscriptionUsagePatchSchema = z.object({
  usedMessages: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  usedTokens: z.number().int().nonnegative().max(2_000_000_000).nullable().optional(),
  usedRequests: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  usedCredits: z.number().finite().nonnegative().max(10_000_000).nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
      include: {
        provider: true,
        plan: true,
        usageRecords: { orderBy: { date: "desc" } },
        billingRecords: { orderBy: { billingDate: "desc" } },
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: subscription })
  } catch (err: unknown) {
    logger.error("Subscription GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch subscription")
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const parsed = await parseJson(request, subscriptionUpdateSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      )
    }

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        ...(body.providerId !== undefined && { providerId: body.providerId }),
        ...(body.planId !== undefined && { planId: body.planId }),
        ...(body.customPlanName !== undefined && { customPlanName: body.customPlanName }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.renewalDate !== undefined && { renewalDate: body.renewalDate ? new Date(body.renewalDate) : null }),
        ...(body.expiryDate !== undefined && { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null }),
        ...(body.quotaMessages !== undefined && { quotaMessages: body.quotaMessages }),
        ...(body.quotaTokens !== undefined && { quotaTokens: body.quotaTokens }),
        ...(body.quotaRequests !== undefined && { quotaRequests: body.quotaRequests }),
        ...(body.quotaCredits !== undefined && { quotaCredits: body.quotaCredits }),
        ...(body.quotaResetPeriod !== undefined && { quotaResetPeriod: body.quotaResetPeriod }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: { provider: true, plan: true },
    })

    return NextResponse.json({ data: subscription })
  } catch (err: unknown) {
    logger.error("Subscription PUT error", errorContext(err))
    return authErrorResponse(err, "Failed to update subscription")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      )
    }

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({ data: subscription })
  } catch (err: unknown) {
    logger.error("Subscription DELETE error", errorContext(err))
    return authErrorResponse(err, "Failed to cancel subscription")
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const parsed = await parseJson(request, subscriptionUsagePatchSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
      include: { provider: true, plan: true },
    })

    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      )
    }

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        ...(body.usedMessages !== undefined && { usedMessages: body.usedMessages }),
        ...(body.usedTokens !== undefined && { usedTokens: body.usedTokens }),
        ...(body.usedRequests !== undefined && { usedRequests: body.usedRequests }),
        ...(body.usedCredits !== undefined && { usedCredits: body.usedCredits }),
      },
    })

    const ratios: Array<{ label: string; pct: number }> = []
    if (existing.quotaMessages && (subscription.usedMessages ?? 0) > 0) {
      ratios.push({ label: "messages", pct: ((subscription.usedMessages ?? 0) / existing.quotaMessages) * 100 })
    }
    if (existing.quotaRequests && (subscription.usedRequests ?? 0) > 0) {
      ratios.push({ label: "requests", pct: ((subscription.usedRequests ?? 0) / existing.quotaRequests) * 100 })
    }
    if (existing.quotaTokens && (subscription.usedTokens ?? 0) > 0) {
      ratios.push({ label: "tokens", pct: ((subscription.usedTokens ?? 0) / existing.quotaTokens) * 100 })
    }
    const highest = ratios.sort((a, b) => b.pct - a.pct)[0]
    if (highest && highest.pct >= 80) {
      await emitNotification(user.id, {
        type: "quota_warning",
        title: `${existing.provider.name} ${highest.label} at ${Math.round(highest.pct)}%`,
        message: `${existing.customPlanName || existing.plan?.name || "Subscription"} has reached ${Math.round(highest.pct)}% of its ${highest.label} quota.`,
        severity: highest.pct >= 100 ? "critical" : "warning",
        actionUrl: "/subscriptions",
      })
    }

    return NextResponse.json({ data: subscription })
  } catch (err: unknown) {
    logger.error("Subscription PATCH error", errorContext(err))
    return authErrorResponse(err, "Failed to update usage")
  }
}
