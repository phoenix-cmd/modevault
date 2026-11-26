import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  confirmReplenishmentWebhook,
  verifyReplenishmentWebhookSignature,
} from "@/lib/replenishment"
import { logger, errorContext } from "@/lib/logger"

const webhookBodySchema = z.object({
  eventId: z.string().min(1).max(128).optional(),
  idempotencyKey: z.string().min(1).max(160).optional(),
  status: z.enum(["confirmed", "failed"]),
  paidAmount: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  creditedAmount: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  paymentProviderRef: z.string().trim().min(1).max(160),
  failureReason: z.string().trim().max(500).optional(),
})

export async function POST(req: NextRequest) {
  let rawBody = ""
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const signature = req.headers.get("x-modelvault-signature")
  if (!verifyReplenishmentWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid or expired replenishment webhook signature" },
      { status: 401 }
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON webhook payload" }, { status: 400 })
  }

  const parsed = webhookBodySchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid webhook payload" },
      { status: 422 }
    )
  }

  const body = parsed.data
  if (!body.eventId && !body.idempotencyKey) {
    return NextResponse.json(
      { error: "Either eventId or idempotencyKey is required" },
      { status: 422 }
    )
  }

  try {
    const result = await confirmReplenishmentWebhook({
      eventId: body.eventId,
      idempotencyKey: body.idempotencyKey,
      status: body.status,
      paidAmount: body.paidAmount,
      creditedAmount: body.creditedAmount,
      currency: body.currency,
      paymentProviderRef: body.paymentProviderRef,
      failureReason: body.failureReason,
    })

    if (!result.found) {
      return NextResponse.json({ error: "Replenishment event not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        alreadyProcessed: result.alreadyProcessed,
        event: result.event,
      },
    })
  } catch (err) {
    logger.error("Replenishment webhook processing error", errorContext(err))
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook reconciliation failed" },
      { status: 422 }
    )
  }
}
