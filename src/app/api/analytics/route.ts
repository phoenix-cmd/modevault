import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { unpackBillingDescription } from "@/lib/billing-meta"
import { convertCurrency, getExchangeRatesWithMeta } from "@/lib/currency"
import { formatCurrency } from "@/lib/utils"
import { getProviderCapability } from "@/lib/providers/capabilities"

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`
  return String(tokens)
}

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [fxMeta, dbUser, subscriptions, apiAccounts, billingRecords, apiUsageRecords, dbModels, usageSnapshots] =
      await Promise.all([
        getExchangeRatesWithMeta({ allowLiveRefresh: true }),
        prisma.user.findUnique({ where: { id: user.id }, select: { currency: true } }),
        prisma.subscription.findMany({
          where: { userId: user.id },
          include: { provider: true, plan: true },
        }),
        prisma.apiAccount.findMany({
          where: { userId: user.id },
          include: { provider: true },
        }),
        prisma.billingRecord.findMany({
          where: {
            userId: user.id,
            billingDate: { gte: sixMonthsAgo },
          },
          orderBy: { billingDate: "asc" },
        }),
        prisma.apiUsageRecord.findMany({
          where: {
            apiAccount: { userId: user.id },
            date: { gte: sixMonthsAgo },
          },
          include: {
            apiAccount: { include: { provider: true } },
          },
          orderBy: { date: "asc" },
        }),
        prisma.aiModel.findMany({
          orderBy: [{ providerName: "asc" }, { outputPricePerM: "asc" }],
        }),
        prisma.usageSnapshot.findMany({
          where: { userId: user.id },
          orderBy: { syncedAt: "desc" },
          take: 100,
        }),
      ])
    const rates = fxMeta.rates
    const baseCurrency = (
      dbUser?.currency || subscriptions[0]?.currency || apiAccounts[0]?.currency || "USD"
    ).toUpperCase()

    const months: Record<string, { month: string; subscriptions: number; api: number; total: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      months[key] = {
        month: d.toLocaleString("default", { month: "short" }),
        subscriptions: 0,
        api: 0,
        total: 0,
      }
    }

    for (const b of billingRecords) {
      const meta = unpackBillingDescription(b.description)
      if (meta.status === "failed") continue
      const key = `${b.billingDate.getFullYear()}-${String(b.billingDate.getMonth() + 1).padStart(2, "0")}`
      if (months[key]) {
        const rawInr = convertCurrency(b.amount, b.currency, "INR", rates)
        const inrAmount = b.type === "refund" ? -rawInr : rawInr
        if (b.type === "subscription_payment") {
          months[key].subscriptions += inrAmount
        } else {
          months[key].api += inrAmount
        }
        months[key].total += inrAmount
      }
    }

    for (const u of apiUsageRecords) {
      const key = `${u.date.getFullYear()}-${String(u.date.getMonth() + 1).padStart(2, "0")}`
      if (months[key] && (u.cost ?? 0) > 0) {
        const inrAmount = convertCurrency(u.cost ?? 0, u.currency, "INR", rates)
        months[key].api += inrAmount
        months[key].total += inrAmount
      }
    }

    const spendingTrends = Object.values(months).map((m) => ({
      month: m.month,
      subscriptions: Math.round(m.subscriptions),
      api: Math.round(m.api),
      total: Math.round(m.total),
    }))

    const providerMap: Record<string, { name: string; amount: number; color: string; count: number }> = {}
    let activeSubMonthlyTotal = 0
    let activeSubAnnualTotal = 0

    for (const s of subscriptions) {
      if (s.status === "active") {
        const inrPrice = convertCurrency(s.price, s.currency, "INR", rates)
        const monthly = s.billingCycle === "yearly" ? inrPrice / 12 : inrPrice
        const annual = s.billingCycle === "yearly" ? inrPrice : inrPrice * 12
        activeSubMonthlyTotal += monthly
        activeSubAnnualTotal += annual

        if (!providerMap[s.provider.name]) {
          providerMap[s.provider.name] = {
            name: s.provider.name,
            amount: 0,
            color: s.provider.brandColor || "#8b5cf6",
            count: 0,
          }
        }
        providerMap[s.provider.name].amount += monthly
        providerMap[s.provider.name].count += 1
      }
    }

    const providerBreakdown = Object.values(providerMap).sort((a, b) => b.amount - a.amount)

    let totalApiSpent = 0
    let totalApiBalance = 0
    for (const a of apiAccounts) {
      totalApiSpent += convertCurrency(a.totalSpent || 0, a.currency, "USD", rates)
      totalApiBalance += convertCurrency(a.prepaidBalance || 0, a.currency, "USD", rates)
    }

    const insights: Array<{
      type: "underutilized" | "overlapping" | "savings" | "heavy_spend"
      title: string
      description: string
      impact?: string
      severity: "low" | "medium" | "high"
    }> = []

    for (const s of subscriptions) {
      if (s.status === "active") {
        if (s.quotaMessages && s.usedMessages !== null) {
          const ratio = s.usedMessages / s.quotaMessages
          if (ratio < 0.25) {
            insights.push({
              type: "underutilized",
              title: `Low Message Quota Usage: ${s.customPlanName || s.provider.name}`,
              description: `Only ${s.usedMessages} of ${s.quotaMessages} messages used (${Math.round(ratio * 100)}%). Review if a lower tier or pay-per-use fits better.`,
              severity: "medium",
            })
          }
        }
        if (s.quotaRequests && s.usedRequests !== null) {
          const ratio = s.usedRequests / s.quotaRequests
          if (ratio < 0.25) {
            insights.push({
              type: "underutilized",
              title: `Low Request Quota Usage: ${s.customPlanName || s.provider.name}`,
              description: `Only ${s.usedRequests} of ${s.quotaRequests} requests consumed (${Math.round(ratio * 100)}%).`,
              severity: "medium",
            })
          }
        }
      }
    }

    const codingTools = subscriptions.filter(
      (s) =>
        s.status === "active" &&
        ["github-copilot", "cursor", "windsurf"].includes(s.provider.slug)
    )
    if (codingTools.length > 1) {
      const names = codingTools.map((c) => c.customPlanName || c.provider.name).join(", ")
      const totalCostBase = codingTools.reduce((acc, c) => {
        const converted = convertCurrency(c.price, c.currency, baseCurrency, rates)
        return acc + (c.billingCycle === "yearly" ? converted / 12 : converted)
      }, 0)
      insights.push({
        type: "overlapping",
        title: "Multiple AI Code Editors Active",
        description: `You are currently paying for ${codingTools.length} AI development tools (${names}) totaling ${fxMeta.isFallback ? "~" : ""}${formatCurrency(totalCostBase, baseCurrency)}/mo.`,
        impact: `Potential savings of up to ${fxMeta.isFallback ? "~" : ""}${formatCurrency(totalCostBase * 0.5, baseCurrency)}/mo by standardizing.`,
        severity: "high",
      })
    }

    let potentialAnnualSavingsBase = 0
    for (const s of subscriptions) {
      if (s.status === "active" && s.billingCycle === "monthly") {
        const converted = convertCurrency(s.price, s.currency, baseCurrency, rates)
        potentialAnnualSavingsBase += converted * 12 * 0.16
      }
    }
    if (convertCurrency(potentialAnnualSavingsBase, baseCurrency, "USD", rates) > 6) {
      insights.push({
        type: "savings",
        title: "Annual Billing Switch Opportunities",
        description: `Switching eligible monthly subscriptions to annual billing could save an estimated ${formatCurrency(potentialAnnualSavingsBase, baseCurrency)} per year.`,
        impact: `Save ~${formatCurrency(potentialAnnualSavingsBase, baseCurrency)}/yr`,
        severity: "low",
      })
    }

    const modelComparison = dbModels.map((m) => ({
      provider: m.providerName,
      model: m.name,
      context: formatContextWindow(m.contextTokens),
      inputPerM: `$${m.inputPricePerM.toFixed(2)}`,
      outputPerM: `$${m.outputPricePerM.toFixed(2)}`,
      cachedPerM: m.cachedPricePerM > 0 ? `$${m.cachedPricePerM.toFixed(2)}` : "—",
      bestFor: m.bestFor,
    }))

    const latestSnapByAccount = new Map<string, (typeof usageSnapshots)[number]>()
    for (const snap of usageSnapshots) {
      if (snap.apiAccountId && !latestSnapByAccount.has(snap.apiAccountId)) {
        latestSnapByAccount.set(snap.apiAccountId, snap)
      }
    }

    const accountSnapshots = apiAccounts.map((acc) => {
      const snap = latestSnapByAccount.get(acc.id) || null
      const cap = getProviderCapability(acc.provider.slug)
      const dataSource =
        snap?.dataSource ||
        (acc.integrationStatus === "connected" && acc.lastSyncStatus === "success" && (cap.canSyncCredits || cap.canSyncUsage)
          ? "live_api_sync"
          : cap.canSyncCredits || cap.canSyncUsage
            ? "manual"
            : "unsupported")

      return {
        id: acc.id,
        accountName: acc.accountName || acc.provider.name,
        providerSlug: acc.provider.slug,
        providerName: acc.provider.name,
        currency: acc.currency || "USD",
        prepaidBalance: acc.prepaidBalance ?? 0,
        totalSpent: acc.totalSpent ?? 0,
        integrationStatus: acc.integrationStatus,
        syncedAt: (snap?.syncedAt || acc.lastSyncAt)?.toISOString() || null,
        syncStatus: snap?.syncStatus || (acc.lastSyncStatus === "error" ? "error" : "ok"),
        errorMessage: snap?.errorMessage || acc.lastSyncError || null,
        dataSource,
        inputTokens: snap?.inputTokens ?? 0,
        outputTokens: snap?.outputTokens ?? 0,
        cachedTokens: snap?.cachedTokens ?? 0,
        requests: snap?.requests ?? 0,
        capability: cap,
      }
    })

    const subscriptionDrilldown = subscriptions.map((sub) => {
      const cap = getProviderCapability(sub.provider.slug)
      return {
        id: sub.id,
        providerSlug: sub.provider.slug,
        providerName: sub.provider.name,
        planName: sub.customPlanName || sub.plan?.name || "Standard Plan",
        type: sub.type,
        status: sub.status,
        price: sub.price,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        dataSource:
          sub.dataSource ||
          (cap.canSyncUsage || cap.canSyncCredits ? "manual" : "unsupported"),
        syncedAt: sub.updatedAt.toISOString(),
        quotaMessages: sub.quotaMessages,
        usedMessages: sub.usedMessages ?? 0,
        quotaRequests: sub.quotaRequests,
        usedRequests: sub.usedRequests ?? 0,
        quotaTokens: sub.quotaTokens,
        usedTokens: sub.usedTokens ?? 0,
        quotaCredits: sub.quotaCredits,
        usedCredits: sub.usedCredits ?? 0,
        capability: cap,
      }
    })

    const modelUsageMap = new Map<
      string,
      { model: string; providerName: string; providerSlug: string; tokens: number; cost: number; requests: number; dataSource: string }
    >()
    for (const u of apiUsageRecords) {
      const modelKey = u.model || "unknown"
      const cur = modelUsageMap.get(modelKey) || {
        model: modelKey,
        providerName: u.apiAccount.provider.name,
        providerSlug: u.apiAccount.provider.slug,
        tokens: 0,
        cost: 0,
        requests: 0,
        dataSource: u.dataSource || "manual",
      }
      cur.tokens += u.totalTokens || 0
      cur.cost += convertCurrency(u.cost || 0, u.currency || "USD", "USD", rates)
      cur.requests += u.requestCount || 0
      if (u.dataSource === "live_api_sync" || u.dataSource === "agent_execution") {
        cur.dataSource = u.dataSource
      }
      modelUsageMap.set(modelKey, cur)
    }

    return NextResponse.json({
      data: {
        baseCurrency,
        spendingTrends,
        providerBreakdown,
        exchangeRateUsdToInr: rates.USD_INR,
        exchangeRates: rates,
        fxMeta: {
          isFallback: fxMeta.isFallback,
          source: fxMeta.source,
          fetchedAt: fxMeta.fetchedAt,
        },
        overview: {
          monthlySubscriptions: parseFloat(activeSubMonthlyTotal.toFixed(2)),
          annualSubscriptions: parseFloat(activeSubAnnualTotal.toFixed(2)),
          apiSpent: parseFloat(totalApiSpent.toFixed(2)),
          apiBalance: parseFloat(totalApiBalance.toFixed(2)),
        },
        insights,
        modelComparison,
        accountSnapshots,
        subscriptionDrilldown,
        modelBreakdown: Array.from(modelUsageMap.values()).sort((a, b) => b.cost - a.cost),
      },
    })
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch analytics data", "Analytics error")
  }
}
