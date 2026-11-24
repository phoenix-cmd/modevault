import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1"

    if (refresh) {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(4500),
        })
        if (res.ok) {
          const json = (await res.json()) as {
            rates?: Record<string, number>
          }
          const usdInr = json.rates?.INR
          const usdEur = json.rates?.EUR
          const usdGbp = json.rates?.GBP
          const now = new Date()

          const updates: Array<{ from: string; to: string; rate: number }> = []
          if (usdInr && usdInr > 0) updates.push({ from: "USD", to: "INR", rate: parseFloat(usdInr.toFixed(4)) })
          if (usdEur && usdEur > 0) updates.push({ from: "EUR", to: "USD", rate: parseFloat((1 / usdEur).toFixed(4)) })
          if (usdGbp && usdGbp > 0) updates.push({ from: "GBP", to: "USD", rate: parseFloat((1 / usdGbp).toFixed(4)) })

          for (const item of updates) {
            await prisma.exchangeRate.upsert({
              where: { fromCurrency_toCurrency: { fromCurrency: item.from, toCurrency: item.to } },
              update: { rate: item.rate, source: "open.er-api.com", fetchedAt: now },
              create: { fromCurrency: item.from, toCurrency: item.to, rate: item.rate, source: "open.er-api.com", fetchedAt: now },
            })
          }
        }
      } catch {
        // Fall back to existing DB rates when offline
      }
    }

    const rates = await prisma.exchangeRate.findMany()

    return NextResponse.json({
      data: rates,
      timestamp: new Date().toISOString(),
      baseCurrency: "USD",
      source: rates[0]?.source || "Database exchange rates",
    })
  } catch (error) {
    console.error("Exchange rates error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch exchange rates" },
      { status: 500 }
    )
  }
}
