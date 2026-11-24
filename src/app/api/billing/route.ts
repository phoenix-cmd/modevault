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

const billingUpdateSchema = z.object({
  id: z.string().min(1).max(128),
  status: z.enum(["paid", "pending", "failed"]).optional(),
  paymentMethod: z.string().max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
})

function serializeBillingRecord<
  T extends {
    description: string | null
    subscription?: {
      customPlanName?: string | null
      plan?: { name?: string | null } | null
      [key: string]: unknown
    } | null
  }
>(record: T) {
  const meta = unpackBillingDescription(record.description)
  const sub = record.subscription
    ? {
        ...record.subscription,
        planName:
          record.subscription.customPlanName ||
          record.subscription.plan?.name ||
          "Standard Plan",
      }
    : null
  return {
    ...record,
    ...(record.subscription !== undefined ? { subscription: sub } : {}),
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
            plan: true,
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

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, billingUpdateSchema)
    if ("response" in parsed) return parsed.response
    const { id, status, paymentMethod, description } = parsed.data

    const existing = await prisma.billingRecord.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 })
    }

    const currentMeta = unpackBillingDescription(existing.description)
    const packedDescription = packBillingDescription({
      description: description !== undefined ? description : currentMeta.notes,
      status: status ?? (currentMeta.status as "paid" | "pending" | "failed"),
      paymentMethod: paymentMethod !== undefined ? paymentMethod : currentMeta.paymentMethod,
    })

    const updated = await prisma.billingRecord.update({
      where: { id: existing.id },
      data: { description: packedDescription },
      include: {
        subscription: {
          include: { provider: true, plan: true },
        },
      },
    })

    return NextResponse.json({ data: serializeBillingRecord(updated) })
  } catch (err: unknown) {
    logger.error("Billing PATCH error", errorContext(err))
    return authErrorResponse(err, "Failed to update billing record")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const id = new URL(request.url).searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "Billing record id is required" }, { status: 400 })
    }

    const existing = await prisma.billingRecord.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 })
    }

    await prisma.billingRecord.delete({ where: { id: existing.id } })
    return NextResponse.json({ data: { id: existing.id, deleted: true } })
  } catch (err: unknown) {
    logger.error("Billing DELETE error", errorContext(err))
    return authErrorResponse(err, "Failed to delete billing record")
  }
}
