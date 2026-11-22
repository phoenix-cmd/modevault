import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const notificationPatchSchema = z.object({
  isRead: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const parsed = await parseJson(request, notificationPatchSchema)
    if ("response" in parsed) return parsed.response
    const { isRead } = parsed.data

    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Notification not found" },
        { status: 404 }
      )
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: {
        isRead: isRead !== undefined ? isRead : true,
      },
    })

    return NextResponse.json({ data: notification })
  } catch (err: unknown) {
    logger.error("Update notification error", errorContext(err))
    return authErrorResponse(err, "Failed to update notification")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Notification not found" },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err: unknown) {
    logger.error("Delete notification error", errorContext(err))
    return authErrorResponse(err, "Failed to delete notification")
  }
}
