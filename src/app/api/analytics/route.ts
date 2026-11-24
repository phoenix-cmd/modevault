import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { convertCurrency, getExchangeRatesMap } from "@/lib/currency"

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

    const [rates, subscriptions, apiAccounts, billingRecords, apiUsageRecords, dbModels] =
      await Promise.all([
        getExchangeRatesMap(),
        prisma.subscription.findMany({
          where: { userId: user.id },
          include: { provider: true },
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
          orderBy: { date: "asc" },
        }),
        prisma.aiModel.findMany({
          orderBy: [{ providerName: "asc" }, { outputPricePerM: "asc" }],
        }),
      ])

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
      const key = `${b.billingDate.getFullYear()}-${String(b.billingDate.getMonth() + 1).padStart(2, "0")}`
      if (months[key]) {
        const inrAmount = convertCurrency(b.amount, b.currency, "INR", rates)
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
      const totalCost = codingTools.reduce((acc, c) => {
        const inrPrice = convertCurrency(c.price, c.currency, "INR", rates)
        return acc + (c.billingCycle === "yearly" ? inrPrice / 12 : inrPrice)
      }, 0)
      insights.push({
        type: "overlapping",
        title: "Multiple AI Code Editors Active",
        description: `You are currently paying for ${codingTools.length} AI development tools (${names}) totaling ₹${Math.round(totalCost)}/mo.`,
        impact: `Potential savings of up to ₹${Math.round(totalCost * 0.5)}/mo by standardizing.`,
        severity: "high",
      })
    }

    let potentialAnnualSavings = 0
    for (const s of subscriptions) {
      if (s.status === "active" && s.billingCycle === "monthly") {
        const inrPrice = convertCurrency(s.price, s.currency, "INR", rates)
        potentialAnnualSavings += inrPrice * 12 * 0.16
      }
    }
    if (potentialAnnualSavings > 500) {
      insights.push({
        type: "savings",
        title: "Annual Billing Switch Opportunities",
        description: `Switching eligible monthly subscriptions to annual billing could save an estimated ₹${Math.round(potentialAnnualSavings)} per year.`,
        impact: `Save ~₹${Math.round(potentialAnnualSavings)}/yr`,
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

    return NextResponse.json({
      data: {
        spendingTrends,
        providerBreakdown,
        exchangeRateUsdToInr: rates.USD_INR,
        overview: {
          monthlySubscriptions: parseFloat(activeSubMonthlyTotal.toFixed(2)),
          annualSubscriptions: parseFloat(activeSubAnnualTotal.toFixed(2)),
          apiSpent: parseFloat(totalApiSpent.toFixed(2)),
          apiBalance: parseFloat(totalApiBalance.toFixed(2)),
        },
        insights,
        modelComparison,
      },
    })
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch analytics data", "Analytics error")
  }
}
