import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function POST(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    await db.orm.public.Notification
      .where({ userId: user.id })
      .where({ isRead: false })
      .updateAll({ isRead: true })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Mark all read error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to mark notifications as read" },
      { status: 500 }
    )
  }
}
