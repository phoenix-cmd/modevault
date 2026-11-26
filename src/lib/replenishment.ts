import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import { packBillingDescription, unpackBillingDescription } from "@/lib/billing-meta"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { getProviderAdapter } from "@/lib/providers/adapter"
import { emitNotification } from "@/lib/notifications"

export function getWebhookSigningSecret(): string {
  return (
    process.env.REPLENISHMENT_WEBHOOK_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-insecure-secret-change-in-prod"
  )
}

export function signReplenishmentWebhookPayload(rawBody: string, timestampSec?: number): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000)
  const hmac = crypto
    .createHmac("sha256", getWebhookSigningSecret())
    .update(`${ts}.${rawBody}`, "utf8")
    .digest("hex")
  return `t=${ts},v1=${hmac}`
}

export function verifyReplenishmentWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  maxAgeSec = 300
): boolean {
  if (!signatureHeader) return false
  const parts = new Map<string, string>()
  for (const piece of signatureHeader.split(",")) {
    const [k, v] = piece.trim().split("=")
    if (k && v) parts.set(k, v)
  }
  const tsRaw = parts.get("t")
  const v1 = parts.get("v1")
  if (!tsRaw || !v1) return false

  const ts = Number.parseInt(tsRaw, 10)
  if (!Number.isFinite(ts)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > maxAgeSec) return false

  const expectedHex = crypto
    .createHmac("sha256", getWebhookSigningSecret())
    .update(`${ts}.${rawBody}`, "utf8")
    .digest("hex")

  const providedBuf = Buffer.from(v1, "utf8")
  const expectedBuf = Buffer.from(expectedHex, "utf8")
  if (providedBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

async function getMonthlySpendForAccount(userId: string, apiAccountId: string): Promise<number> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const events = await prisma.replenishmentEvent.findMany({
    where: {
      userId,
      apiAccountId,
      createdAt: { gte: monthStart },
      status: { in: ["confirmed", "awaiting_webhook", "pending"] },
    },
    select: { requestedAmount: true, creditedAmount: true, status: true },
  })

  return events.reduce(
    (sum, ev) => sum + (ev.status === "confirmed" ? (ev.creditedAmount ?? ev.requestedAmount) : ev.requestedAmount),
    0
  )
}

export async function evaluateReplenishmentForAccount(
  apiAccountId: string,
  triggerReason: "low_balance_sync" | "manual_trigger" | "execution_guardrail" = "low_balance_sync",
  opts: { idempotencyKey?: string; forcePendingCheckout?: boolean } = {}
) {
  const account = await prisma.apiAccount.findUnique({
    where: { id: apiAccountId },
    include: { provider: true },
  })
  if (!account) {
    return { triggered: false, reason: "Account not found", event: null }
  }

  const rule = await prisma.replenishmentRule.findFirst({
    where: {
      userId: account.userId,
      apiAccountId: account.id,
      enabled: true,
    },
  })

  if (!rule) {
    return { triggered: false, reason: "No enabled replenishment rule for account", event: null }
  }

  const balance = account.prepaidBalance ?? 0
  if (triggerReason !== "manual_trigger" && balance >= rule.thresholdAmount) {
    return { triggered: false, reason: "Balance above threshold", event: null }
  }

  if (
    triggerReason !== "manual_trigger" &&
    rule.lastTriggeredAt &&
    Date.now() - rule.lastTriggeredAt.getTime() < rule.cooldownMinutes * 60_000
  ) {
    return { triggered: false, reason: "Cooldown active", event: null }
  }

  const idempotencyKey =
    opts.idempotencyKey ||
    `rep_${account.id}_${Math.floor(Date.now() / (rule.cooldownMinutes * 60_000 || 60_000))}_${triggerReason}`

  const existingByKey = await prisma.replenishmentEvent.findUnique({
    where: { idempotencyKey },
  })
  if (existingByKey) {
    return { triggered: true, duplicate: true, event: existingByKey }
  }

  const monthlySpent = await getMonthlySpendForAccount(account.userId, account.id)
  const cap = getProviderCapability(account.provider.slug)

  if (monthlySpent + rule.topUpAmount > rule.maxMonthlySpend) {
    const cappedEvent = await prisma.replenishmentEvent.create({
      data: {
        userId: account.userId,
        ruleId: rule.id,
        apiAccountId: account.id,
        providerSlug: account.provider.slug,
        idempotencyKey,
        triggerReason,
        mode: "manual_alert",
        status: "capped",
        requestedAmount: rule.topUpAmount,
        currency: rule.currency,
        balanceBefore: balance,
        checkoutUrl: cap.billingUrl,
        failureReason: `Monthly replenishment cap (${rule.maxMonthlySpend} ${rule.currency}) exceeded (spent ${monthlySpent.toFixed(2)}).`,
      },
    })
    if (rule.notifyOnFailure) {
      await emitNotification(account.userId, {
        type: "credit_low",
        title: `Replenishment capped for ${account.accountName || account.provider.name}`,
        message: `Balance is ${balance.toFixed(2)} ${account.currency}, but monthly auto-replenishment cap (${rule.maxMonthlySpend} ${rule.currency}) was reached.`,
        severity: "critical",
        actionUrl: "/api-usage",
      })
    }
    return { triggered: true, capped: true, event: cappedEvent }
  }

  const hasAutoPayApproval = Boolean(rule.autoPayAuthorized && rule.paymentMethodRef)
  const adapter = getProviderAdapter(account.provider.slug)
  const canUseCheckoutFlow =
    hasAutoPayApproval && (cap.canReplenish || Boolean(process.env.STRIPE_SECRET_KEY) || Boolean(opts.forcePendingCheckout))

  if (canUseCheckoutFlow) {
    if (cap.canReplenish) {
      await adapter.triggerReplenishment(
        { providerSlug: account.provider.slug },
        {
          amount: rule.topUpAmount,
          currency: rule.currency,
          idempotencyKey,
          paymentMethodRef: rule.paymentMethodRef,
        }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const billing = await tx.billingRecord.create({
        data: {
          userId: account.userId,
          type: "api_topup",
          amount: rule.topUpAmount,
          currency: rule.currency,
          billingDate: new Date(),
          description: packBillingDescription({
            description: `Pending auto-replenishment for ${account.accountName || account.provider.name} [awaiting_webhook]`,
            status: "pending",
            paymentMethod: rule.paymentMethodRef,
          }),
          invoiceUrl: cap.billingUrl,
        },
      })

      const event = await tx.replenishmentEvent.create({
        data: {
          userId: account.userId,
          ruleId: rule.id,
          apiAccountId: account.id,
          billingRecordId: billing.id,
          providerSlug: account.provider.slug,
          idempotencyKey,
          triggerReason,
          mode: cap.canReplenish ? "programmatic_recharge" : "webhook_checkout",
          status: "awaiting_webhook",
          requestedAmount: rule.topUpAmount,
          currency: rule.currency,
          balanceBefore: balance,
          checkoutUrl: cap.billingUrl,
          metadataJson: JSON.stringify({
            paymentMethodRef: rule.paymentMethodRef,
            autoPayAuthorizedAt: rule.autoPayAuthorizedAt?.toISOString() || null,
          }),
        },
      })

      await tx.replenishmentRule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() },
      })

      return event
    })

    if (rule.notifyOnLow) {
      await emitNotification(account.userId, {
        type: "credit_low",
        title: `Auto top-up initiated for ${account.accountName || account.provider.name}`,
        message: `Requested ${rule.topUpAmount} ${rule.currency} replenishment (awaiting signed webhook confirmation; balance remains ${balance.toFixed(2)} until settled).`,
        severity: "warning",
        actionUrl: "/api-usage",
      })
    }

    return { triggered: true, awaitingWebhook: true, event: result }
  }

  // Honest manual fallback when provider has no programmatic recharge / checkout or auto-pay isn't authorized
  const manualReason = !hasAutoPayApproval
    ? "Explicit user auto-pay authorization and payment method reference are required before initiating billing."
    : `${cap.displayName} has no official programmatic recharge API. Complete top-up in the provider portal and record the receipt.`

  const manualEvent = await prisma.$transaction(async (tx) => {
    const event = await tx.replenishmentEvent.create({
      data: {
        userId: account.userId,
        ruleId: rule.id,
        apiAccountId: account.id,
        providerSlug: account.provider.slug,
        idempotencyKey,
        triggerReason,
        mode: "manual_alert",
        status: "manual_required",
        requestedAmount: rule.topUpAmount,
        currency: rule.currency,
        balanceBefore: balance,
        checkoutUrl: cap.billingUrl,
        failureReason: manualReason,
      },
    })
    await tx.replenishmentRule.update({
      where: { id: rule.id },
      data: { lastTriggeredAt: new Date() },
    })
    return event
  })

  if (rule.notifyOnLow) {
    await emitNotification(account.userId, {
      type: "credit_low",
      title: `Top-up required: ${account.accountName || account.provider.name}`,
      message: `Balance is ${balance.toFixed(2)} ${account.currency} (below ${rule.thresholdAmount}). ${manualReason}`,
      severity: "critical",
      actionUrl: "/api-usage",
    })
  }

  return { triggered: true, manualRequired: true, event: manualEvent }
}

export async function confirmReplenishmentWebhook(input: {
  idempotencyKey?: string
  eventId?: string
  status: "confirmed" | "failed"
  paidAmount?: number
  creditedAmount?: number
  currency?: string
  paymentProviderRef: string
  failureReason?: string
}) {
  const existing = input.eventId
    ? await prisma.replenishmentEvent.findUnique({
        where: { id: input.eventId },
        include: { rule: true, apiAccount: { include: { provider: true } }, billingRecord: true },
      })
    : input.idempotencyKey
      ? await prisma.replenishmentEvent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { rule: true, apiAccount: { include: { provider: true } }, billingRecord: true },
        })
      : null

  if (!existing) {
    return { found: false, alreadyProcessed: false, event: null }
  }

  if (existing.status === "confirmed") {
    return { found: true, alreadyProcessed: true, event: existing }
  }

  if (input.status === "failed") {
    const failedEvent = await prisma.$transaction(async (tx) => {
      if (existing.billingRecordId && existing.billingRecord) {
        const currentMeta = unpackBillingDescription(existing.billingRecord.description)
        await tx.billingRecord.update({
          where: { id: existing.billingRecordId },
          data: {
            description: packBillingDescription({
              description: `${currentMeta.notes || "Auto-replenishment"} [failed: ${input.failureReason || "payment declined"}]`,
              status: "failed",
              paymentMethod: input.paymentProviderRef,
            }),
          },
        })
      }

      return tx.replenishmentEvent.update({
        where: { id: existing.id },
        data: {
          status: "failed",
          paymentProviderRef: input.paymentProviderRef,
          failureReason: input.failureReason || "Webhook reported payment failure",
        },
      })
    })

    if (!existing.rule || existing.rule.notifyOnFailure) {
      await emitNotification(existing.userId, {
        type: "billing",
        title: `Replenishment failed for ${existing.providerSlug}`,
        message: input.failureReason || "Payment webhook failed. Prepaid balance was not credited.",
        severity: "critical",
        actionUrl: "/api-usage",
      })
    }

    return { found: true, alreadyProcessed: false, event: failedEvent }
  }

  const creditAmt = input.creditedAmount ?? input.paidAmount ?? existing.requestedAmount
  const paidAmt = input.paidAmount ?? creditAmt
  if (!Number.isFinite(creditAmt) || creditAmt <= 0 || Math.abs(paidAmt - creditAmt) > 0.05) {
    throw new Error(`Reconciliation mismatch: paid=${paidAmt}, credited=${creditAmt}`)
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    const account = existing.apiAccountId
      ? await tx.apiAccount.findUnique({ where: { id: existing.apiAccountId } })
      : null
    const balanceBefore = account?.prepaidBalance ?? existing.balanceBefore ?? 0
    const balanceAfter = Number((balanceBefore + creditAmt).toFixed(4))

    let billingId = existing.billingRecordId
    if (billingId && existing.billingRecord) {
      await tx.billingRecord.update({
        where: { id: billingId },
        data: {
          amount: paidAmt,
          currency: input.currency || existing.currency,
          description: packBillingDescription({
            description: `Confirmed auto-replenishment (${input.paymentProviderRef})`,
            status: "paid",
            paymentMethod: input.paymentProviderRef,
          }),
        },
      })
    } else {
      const createdBilling = await tx.billingRecord.create({
        data: {
          userId: existing.userId,
          type: "api_topup",
          amount: paidAmt,
          currency: input.currency || existing.currency,
          billingDate: new Date(),
          description: packBillingDescription({
            description: `Confirmed auto-replenishment (${input.paymentProviderRef})`,
            status: "paid",
            paymentMethod: input.paymentProviderRef,
          }),
        },
      })
      billingId = createdBilling.id
    }

    if (account) {
      await tx.apiAccount.update({
        where: { id: account.id },
        data: {
          prepaidBalance: balanceAfter,
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
        },
      })

      await tx.usageSnapshot.create({
        data: {
          userId: existing.userId,
          providerSlug: existing.providerSlug,
          apiAccountId: account.id,
          periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          cost: 0,
          currency: input.currency || existing.currency,
          creditsRemaining: balanceAfter,
          creditsUsed: account.totalSpent ?? 0,
          dataSource: "live_api_sync",
          syncStatus: "ok",
          rawReferenceHash: crypto
            .createHash("sha256")
            .update(`${existing.id}:${input.paymentProviderRef}:${creditAmt}`)
            .digest("hex")
            .slice(0, 32),
        },
      })
    }

    return tx.replenishmentEvent.update({
      where: { id: existing.id },
      data: {
        status: "confirmed",
        billingRecordId: billingId,
        creditedAmount: creditAmt,
        balanceBefore,
        balanceAfter,
        paymentProviderRef: input.paymentProviderRef,
        confirmedAt: new Date(),
        failureReason: null,
      },
    })
  })

  if (!existing.rule || existing.rule.notifyOnSuccess) {
    await emitNotification(existing.userId, {
      type: "billing",
      title: `Replenishment confirmed (+${creditAmt.toFixed(2)} ${existing.currency})`,
      message: `${existing.providerSlug} wallet credited via ${input.paymentProviderRef}.`,
      severity: "info",
      actionUrl: "/api-usage",
    })
  }

  return { found: true, alreadyProcessed: false, event: confirmed }
}

export async function confirmManualTopUp(
  userId: string,
  input: {
    apiAccountId: string
    eventId?: string
    amount: number
    currency?: string
    receiptRef?: string
    notes?: string
  }
) {
  const account = await prisma.apiAccount.findFirst({
    where: { id: input.apiAccountId, userId },
    include: { provider: true },
  })
  if (!account) {
    throw new Error("API account not found")
  }

  const currency = (input.currency || account.currency || "USD").toUpperCase()
  const balanceBefore = account.prepaidBalance ?? 0
  const balanceAfter = Number((balanceBefore + input.amount).toFixed(4))

  return prisma.$transaction(async (tx) => {
    const billing = await tx.billingRecord.create({
      data: {
        userId,
        type: "api_topup",
        amount: input.amount,
        currency,
        billingDate: new Date(),
        description: packBillingDescription({
          description: `Manual top-up for ${account.accountName || account.provider.name} [manual_topup]${input.notes ? ` · ${input.notes}` : ""}`,
          status: "paid",
          paymentMethod: input.receiptRef || "manual_receipt",
        }),
      },
    })

    await tx.apiAccount.update({
      where: { id: account.id },
      data: {
        prepaidBalance: balanceAfter,
      },
    })

    await tx.usageSnapshot.create({
      data: {
        userId,
        providerSlug: account.provider.slug,
        apiAccountId: account.id,
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        cost: 0,
        currency,
        creditsRemaining: balanceAfter,
        creditsUsed: account.totalSpent ?? 0,
        dataSource: "manual",
        syncStatus: "ok",
      },
    })

    if (input.eventId) {
      const existingEvent = await tx.replenishmentEvent.findFirst({
        where: { id: input.eventId, userId },
      })
      if (existingEvent) {
        const updatedEvent = await tx.replenishmentEvent.update({
          where: { id: existingEvent.id },
          data: {
            mode: "manual_topup",
            status: "confirmed",
            billingRecordId: billing.id,
            creditedAmount: input.amount,
            balanceBefore,
            balanceAfter,
            paymentProviderRef: input.receiptRef || "manual_receipt",
            confirmedAt: new Date(),
            failureReason: null,
          },
        })
        return { event: updatedEvent, billing, balanceAfter }
      }
    }

    const event = await tx.replenishmentEvent.create({
      data: {
        userId,
        apiAccountId: account.id,
        billingRecordId: billing.id,
        providerSlug: account.provider.slug,
        idempotencyKey: `manual_${account.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        triggerReason: "manual_trigger",
        mode: "manual_topup",
        status: "confirmed",
        requestedAmount: input.amount,
        creditedAmount: input.amount,
        currency,
        balanceBefore,
        balanceAfter,
        paymentProviderRef: input.receiptRef || "manual_receipt",
        confirmedAt: new Date(),
      },
    })
    return { event, billing, balanceAfter }
  })
}
