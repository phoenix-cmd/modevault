import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const DEMO_USER_ID = "user_demo_001"

export async function GET(_request: NextRequest) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: DEMO_USER_ID, isRead: false },
    })

    return NextResponse.json({
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (error) {
    console.error("Notifications error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, severity, actionUrl } = body

    if (!title || !message) {
      return NextResponse.json(
        { data: null, error: "Title and message are required" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId: DEMO_USER_ID,
        type: type || "general",
        title,
        message,
        severity: severity || "info",
        actionUrl: actionUrl || null,
      },
    })

    return NextResponse.json({ data: notification }, { status: 201 })
  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to create notification" },
      { status: 500 }
    )
  }
}
