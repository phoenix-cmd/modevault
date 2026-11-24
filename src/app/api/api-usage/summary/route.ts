import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { convertCurrency, getExchangeRatesMap } from "@/lib/currency"

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const [rates, records] = await Promise.all([
      getExchangeRatesMap(),
      prisma.apiUsageRecord.findMany({
        where: {
          apiAccount: {
            userId: user.id,
          },
        },
        include: {
          apiAccount: {
            include: {
              provider: true,
            },
          },
        },
        orderBy: { date: "asc" },
      }),
    ])

    let totalTokens = 0
    let totalCost = 0
    let totalRequests = 0
    let totalCachedTokens = 0

    const modelMap: Record<
      string,
      { tokens: number; cost: number; requests: number; provider: string }
    > = {}

    const dailyMap: Record<
      string,
      { date: string; tokens: number; cost: number; requests: number }
    > = {}

    const providerMap: Record<
      string,
      { tokens: number; cost: number; provider: string }
    > = {}

    for (const r of records) {
      const normalizedUsdCost = convertCurrency(r.cost || 0, r.currency || "USD", "USD", rates)
      totalTokens += r.totalTokens || 0
      totalCost += normalizedUsdCost
      totalRequests += r.requestCount || 0
      totalCachedTokens += r.cachedTokens || 0

      // By Model
      const modelName = r.model || "unknown"
      if (!modelMap[modelName]) {
        modelMap[modelName] = {
          tokens: 0,
          cost: 0,
          requests: 0,
          provider: r.apiAccount.provider.name,
        }
      }
      modelMap[modelName].tokens += r.totalTokens || 0
      modelMap[modelName].cost += normalizedUsdCost
      modelMap[modelName].requests += r.requestCount || 0

      // By Day
      const dateStr = r.date.toISOString().split("T")[0]
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          tokens: 0,
          cost: 0,
          requests: 0,
        }
      }
      dailyMap[dateStr].tokens += r.totalTokens || 0
      dailyMap[dateStr].cost += normalizedUsdCost
      dailyMap[dateStr].requests += r.requestCount || 0

      // By Provider
      const provName = r.apiAccount.provider.name
      if (!providerMap[provName]) {
        providerMap[provName] = {
          tokens: 0,
          cost: 0,
          provider: provName,
        }
      }
      providerMap[provName].tokens += r.totalTokens || 0
      providerMap[provName].cost += normalizedUsdCost
    }

    const byModel = Object.entries(modelMap).map(([model, data]) => ({
      model,
      ...data,
      cost: parseFloat(data.cost.toFixed(4)),
    })).sort((a, b) => b.cost - a.cost)

    const dailyTrend = Object.values(dailyMap).map((d) => ({
      ...d,
      cost: parseFloat(d.cost.toFixed(4)),
    }))

    const byProvider = Object.values(providerMap).map((p) => ({
      ...p,
      cost: parseFloat(p.cost.toFixed(4)),
    }))

    return NextResponse.json({
      data: {
        totalTokens,
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalRequests,
        totalCachedTokens,
        byModel,
        dailyTrend,
        byProvider,
      },
    })
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch API usage summary", "API usage summary error")
  }
}
