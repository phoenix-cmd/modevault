import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const { id } = await params
    const body = await request.json()
    const { isRead } = body

    const notification = await db.orm.public.Notification
      .where({ id })
      .update({
        isRead: isRead !== undefined ? isRead : true,
      })

    return NextResponse.json({ data: notification })
  } catch (error) {
    console.error("Update notification error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const { id } = await params
    await db.orm.public.Notification.where({ id }).delete()

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Delete notification error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
