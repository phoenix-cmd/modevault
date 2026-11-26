import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { confirmManualTopUp, evaluateReplenishmentForAccount } from "@/lib/replenishment"
import { checkRateLimit, parseJson } from "@/lib/validation"

const eventActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("evaluate"),
    apiAccountId: z.string().min(1).max(128),
    idempotencyKey: z.string().min(4).max(128).optional(),
    forcePendingCheckout: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("manual_topup"),
    apiAccountId: z.string().min(1).max(128),
    eventId: z.string().max(128).optional(),
    amount: z.coerce.number().finite().positive().max(1_000_000),
    currency: z.string().trim().min(1).max(12).optional(),
    receiptRef: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
])

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const events = await prisma.replenishmentEvent.findMany({
      where: { userId: user.id },
      include: {
        apiAccount: { include: { provider: true } },
        billingRecord: true,
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    })
    return NextResponse.json({ data: events })
  } catch (err) {
    return authErrorResponse(err, "Failed to load replenishment events")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const limit = checkRateLimit(`replenish:user:${user.id}`, 20, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded for replenishment requests." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      )
    }

    const parsed = await parseJson(req, eventActionSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const ownedAccount = await prisma.apiAccount.findFirst({
      where: { id: body.apiAccountId, userId: user.id },
    })
    if (!ownedAccount) {
      return NextResponse.json({ error: "API account not found" }, { status: 404 })
    }

    if (body.action === "evaluate") {
      const outcome = await evaluateReplenishmentForAccount(body.apiAccountId, "manual_trigger", {
        idempotencyKey: body.idempotencyKey,
        forcePendingCheckout: body.forcePendingCheckout,
      })
      return NextResponse.json({ data: outcome }, { status: outcome.triggered ? 201 : 200 })
    }

    const manual = await confirmManualTopUp(user.id, {
      apiAccountId: body.apiAccountId,
      eventId: body.eventId,
      amount: body.amount,
      currency: body.currency,
      receiptRef: body.receiptRef,
      notes: body.notes,
    })

    return NextResponse.json({ data: manual }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err, "Replenishment operation failed")
  }
}
