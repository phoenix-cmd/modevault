import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const records = await db.orm.public.BillingRecord
      .include("subscription", (subscription) => subscription.include("provider"))
      .where({ userId: user.id })
      .orderBy((r) => r.billingDate.asc())
      .all()

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalSpentCurrentMonth = 0
    let totalSpentCurrentYear = 0
    let totalSpentAllTime = 0

    const monthlyMap: Record<string, { month: string; subscription: number; api: number; total: number }> = {}

    for (const r of records) {
      const bDate = new Date(r.billingDate)
      const amount = r.amount

      totalSpentAllTime += amount
      if (bDate.getFullYear() === currentYear) {
        totalSpentCurrentYear += amount
        if (bDate.getMonth() === currentMonth) {
          totalSpentCurrentMonth += amount
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
        monthlyMap[monthKey].subscription += amount
      } else {
        monthlyMap[monthKey].api += amount
      }
      monthlyMap[monthKey].total += amount
    }

    const monthlyHistory = Object.values(monthlyMap)

    return NextResponse.json({
      data: {
        totalSpentCurrentMonth,
        totalSpentCurrentYear,
        totalSpentAllTime,
        monthlyHistory,
      },
    })
  } catch (error) {
    console.error("Billing summary error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch billing summary" },
      { status: 500 }
    )
  }
}
