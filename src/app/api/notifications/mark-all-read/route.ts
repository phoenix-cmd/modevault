import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUserOrDefault()
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
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
