import { prisma } from "@/lib/db"

export async function emitNotification(
  userId: string,
  opts: {
    type: string
    title: string
    message: string
    severity?: "info" | "warning" | "critical"
    actionUrl?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const duplicate = await prisma.notification.findFirst({
      where: {
        userId,
        type: opts.type,
        title: opts.title,
        isRead: false,
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    })
    if (duplicate) return

    await prisma.notification.create({
      data: {
        userId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        severity: opts.severity || "info",
        actionUrl: opts.actionUrl || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    })
  } catch {
    // Notification emission should never abort primary business operations
  }
}
