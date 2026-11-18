import { prisma } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"

export type SuggestionSeverity = "critical" | "warning" | "opportunity" | "info"

export type SuggestionCategory =
  | "quota"
  | "spend"
  | "unused"
  | "renewal"
  | "optimization"

export interface Suggestion {
  id: string
  category: SuggestionCategory
  severity: SuggestionSeverity
  title: string
  description: string
  actionLabel: string
  actionHref: string
  estimatedMonthlySavings?: number
  currency: string
}

interface QuotaEntry {
  label: string
  used: number
  limit: number
  percent: number
}

function monthlyEquivalent(price: number, billingCycle: string): number {
  if (billingCycle === "yearly") return price / 12
  return price
}

function quotaEntries(sub: {
  quotaMessages: number | null
  quotaTokens: number | null
  quotaRequests: number | null
  quotaCredits: number | null
  usedMessages: number | null
  usedTokens: number | null
  usedRequests: number | null
  usedCredits: number | null
}): QuotaEntry[] {
  const entries: QuotaEntry[] = []
  const add = (label: string, limit: number | null, used: number | null) => {
    if (!limit || limit <= 0) return
    const consumed = used ?? 0
    entries.push({
      label,
      used: consumed,
      limit,
      percent: Math.round((consumed / limit) * 100),
    })
  }
  add("messages", sub.quotaMessages, sub.usedMessages)
  add("tokens", sub.quotaTokens, sub.usedTokens)
  add("requests", sub.quotaRequests, sub.usedRequests)
  add("credits", sub.quotaCredits, sub.usedCredits)
  return entries
}

const SEVERITY_WEIGHT: Record<SuggestionSeverity, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  info: 3,
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

export async function generateSuggestions(userId: string): Promise<Suggestion[]> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [subscriptions, apiAccounts, models] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: { provider: true, plan: true },
    }),
    prisma.apiAccount.findMany({
      where: { userId },
      include: {
        provider: true,
        apiUsageRecords: {
          where: { date: { gte: thirtyDaysAgo } },
          select: { totalTokens: true, inputTokens: true, outputTokens: true },
        },
      },
    }),
    prisma.aiModel.findMany({ orderBy: { outputPricePerM: "asc" } }),
  ])

  const suggestions: Suggestion[] = []
  const active = subscriptions.filter((sub) => sub.status === "active")
  const userCurrency = active[0]?.currency || subscriptions[0]?.currency || "INR"

  const monthlySpend = active.reduce(
    (sum, sub) => sum + monthlyEquivalent(sub.price, sub.billingCycle),
    0
  )

  // 1. Quota pressure — flag plans approaching or exceeding their tracked limits.
  for (const sub of active) {
    const entries = quotaEntries(sub)
    if (entries.length === 0) continue
    const worst = entries.reduce((max, entry) => (entry.percent > max.percent ? entry : max))
    if (worst.percent < 75) continue

    const planLabel = sub.customPlanName || sub.plan?.name || "plan"
    suggestions.push({
      id: `quota-${sub.id}`,
      category: "quota",
      severity: worst.percent >= 90 ? "critical" : "warning",
      title:
        worst.percent >= 100
          ? `${sub.provider.name} ${worst.label} quota exhausted`
          : `${sub.provider.name} ${worst.label} at ${worst.percent}%`,
      description: `${planLabel} has used ${worst.used.toLocaleString()} of ${worst.limit.toLocaleString()} ${worst.label}. ${
        worst.percent >= 90
          ? "Consider upgrading or routing overflow traffic to a secondary provider."
          : "Watch this closely to avoid throttling before the next reset."
      }`,
      actionLabel: "Review usage",
      actionHref: `/subscriptions?highlight=${sub.id}`,
      currency: sub.currency,
    })
  }

  // 2. Unused subscriptions — active plans with tracked quotas but zero consumption.
  for (const sub of active) {
    const entries = quotaEntries(sub)
    if (entries.length === 0) continue
    const totalUsed = entries.reduce((sum, entry) => sum + entry.used, 0)
    if (totalUsed > 0) continue
    if (sub.createdAt > thirtyDaysAgo) continue

    const savings = monthlyEquivalent(sub.price, sub.billingCycle)
    suggestions.push({
      id: `unused-${sub.id}`,
      category: "unused",
      severity: savings >= 500 ? "warning" : "info",
      title: `${sub.provider.name} plan shows no usage`,
      description: `${sub.customPlanName || sub.plan?.name || "Subscription"} has recorded zero usage in its tracked quota. Pause or cancel it if it is no longer needed.`,
      actionLabel: "Manage subscription",
      actionHref: `/subscriptions?highlight=${sub.id}`,
      estimatedMonthlySavings: savings > 0 ? Math.round(savings) : undefined,
      currency: sub.currency,
    })
  }

  // 3. Renewals due within 7 days.
  for (const sub of active) {
    if (!sub.renewalDate) continue
    const days = daysBetween(now, sub.renewalDate)
    if (days < 0 || days > 7) continue
    const price = monthlyEquivalent(sub.price, sub.billingCycle)
    suggestions.push({
      id: `renewal-${sub.id}`,
      category: "renewal",
      severity: days <= 2 ? "warning" : "info",
      title: `${sub.provider.name} renews ${days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
      description: `${sub.customPlanName || sub.plan?.name || "Plan"} will renew at ${formatCurrency(price, sub.currency)}/mo equivalent. Confirm the plan is still needed before the charge.`,
      actionLabel: "Review renewal",
      actionHref: `/subscriptions?highlight=${sub.id}`,
      currency: sub.currency,
    })
  }

  // 4. Provider concentration — one vendor dominating the monthly bill.
  if (monthlySpend > 0) {
    const byProvider = new Map<string, number>()
    for (const sub of active) {
      const name = sub.provider.name
      byProvider.set(
        name,
        (byProvider.get(name) ?? 0) + monthlyEquivalent(sub.price, sub.billingCycle)
      )
    }
    const [topProvider, topSpend] = Array.from(byProvider.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0] ?? ["", 0]
    const share = monthlySpend > 0 ? topSpend / monthlySpend : 0
    if (topProvider && share >= 0.5 && byProvider.size > 1) {
      suggestions.push({
        id: "provider-concentration",
        category: "spend",
        severity: "info",
        title: `${topProvider} is ${Math.round(share * 100)}% of your AI spend`,
        description: `Monthly run-rate is ${formatCurrency(monthlySpend, userCurrency)}. Diversifying across providers reduces pricing and availability risk.`,
        actionLabel: "Compare providers",
        actionHref: "/analytics",
        currency: userCurrency,
      })
    }
  }

  // 5. Annual billing opportunity.
  const monthlyPlans = active.filter(
    (sub) => sub.billingCycle === "monthly" && sub.price > 0
  )
  if (monthlyPlans.length > 0) {
    const monthlyTotal = monthlyPlans.reduce((sum, sub) => sum + sub.price, 0)
    const savings = Math.round(monthlyTotal * 0.2)
    if (savings > 0) {
      suggestions.push({
        id: "annual-billing",
        category: "optimization",
        severity: "opportunity",
        title: `Estimated ${formatCurrency(savings, userCurrency)}/mo available from annual billing`,
        description: `${monthlyPlans.length} active plan${monthlyPlans.length === 1 ? " is" : "s are"} billed monthly. Annual plans typically discount 15–20% for the same entitlement.`,
        actionLabel: "Review plans",
        actionHref: "/subscriptions",
        estimatedMonthlySavings: savings,
        currency: userCurrency,
      })
    }
  }

  // 6. Cheaper model recommendation from the live catalog + recent token volume.
  if (models.length >= 2) {
    const blended = (input: number, output: number) => input * 0.75 + output * 0.25
    const cheapest = models.reduce((min, model) =>
      blended(model.inputPricePerM, model.outputPricePerM) <
      blended(min.inputPricePerM, min.outputPricePerM)
        ? model
        : min
    )
    const premium = models.reduce((max, model) =>
      blended(model.inputPricePerM, model.outputPricePerM) >
      blended(max.inputPricePerM, max.outputPricePerM)
        ? model
        : max
    )
    const recentTokens = apiAccounts.reduce(
      (sum, account) =>
        sum +
        account.apiUsageRecords.reduce(
          (inner, record) =>
            inner +
            (record.totalTokens ??
              (record.inputTokens ?? 0) + (record.outputTokens ?? 0)),
          0
        ),
      0
    )

    const priceGap = blended(premium.inputPricePerM, premium.outputPricePerM) -
      blended(cheapest.inputPricePerM, cheapest.outputPricePerM)

    if (priceGap > 0) {
      const estimatedSavings =
        recentTokens > 0 ? Math.round((priceGap * recentTokens) / 1_000_000) : undefined
      suggestions.push({
        id: "cheaper-model",
        category: "optimization",
        severity: "opportunity",
        title: `${cheapest.name} costs ${Math.round((priceGap / blended(premium.inputPricePerM, premium.outputPricePerM)) * 100)}% less than ${premium.name}`,
        description:
          recentTokens > 0
            ? `You processed ${recentTokens.toLocaleString()} tokens in the last 30 days. Routing batch or classification workloads to ${cheapest.name} could lower model spend.`
            : `${cheapest.name} has a lower blended token price than ${premium.name}. Use it for classification, routing, and high-volume batch work.`,
        actionLabel: "Open model matrix",
        actionHref: "/models",
        estimatedMonthlySavings:
          estimatedSavings && estimatedSavings > 0 ? estimatedSavings : undefined,
        currency: "USD",
      })
    }
  }

  // 7. Dormant API accounts.
  for (const account of apiAccounts) {
    if (account.createdAt > thirtyDaysAgo) continue
    const usage = account.apiUsageRecords.length
    if (usage > 0 || (account.totalSpent ?? 0) > 0) continue
    suggestions.push({
      id: `dormant-api-${account.id}`,
      category: "unused",
      severity: "info",
      title: `${account.provider.name} API account is idle`,
      description: `${account.accountName || "API account"} has no recorded usage or spend in the last 30 days. Remove it or connect its usage integration to keep reporting accurate.`,
      actionLabel: "Open API usage",
      actionHref: "/api-usage",
      currency: account.currency,
    })
  }

  return suggestions.sort((a, b) => {
    const bySeverity = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]
    if (bySeverity !== 0) return bySeverity
    return (b.estimatedMonthlySavings ?? 0) - (a.estimatedMonthlySavings ?? 0)
  })
}
