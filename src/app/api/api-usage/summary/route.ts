import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const records = await db.orm.public.ApiUsageRecord
      .include("apiAccount", (account) => account.include("provider"))
      .where((r) => r.apiAccount.some((a) => a.userId.eq(user.id)))
      .orderBy((r) => r.date.asc())
      .all()

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
      const account = r.apiAccount
      if (!account) continue

      totalTokens += r.totalTokens || 0
      totalCost += r.cost || 0
      totalRequests += r.requestCount || 0
      totalCachedTokens += r.cachedTokens || 0

      // By Model
      const modelName = r.model || "unknown"
      if (!modelMap[modelName]) {
        modelMap[modelName] = {
          tokens: 0,
          cost: 0,
          requests: 0,
          provider: account.provider.name,
        }
      }
      modelMap[modelName].tokens += r.totalTokens || 0
      modelMap[modelName].cost += r.cost || 0
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
      dailyMap[dateStr].cost += r.cost || 0
      dailyMap[dateStr].requests += r.requestCount || 0

      // By Provider
      const provName = account.provider.name
      if (!providerMap[provName]) {
        providerMap[provName] = {
          tokens: 0,
          cost: 0,
          provider: provName,
        }
      }
      providerMap[provName].tokens += r.totalTokens || 0
      providerMap[provName].cost += r.cost || 0
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
    console.error("API usage summary error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch API usage summary" },
      { status: 500 }
    )
  }
}
