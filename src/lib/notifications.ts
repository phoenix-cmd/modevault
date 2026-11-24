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
    // Check user's saved notification preferences before emitting
    const prefRecord = await prisma.integrationCredential.findUnique({
      where: {
        userId_providerSlug: {
          userId,
          providerSlug: "__user_preferences__",
        },
      },
      select: { featuresJson: true },
    })
    if (prefRecord?.featuresJson) {
      try {
        const prefs = JSON.parse(prefRecord.featuresJson) as {
          quotaAlerts?: boolean
          renewalAlerts?: boolean
          billingAlerts?: boolean
          syncAlerts?: boolean
        }
        if (opts.type === "quota_warning" && prefs.quotaAlerts === false) return
        if (opts.type === "renewal_due" && prefs.renewalAlerts === false) return
        if ((opts.type === "credit_low" || opts.type === "billing") && prefs.billingAlerts === false) return
        if (opts.type === "sync" && prefs.syncAlerts === false) return
      } catch {
        // Ignore malformed preference JSON
      }
    }

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
