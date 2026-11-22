import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson, safeUrlSchema } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const notificationCreateSchema = z.object({
  type: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  actionUrl: safeUrlSchema.nullable().optional(),
})

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return NextResponse.json({
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (err: unknown) {
    logger.error("Notifications GET error", errorContext(err))
    return authErrorResponse(err, "Failed to fetch notifications")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(request, notificationCreateSchema)
    if ("response" in parsed) return parsed.response
    const { type, title, message, severity, actionUrl } = parsed.data

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: type || "general",
        title,
        message,
        severity: severity || "info",
        actionUrl: actionUrl || null,
      },
    })

    return NextResponse.json({ data: notification }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Create notification error", errorContext(err))
    return authErrorResponse(err, "Failed to create notification")
  }
}
