import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { packBillingDescription, unpackBillingDescription } from "@/lib/billing-meta"
import { parseJson, safeUrlSchema } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const billingCreateSchema = z.object({
  subscriptionId: z.string().min(1).max(128).nullable().optional(),
  type: z.enum(["subscription_payment", "api_topup", "refund", "trial"]).optional(),
  amount: z.coerce.number().finite().positive().max(10_000_000),
  currency: z.string().trim().min(1).max(12).optional(),
  billingDate: z.string().max(64).optional(),
  description: z.string().max(1000).nullable().optional(),
  invoiceUrl: safeUrlSchema.nullable().optional(),
  status: z.enum(["paid", "pending", "failed"]).optional(),
  paymentMethod: z.string().max(120).nullable().optional(),
})

function serializeBillingRecord<
  T extends { description: string | null }
>(record: T) {
  const meta = unpackBillingDescription(record.description)
  return {
    ...record,
    status: meta.status,
    paymentMethod: meta.paymentMethod,
    notes: meta.notes,
    description: meta.notes,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100

    const where: Prisma.BillingRecordWhereInput = {
      userId: user.id,
    }

    if (type) {
      where.type = type
    }

    const records = await prisma.billingRecord.findMany({
      where,
      include: {
        subscription: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { billingDate: "desc" },
      take: limit,
    })

    return NextResponse.json({
      data: records.map((r) => serializeBillingRecord(r)),
    })
  } catch (err: unknown) {
    logger.error("Billing records GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch billing records")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, billingCreateSchema)
    if ("response" in parsed) return parsed.response
    const {
      subscriptionId,
      type,
      amount,
      currency,
      billingDate,
      description,
      invoiceUrl,
      status,
      paymentMethod,
    } = parsed.data

    if (subscriptionId) {
      const sub = await prisma.subscription.findFirst({
        where: { id: subscriptionId, userId: user.id },
      })
      if (!sub) {
        return NextResponse.json(
          { data: null, error: "Subscription not found" },
          { status: 404 }
        )
      }
    }

    const packedDescription = packBillingDescription({
      description,
      status,
      paymentMethod,
    })

    const record = await prisma.billingRecord.create({
      data: {
        userId: user.id,
        subscriptionId: subscriptionId || null,
        type: type || "subscription_payment",
        amount,
        currency: currency || "INR",
        billingDate: billingDate ? new Date(billingDate) : new Date(),
        description: packedDescription,
        invoiceUrl: invoiceUrl || null,
      },
    })

    return NextResponse.json({ data: serializeBillingRecord(record) }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Billing creation error", errorContext(err))
    return authErrorResponse(err, "Failed to create billing record")
  }
}
