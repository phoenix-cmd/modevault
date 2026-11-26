import { NextRequest, NextResponse } from "next/server"
import { unstable_rethrow } from "next/navigation"
import { prisma } from "@/lib/db"
import { getExchangeRatesWithMeta, refreshLiveExchangeRates } from "@/lib/currency"

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1"
    if (forceRefresh) {
      await refreshLiveExchangeRates(4500)
    }

    const meta = await getExchangeRatesWithMeta({ allowLiveRefresh: !forceRefresh })
    const rates = await prisma.exchangeRate.findMany()

    return NextResponse.json({
      data: rates,
      ratesMap: meta.rates,
      isFallback: meta.isFallback,
      fetchedAt: meta.fetchedAt,
      timestamp: new Date().toISOString(),
      baseCurrency: "USD",
      source: meta.source,
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("Exchange rates error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch exchange rates" },
      { status: 500 }
    )
  }
}
