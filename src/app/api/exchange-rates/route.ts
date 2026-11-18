import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const rates = await db.orm.public.ExchangeRate.all()

    return NextResponse.json({
      data: rates,
      timestamp: new Date().toISOString(),
      baseCurrency: "USD",
      source: "Manual estimate (Nov 2026)",
    })
  } catch (error) {
    console.error("Exchange rates error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch exchange rates" },
      { status: 500 }
    )
  }
}
