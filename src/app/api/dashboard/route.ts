import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { unpackBillingDescription } from "@/lib/billing-meta"
import { convertCurrency, getExchangeRatesMap } from "@/lib/currency"

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [rates, dbUser, subscriptions, apiAccounts, upcomingRenewals] = await Promise.all([
      getExchangeRatesMap(),
      prisma.user.findUnique({ where: { id: user.id }, select: { currency: true } }),
      prisma.subscription.findMany({
        where: { userId: user.id, status: "active" },
        include: { provider: true },
      }),
      prisma.apiAccount.findMany({
        where: { userId: user.id },
        select: { id: true, prepaidBalance: true, currency: true },
      }),
      prisma.subscription.count({
        where: {
          userId: user.id,
          status: "active",
          renewalDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
    ])

    const targetCurrency =
      dbUser?.currency || subscriptions[0]?.currency || apiAccounts[0]?.currency || "USD"

    let totalMonthlySpend = 0
    let totalAnnualSpend = 0
    const providerSpending: Record<string, number> = {}

    for (const sub of subscriptions) {
      const normalizedPrice = convertCurrency(sub.price, sub.currency, targetCurrency, rates)
      const monthly = sub.billingCycle === "yearly" ? normalizedPrice / 12 : normalizedPrice
      const annual = sub.billingCycle === "yearly" ? normalizedPrice : normalizedPrice * 12
      totalMonthlySpend += monthly
      totalAnnualSpend += annual
      const name = sub.provider.name
      providerSpending[name] = (providerSpending[name] ?? 0) + monthly
    }

    const totalApiBalance = apiAccounts.reduce(
      (sum, acc) => sum + convertCurrency(acc.prepaidBalance ?? 0, acc.currency, "USD", rates),
      0
    )
    const totalApiBalanceInTarget = apiAccounts.reduce(
      (sum, acc) => sum + convertCurrency(acc.prepaidBalance ?? 0, acc.currency, targetCurrency, rates),
      0
    )

    const [recentBilling, recentNotifications, recentSyncLogs, billingRecords, apiUsageRecords] =
      await Promise.all([
        prisma.billingRecord.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.syncLog.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
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
      ])

    const recentActivity = [
      ...recentBilling.map((b) => ({
        id: b.id,
        type: "billing" as const,
        title: b.type,
        description: b.description,
        date: b.createdAt,
      })),
      ...recentNotifications.map((n) => ({
        id: n.id,
        type: "notification" as const,
        title: n.title,
        description: n.message,
        date: n.createdAt,
      })),
      ...recentSyncLogs.map((s) => ({
        id: s.id,
        type: "sync" as const,
        title: `Sync: ${s.provider}`,
        description: s.message,
        date: s.createdAt,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)

    const spendingByMonth: Record<string, number> = {}
    const spendingByMonthDetailed: Record<
      string,
      { month: string; subscriptions: number; api: number; total: number }
    > = {}

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      spendingByMonth[key] = 0
      spendingByMonthDetailed[key] = {
        month: d.toLocaleString("default", { month: "short" }),
        subscriptions: 0,
        api: 0,
        total: 0,
      }
    }

    for (const record of billingRecords) {
      const meta = unpackBillingDescription(record.description)
      if (meta.status === "failed") continue
      const key = `${record.billingDate.getFullYear()}-${String(record.billingDate.getMonth() + 1).padStart(2, "0")}`
      if (!spendingByMonthDetailed[key]) continue
      const rawConverted = convertCurrency(record.amount, record.currency, targetCurrency, rates)
      const converted = record.type === "refund" ? -rawConverted : rawConverted
      if (record.type === "subscription_payment") {
        spendingByMonthDetailed[key].subscriptions += converted
      } else {
        spendingByMonthDetailed[key].api += converted
      }
      spendingByMonthDetailed[key].total += converted
      spendingByMonth[key] = (spendingByMonth[key] ?? 0) + converted
    }

    for (const usage of apiUsageRecords) {
      const key = `${usage.date.getFullYear()}-${String(usage.date.getMonth() + 1).padStart(2, "0")}`
      if (!spendingByMonthDetailed[key]) continue
      const converted = convertCurrency(usage.cost ?? 0, usage.currency, targetCurrency, rates)
      spendingByMonthDetailed[key].api += converted
      spendingByMonthDetailed[key].total += converted
      spendingByMonth[key] = (spendingByMonth[key] ?? 0) + converted
    }

    const detailedTrend = Object.values(spendingByMonthDetailed).map((point) => ({
      month: point.month,
      subscriptions: Math.round(point.subscriptions),
      api: Math.round(point.api),
      total: Math.round(point.total),
    }))

    return Response.json({
      data: {
        activeSubscriptions: subscriptions.length,
        totalMonthlySpend: parseFloat(totalMonthlySpend.toFixed(2)),
        totalAnnualSpend: parseFloat(totalAnnualSpend.toFixed(2)),
        totalApiBalance: parseFloat(totalApiBalance.toFixed(2)),
        totalApiBalanceInTarget: parseFloat(totalApiBalanceInTarget.toFixed(2)),
        upcomingRenewals,
        currency: targetCurrency,
        recentActivity,
        spendingByMonth,
        spendingByMonthDetailed: detailedTrend,
        providerSpending,
      },
    })
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch dashboard data", "Dashboard API error")
  }
}
