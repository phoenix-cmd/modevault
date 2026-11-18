import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUserOrDefault()
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // 1. Subscriptions & API accounts
    const [subscriptions, apiAccounts, billingRecords] = await Promise.all([
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
    ])

    // 2. Spending trends by month
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
        if (b.type === "subscription_payment") {
          months[key].subscriptions += b.amount
        } else {
          months[key].api += b.amount
        }
        months[key].total += b.amount
      }
    }

    const spendingTrends = Object.values(months)

    // 3. Provider breakdown
    const providerMap: Record<string, { name: string; amount: number; color: string; count: number }> = {}
    for (const s of subscriptions) {
      if (s.status === "active") {
        const monthly = s.billingCycle === "yearly" ? s.price / 12 : s.price
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

    // 4. API vs Subscription totals
    let activeSubMonthlyTotal = 0
    let activeSubAnnualTotal = 0
    for (const s of subscriptions) {
      if (s.status === "active") {
        const m = s.billingCycle === "yearly" ? s.price / 12 : s.price
        activeSubMonthlyTotal += m
        activeSubAnnualTotal += s.billingCycle === "yearly" ? s.price : s.price * 12
      }
    }

    let totalApiSpent = 0
    let totalApiBalance = 0
    for (const a of apiAccounts) {
      totalApiSpent += a.totalSpent || 0
      totalApiBalance += a.prepaidBalance || 0
    }

    // 5. Subscription Intelligence
    const insights: Array<{
      type: "underutilized" | "overlapping" | "savings" | "heavy_spend"
      title: string
      description: string
      impact?: string
      severity: "low" | "medium" | "high"
    }> = []

    // Detect underutilized quotas (where quota is known and used < 20%)
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

    // Detect overlapping coding subscriptions (e.g. Copilot + Cursor + Windsurf)
    const codingTools = subscriptions.filter(
      (s) =>
        s.status === "active" &&
        ["github-copilot", "cursor", "windsurf"].includes(s.provider.slug)
    )
    if (codingTools.length > 1) {
      const names = codingTools.map((c) => c.customPlanName || c.provider.name).join(", ")
      const totalCost = codingTools.reduce((acc, c) => acc + (c.billingCycle === "yearly" ? c.price / 12 : c.price), 0)
      insights.push({
        type: "overlapping",
        title: "Multiple AI Code Editors Active",
        description: `You are currently paying for ${codingTools.length} AI development tools (${names}) totaling ₹${Math.round(totalCost)}/mo.`,
        impact: `Potential savings of up to ₹${Math.round(totalCost * 0.5)}/mo by standardizing.`,
        severity: "high",
      })
    }

    // Annual savings calculation
    let potentialAnnualSavings = 0
    for (const s of subscriptions) {
      if (s.status === "active" && s.billingCycle === "monthly") {
        // typically 15-20% discount on annual
        const yearlyIfMonthly = s.price * 12
        const estimatedYearlyDiscount = yearlyIfMonthly * 0.16
        potentialAnnualSavings += estimatedYearlyDiscount
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

    // 6. Model Comparison Data
    const modelComparison = [
      {
        provider: "OpenAI",
        model: "GPT-4o",
        context: "128K",
        inputPerM: "$2.50",
        outputPerM: "$10.00",
        cachedPerM: "$1.25",
        bestFor: "Vision, multi-modal reasoning, general coding",
      },
      {
        provider: "OpenAI",
        model: "o1",
        context: "200K",
        inputPerM: "$15.00",
        outputPerM: "$60.00",
        cachedPerM: "$7.50",
        bestFor: "Deep reasoning, math, competitive programming",
      },
      {
        provider: "Anthropic",
        model: "Claude 3.5 Sonnet",
        context: "200K",
        inputPerM: "$3.00",
        outputPerM: "$15.00",
        cachedPerM: "$0.30",
        bestFor: "Architecture, frontend, nuanced writing",
      },
      {
        provider: "Google",
        model: "Gemini 1.5 Pro",
        context: "2,000K",
        inputPerM: "$1.25",
        outputPerM: "$5.00",
        cachedPerM: "$0.31",
        bestFor: "Massive codebases, video/audio multimodal",
      },
      {
        provider: "OpenRouter",
        model: "Meta Llama 3.3 70B",
        context: "128K",
        inputPerM: "$0.40",
        outputPerM: "$0.40",
        cachedPerM: "—",
        bestFor: "Open weights, cost-effective high performance",
      },
      {
        provider: "Perplexity",
        model: "Sonar Pro",
        context: "200K",
        inputPerM: "$3.00",
        outputPerM: "$15.00",
        cachedPerM: "—",
        bestFor: "Live web search, citation-backed answers",
      },
    ]

    return NextResponse.json({
      data: {
        spendingTrends,
        providerBreakdown,
        overview: {
          monthlySubscriptions: activeSubMonthlyTotal,
          annualSubscriptions: activeSubAnnualTotal,
          apiSpent: totalApiSpent,
          apiBalance: totalApiBalance,
        },
        insights,
        modelComparison,
      },
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}
