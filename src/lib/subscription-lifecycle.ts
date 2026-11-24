import { prisma } from "@/lib/db"
import { emitNotification } from "@/lib/notifications"

function addBillingInterval(date: Date, cycle: string): Date {
  const next = new Date(date.getTime())
  if (cycle === "yearly") {
    next.setFullYear(next.getFullYear() + 1)
  } else {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

function nextResetDate(from: Date, period: string | null): Date {
  const next = new Date(from.getTime())
  if (period === "daily") next.setDate(next.getDate() + 1)
  else if (period === "weekly") next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)
  return next
}

/**
 * Advance past-due active subscription renewals, record corresponding BillingRecord charges,
 * reset expired usage quotas, and emit upcoming renewal alerts.
 */
export async function syncSubscriptionRenewals(userId: string): Promise<{
  renewalsProcessed: number
  quotasReset: number
  alertsEmitted: number
}> {
  const now = new Date()
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const subs = await prisma.subscription.findMany({
    where: { userId, status: "active" },
    include: { provider: true, plan: true },
  })

  let renewalsProcessed = 0
  let quotasReset = 0
  let alertsEmitted = 0

  for (const sub of subs) {
    if (sub.renewalDate && sub.renewalDate < now && sub.billingCycle !== "custom") {
      let nextRenewal = addBillingInterval(sub.renewalDate, sub.billingCycle)
      let guard = 0
      while (nextRenewal < now && guard < 12) {
        nextRenewal = addBillingInterval(nextRenewal, sub.billingCycle)
        guard += 1
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { renewalDate: nextRenewal },
      })

      if (sub.price > 0) {
        await prisma.billingRecord.create({
          data: {
            userId,
            subscriptionId: sub.id,
            type: "subscription_payment",
            amount: sub.price,
            currency: sub.currency,
            billingDate: sub.renewalDate,
            description: `Auto-recorded renewal for ${sub.provider.name} (${sub.customPlanName || sub.plan?.name || sub.billingCycle})`,
          },
        })
      }
      renewalsProcessed += 1
    } else if (sub.renewalDate && sub.renewalDate >= now && sub.renewalDate <= threeDaysOut) {
      await emitNotification(userId, {
        type: "renewal_reminder",
        title: `${sub.provider.name} renews soon`,
        message: `${sub.customPlanName || sub.plan?.name || "Subscription"} is scheduled to renew on ${sub.renewalDate.toDateString()} (${sub.currency} ${sub.price}).`,
        severity: "warning",
        actionUrl: "/calendar",
      })
      alertsEmitted += 1
    }

    if (sub.quotaResetDate && sub.quotaResetDate < now) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          usedMessages: 0,
          usedTokens: 0,
          usedRequests: 0,
          usedCredits: 0,
          quotaResetDate: nextResetDate(now, sub.quotaResetPeriod),
        },
      })
      quotasReset += 1
    }
  }

  return { renewalsProcessed, quotasReset, alertsEmitted }
}
