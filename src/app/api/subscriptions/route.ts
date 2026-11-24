import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { syncSubscriptionRenewals } from "@/lib/subscription-lifecycle"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const subscriptionCreateSchema = z.object({
  providerId: z.string().min(1).max(128),
  planId: z.string().max(128).nullable().optional(),
  customPlanName: z.string().max(160).nullable().optional(),
  type: z.enum(["consumer", "api"]),
  status: z.enum(["active", "paused", "expired", "cancelled", "trial"]).optional(),
  billingCycle: z.enum(["monthly", "yearly", "custom"]).optional(),
  price: z.coerce.number().finite().nonnegative().max(10_000_000),
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    if (new URL(request.url).searchParams.get("sync") === "1") {
      await syncSubscriptionRenewals(user.id)
    }
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        provider: true,
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: subscriptions })
  } catch (err: unknown) {
    logger.error("Subscriptions GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch subscriptions")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, subscriptionCreateSchema)
    if ("response" in parsed) return parsed.response

    const {
      providerId,
      type,
      price,
      startDate,
      billingCycle,
      planId,
      customPlanName,
      currency,
      status,
      renewalDate,
      expiryDate,
      quotaMessages,
      quotaTokens,
      quotaRequests,
      quotaCredits,
      quotaResetPeriod,
      notes,
    } = parsed.data

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        providerId,
        planId: planId ?? null,
        customPlanName: customPlanName ?? null,
        type,
        status: status ?? "active",
        billingCycle: billingCycle ?? "monthly",
        price,
        currency: currency ?? "INR",
        startDate: startDate ? new Date(startDate) : new Date(),
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quotaMessages: quotaMessages ?? null,
        quotaTokens: quotaTokens ?? null,
        quotaRequests: quotaRequests ?? null,
        quotaCredits: quotaCredits ?? null,
        quotaResetPeriod: quotaResetPeriod ?? null,
        notes: notes ?? null,
      },
      include: { provider: true, plan: true },
    })

    return NextResponse.json({ data: subscription }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Subscriptions POST error", errorContext(err))
    return authErrorResponse(err, "Failed to create subscription")
  }
}
