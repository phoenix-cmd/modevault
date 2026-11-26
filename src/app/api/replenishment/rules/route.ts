import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"

const ruleCreateSchema = z.object({
  apiAccountId: z.string().min(1).max(128),
  enabled: z.boolean().optional(),
  thresholdAmount: z.coerce.number().finite().nonnegative().max(1_000_000),
  topUpAmount: z.coerce.number().finite().positive().max(1_000_000),
  currency: z.string().trim().min(1).max(12).optional(),
  maxMonthlySpend: z.coerce.number().finite().positive().max(10_000_000),
  cooldownMinutes: z.coerce.number().int().min(1).max(43200).optional(),
  paymentMethodRef: z.string().trim().max(120).nullable().optional(),
  autoPayAuthorized: z.boolean().optional(),
  notifyOnLow: z.boolean().optional(),
  notifyOnSuccess: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
})

const rulePatchSchema = z.object({
  id: z.string().min(1).max(128),
  enabled: z.boolean().optional(),
  thresholdAmount: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  topUpAmount: z.coerce.number().finite().positive().max(1_000_000).optional(),
  maxMonthlySpend: z.coerce.number().finite().positive().max(10_000_000).optional(),
  cooldownMinutes: z.coerce.number().int().min(1).max(43200).optional(),
  paymentMethodRef: z.string().trim().max(120).nullable().optional(),
  autoPayAuthorized: z.boolean().optional(),
  notifyOnLow: z.boolean().optional(),
  notifyOnSuccess: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const rules = await prisma.replenishmentRule.findMany({
      where: { userId: user.id },
      include: {
        apiAccount: {
          include: { provider: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: rules })
  } catch (err) {
    return authErrorResponse(err, "Failed to load replenishment rules")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, ruleCreateSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const account = await prisma.apiAccount.findFirst({
      where: { id: body.apiAccountId, userId: user.id },
      include: { provider: true },
    })
    if (!account) {
      return NextResponse.json({ error: "API account not found" }, { status: 404 })
    }

    if (body.autoPayAuthorized && !body.paymentMethodRef?.trim()) {
      return NextResponse.json(
        { error: "A payment method reference (e.g. pm_card_...) is required when authorizing auto-pay." },
        { status: 422 }
      )
    }

    const existing = await prisma.replenishmentRule.findFirst({
      where: { userId: user.id, apiAccountId: account.id },
    })

    const dataPayload = {
      providerSlug: account.provider.slug,
      enabled: body.enabled ?? true,
      thresholdAmount: body.thresholdAmount,
      topUpAmount: body.topUpAmount,
      currency: (body.currency || account.currency || "USD").toUpperCase(),
      maxMonthlySpend: body.maxMonthlySpend,
      cooldownMinutes: body.cooldownMinutes ?? 60,
      paymentMethodRef: body.paymentMethodRef?.trim() || null,
      autoPayAuthorized: Boolean(body.autoPayAuthorized),
      autoPayAuthorizedAt: body.autoPayAuthorized ? new Date() : null,
      notifyOnLow: body.notifyOnLow ?? true,
      notifyOnSuccess: body.notifyOnSuccess ?? true,
      notifyOnFailure: body.notifyOnFailure ?? true,
    }

    const rule = existing
      ? await prisma.replenishmentRule.update({
          where: { id: existing.id },
          data: dataPayload,
          include: { apiAccount: { include: { provider: true } } },
        })
      : await prisma.replenishmentRule.create({
          data: {
            userId: user.id,
            apiAccountId: account.id,
            ...dataPayload,
          },
          include: { apiAccount: { include: { provider: true } } },
        })

    return NextResponse.json({ data: rule }, { status: existing ? 200 : 201 })
  } catch (err) {
    return authErrorResponse(err, "Failed to save replenishment rule")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, rulePatchSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const existing = await prisma.replenishmentRule.findFirst({
      where: { id: body.id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Replenishment rule not found" }, { status: 404 })
    }

    const nextPaymentRef =
      body.paymentMethodRef !== undefined ? body.paymentMethodRef : existing.paymentMethodRef
    if (body.autoPayAuthorized === true && !nextPaymentRef?.trim()) {
      return NextResponse.json(
        { error: "Provide a payment method reference before authorizing auto-pay." },
        { status: 422 }
      )
    }

    const updated = await prisma.replenishmentRule.update({
      where: { id: existing.id },
      data: {
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.thresholdAmount !== undefined && { thresholdAmount: body.thresholdAmount }),
        ...(body.topUpAmount !== undefined && { topUpAmount: body.topUpAmount }),
        ...(body.maxMonthlySpend !== undefined && { maxMonthlySpend: body.maxMonthlySpend }),
        ...(body.cooldownMinutes !== undefined && { cooldownMinutes: body.cooldownMinutes }),
        ...(body.paymentMethodRef !== undefined && { paymentMethodRef: body.paymentMethodRef }),
        ...(body.autoPayAuthorized !== undefined && {
          autoPayAuthorized: body.autoPayAuthorized,
          autoPayAuthorizedAt: body.autoPayAuthorized ? new Date() : null,
        }),
        ...(body.notifyOnLow !== undefined && { notifyOnLow: body.notifyOnLow }),
        ...(body.notifyOnSuccess !== undefined && { notifyOnSuccess: body.notifyOnSuccess }),
        ...(body.notifyOnFailure !== undefined && { notifyOnFailure: body.notifyOnFailure }),
      },
      include: { apiAccount: { include: { provider: true } } },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    return authErrorResponse(err, "Failed to update replenishment rule")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const id = new URL(req.url).searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 })
    }
    const deleted = await prisma.replenishmentRule.deleteMany({
      where: { id, userId: user.id },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Replenishment rule not found" }, { status: 404 })
    }
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (err) {
    return authErrorResponse(err, "Failed to delete replenishment rule")
  }
}
