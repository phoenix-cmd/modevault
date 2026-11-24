import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { logger, errorContext } from "@/lib/logger"

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err: unknown) {
    logger.error("Mark all read error", errorContext(err))
    return authErrorResponse(err, "Failed to mark notifications as read")
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const deleted = await prisma.notification.deleteMany({
      where: { userId: user.id, isRead: true },
    })
    return NextResponse.json({ data: { deletedCount: deleted.count } })
  } catch (err: unknown) {
    logger.error("Clear read notifications error", errorContext(err))
    return authErrorResponse(err, "Failed to clear read notifications")
  }
}
