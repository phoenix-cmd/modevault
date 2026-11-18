import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const providers = await db.orm.public.Provider
      .include("plans")
      .orderBy((p) => p.name.asc())
      .all()

    return NextResponse.json({ data: providers })
  } catch (error) {
    console.error("Providers error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch providers" },
      { status: 500 }
    )
  }
}
