import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { logger, errorContext } from "@/lib/logger"

function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  // Prevent CSV formula injection
  const safeStr = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
  if (safeStr.includes(",") || safeStr.includes('"') || safeStr.includes("\n")) {
    return `"${safeStr.replace(/"/g, '""')}"`
  }
  return safeStr
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const [subscriptions, billingRecords, apiUsageRecords] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId: user.id },
        include: { provider: true, plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.billingRecord.findMany({
        where: { userId: user.id },
        include: { subscription: { include: { provider: true } } },
        orderBy: { billingDate: "desc" },
      }),
      prisma.apiUsageRecord.findMany({
        where: { apiAccount: { userId: user.id } },
        include: { apiAccount: { include: { provider: true } } },
        orderBy: { date: "desc" },
      }),
    ])

    const lines: string[] = [
      ["Category", "ID", "Provider", "Plan_or_Model", "Status_or_Type", "Amount_or_Cost", "Currency", "Tokens", "Date"].join(","),
    ]

    for (const s of subscriptions) {
      lines.push(
        [
          "subscription",
          s.id,
          s.provider.name,
          s.customPlanName || s.plan?.name || s.type,
          s.status,
          s.price,
          s.currency,
          s.usedTokens ?? "",
          s.startDate.toISOString(),
        ]
          .map(csvCell)
          .join(",")
      )
    }

    for (const b of billingRecords) {
      lines.push(
        [
          "billing",
          b.id,
          b.subscription?.provider?.name || "Direct",
          b.description || b.type,
          b.type,
          b.amount,
          b.currency,
          "",
          b.billingDate.toISOString(),
        ]
          .map(csvCell)
          .join(",")
      )
    }

    for (const u of apiUsageRecords) {
      lines.push(
        [
          "api_usage",
          u.id,
          u.apiAccount.provider.name,
          u.model || "custom",
          u.dataSource,
          u.cost ?? 0,
          u.currency,
          u.totalTokens ?? 0,
          u.date.toISOString(),
        ]
          .map(csvCell)
          .join(",")
      )
    }

    return new NextResponse(lines.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modelvault-export.csv"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    logger.error("CSV export failed", errorContext(err))
    return authErrorResponse(err, "Failed to export CSV")
  }
}
