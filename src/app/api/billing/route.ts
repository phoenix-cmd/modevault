import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    let records = db.orm.public.BillingRecord
      .include("subscription", (subscription) => subscription.include("provider"))
      .where({ userId: user.id })
      .orderBy((r) => r.billingDate.desc())
      .limit(limit)

    if (type) {
      records = records.where({ type })
    }

    const rows = await records.all()

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error("Billing records error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch billing records" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const body = await request.json()
    const {
      subscriptionId,
      type,
      amount,
      currency,
      billingDate,
      description,
      invoiceUrl,
    } = body

    if (!amount) {
      return NextResponse.json(
        { data: null, error: "Amount is required" },
        { status: 400 }
      )
    }

    const record = await db.orm.public.BillingRecord.create({
      userId: user.id,
      subscriptionId: subscriptionId || null,
      type: type || "subscription_payment",
      amount: parseFloat(amount),
      currency: currency || "INR",
      billingDate: billingDate ? new Date(billingDate) : new Date(),
      description: description || null,
      invoiceUrl: invoiceUrl || null,
    })

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error("Billing creation error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to create billing record" },
      { status: 500 }
    )
  }
}
