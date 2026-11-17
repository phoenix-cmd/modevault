import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isRead } = body

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead !== undefined ? isRead : true,
      },
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
    const { id } = await params
    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Delete notification error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
