import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const DEMO_USER_ID = "user_demo_001"

export async function POST(_request: NextRequest) {
  try {
    await prisma.notification.updateMany({
      where: { userId: DEMO_USER_ID, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Mark all read error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to mark notifications as read" },
      { status: 500 }
    )
  }
}
