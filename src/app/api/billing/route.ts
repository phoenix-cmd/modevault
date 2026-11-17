import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

const DEMO_USER_ID = "user_demo_001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    const where: Prisma.BillingRecordWhereInput = {
      userId: DEMO_USER_ID,
    }

    if (type) {
      where.type = type
    }

    const records = await prisma.billingRecord.findMany({
      where,
      include: {
        subscription: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { billingDate: "desc" },
      take: limit,
    })

    return NextResponse.json({ data: records })
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

    const record = await prisma.billingRecord.create({
      data: {
        userId: DEMO_USER_ID,
        subscriptionId: subscriptionId || null,
        type: type || "subscription_payment",
        amount: parseFloat(amount),
        currency: currency || "INR",
        billingDate: billingDate ? new Date(billingDate) : new Date(),
        description: description || null,
        invoiceUrl: invoiceUrl || null,
      },
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
