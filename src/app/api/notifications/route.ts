import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"


export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const notifications = await db.orm.public.Notification
      .where({ userId: user.id })
      .all()
    notifications.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const unreadCount = await db.orm.public.Notification
      .where({ userId: user.id })
      .where({ isRead: false })
      .aggregate((a) => ({ total: a.count() }))
      .then((r) => r.total)

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
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const body = await request.json()
    const { type, title, message, severity, actionUrl } = body

    if (!title || !message) {
      return NextResponse.json(
        { data: null, error: "Title and message are required" },
        { status: 400 }
      )
    }

    const notification = await db.orm.public.Notification.create({
      userId: user.id,
      type: type || "general",
      title,
      message,
      severity: severity || "info",
      actionUrl: actionUrl || null,
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
