import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const { searchParams } = new URL(request.url)
    const apiAccountId = searchParams.get("apiAccountId")
    const model = searchParams.get("model")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    let records = db.orm.public.ApiUsageRecord
      .include("apiAccount", (account) => account.include("provider"))
      .where((r) => r.apiAccount.some((a) => a.userId.eq(user.id)))
      .orderBy((r) => r.date.desc())
      .limit(limit)

    if (apiAccountId) {
      records = records.where({ apiAccountId })
    }

    if (model) {
      records = records.where({ model })
    }

    const rows = await records.all()

    return NextResponse.json({ data: rows })
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
    const db = getDb()
    const user = await getCurrentUserOrDefault()
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

    const record = await db.orm.public.ApiUsageRecord.create({
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
    })

    // Update ApiAccount totalSpent (increment/decrement computed on the row)
    if (cost) {
      await db.transaction(async (tx) => {
        const account = await tx.orm.public.ApiAccount
          .where({ id: apiAccountId })
          .select("id", "totalSpent", "prepaidBalance")
          .first()
        if (account) {
          await tx.orm.public.ApiAccount
            .where({ id: apiAccountId })
            .update({
              totalSpent: (account.totalSpent ?? 0) + cost,
              prepaidBalance: (account.prepaidBalance ?? 0) - cost,
            })
        }
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
