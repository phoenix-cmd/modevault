import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { convertCurrency, getExchangeRatesMap } from "@/lib/currency"

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const [rates, records] = await Promise.all([
      getExchangeRatesMap(),
      prisma.billingRecord.findMany({
        where: { userId: user.id },
        include: {
          subscription: {
            include: {
              provider: true,
            },
          },
        },
        orderBy: { billingDate: "asc" },
      }),
    ])

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalSpentCurrentMonth = 0
    let totalSpentCurrentYear = 0
    let totalSpentAllTime = 0

    const monthlyMap: Record<string, { month: string; subscription: number; api: number; total: number }> = {}

    for (const r of records) {
      const bDate = new Date(r.billingDate)
      const usdAmount = convertCurrency(r.amount, r.currency, "USD", rates)

      totalSpentAllTime += usdAmount
      if (bDate.getFullYear() === currentYear) {
        totalSpentCurrentYear += usdAmount
        if (bDate.getMonth() === currentMonth) {
          totalSpentCurrentMonth += usdAmount
        }
      }

      const monthKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          subscription: 0,
          api: 0,
          total: 0,
        }
      }

      if (r.type === "subscription_payment") {
        monthlyMap[monthKey].subscription += usdAmount
      } else {
        monthlyMap[monthKey].api += usdAmount
      }
      monthlyMap[monthKey].total += usdAmount
    }

    const monthlyHistory = Object.values(monthlyMap)

    return NextResponse.json({
      data: {
        totalSpentCurrentMonth: parseFloat(totalSpentCurrentMonth.toFixed(2)),
        totalSpentCurrentYear: parseFloat(totalSpentCurrentYear.toFixed(2)),
        totalSpentAllTime: parseFloat(totalSpentAllTime.toFixed(2)),
        baseCurrency: "USD",
        monthlyHistory,
      },
    })
  } catch (error) {
    return authErrorResponse(error, "Failed to fetch billing summary", "Billing summary error")
  }
}
