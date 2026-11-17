import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const DEMO_USER_ID = "user_demo_001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiAccountId = searchParams.get("apiAccountId")
    const model = searchParams.get("model")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    const where: any = {
      apiAccount: {
        userId: DEMO_USER_ID,
      },
    }

    if (apiAccountId) {
      where.apiAccountId = apiAccountId
    }

    if (model) {
      where.model = model
    }

    const records = await prisma.apiUsageRecord.findMany({
      where,
      include: {
        apiAccount: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error("API usage error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch API usage records" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      apiAccountId,
      date,
      model,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens,
      cost,
      currency,
      requestCount,
      dataSource,
    } = body

    if (!apiAccountId) {
      return NextResponse.json(
        { data: null, error: "apiAccountId is required" },
        { status: 400 }
      )
    }

    const computedTotal = totalTokens ?? ((inputTokens || 0) + (outputTokens || 0))

    const record = await prisma.apiUsageRecord.create({
      data: {
        apiAccountId,
        date: date ? new Date(date) : new Date(),
        model: model || "custom",
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        cachedTokens: cachedTokens || 0,
        totalTokens: computedTotal,
        cost: cost || 0,
        currency: currency || "USD",
        requestCount: requestCount || 1,
        dataSource: dataSource || "manual",
      },
    })

    // Update ApiAccount totalSpent
    if (cost) {
      await prisma.apiAccount.update({
        where: { id: apiAccountId },
        data: {
          totalSpent: { increment: cost },
          prepaidBalance: { decrement: cost },
        },
      })
    }

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error("Failed to create API usage record:", error)
    return NextResponse.json(
      { data: null, error: "Failed to create API usage record" },
      { status: 500 }
    )
  }
}
