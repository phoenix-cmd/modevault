import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserOrDefault } from "@/lib/auth"

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUserOrDefault()
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Active subscriptions count
    const activeSubscriptions = await prisma.subscription.count({
      where: { userId: user.id, status: "active" },
    });

    // Total monthly spend (sum of active monthly subscription prices)
    const activeMonthlyAgg = await prisma.subscription.aggregate({
      where: { userId: user.id, status: "active", billingCycle: "monthly" },
      _sum: { price: true },
    });
    const activeYearlyAgg = await prisma.subscription.aggregate({
      where: { userId: user.id, status: "active", billingCycle: "yearly" },
      _sum: { price: true },
    });

    const monthlyFromMonthly = activeMonthlyAgg._sum.price ?? 0;
    const monthlyFromYearly = (activeYearlyAgg._sum.price ?? 0) / 12;
    const totalMonthlySpend = monthlyFromMonthly + monthlyFromYearly;
    const totalAnnualSpend = monthlyFromMonthly * 12 + (activeYearlyAgg._sum.price ?? 0);

    // Total API balance
    const apiBalanceAgg = await prisma.apiAccount.aggregate({
      where: { userId: user.id },
      _sum: { prepaidBalance: true },
    });
    const totalApiBalance = apiBalanceAgg._sum.prepaidBalance ?? 0;

    // Upcoming renewals (next 30 days)
    const upcomingRenewals = await prisma.subscription.count({
      where: {
        userId: user.id,
        status: "active",
        renewalDate: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    // Recent activity — last 10 events combined from billing, notifications, sync logs
    const [recentBilling, recentNotifications, recentSyncLogs] = await Promise.all([
      prisma.billingRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.syncLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    type ActivityItem = {
      id: string;
      type: string;
      title: string;
      description: string | null;
      date: Date;
    };

    const recentActivity: ActivityItem[] = [
      ...recentBilling.map((b) => ({
        id: b.id,
        type: "billing" as const,
        title: b.type,
        description: b.description,
        date: b.createdAt,
      })),
      ...recentNotifications.map((n) => ({
        id: n.id,
        type: "notification" as const,
        title: n.title,
        description: n.message,
        date: n.createdAt,
      })),
      ...recentSyncLogs.map((s) => ({
        id: s.id,
        type: "sync" as const,
        title: `Sync: ${s.provider}`,
        description: s.message,
        date: s.createdAt,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    // Spending by month (last 6 months from billing records)
    const billingRecords = await prisma.billingRecord.findMany({
      where: {
        userId: user.id,
        billingDate: { gte: sixMonthsAgo },
      },
      orderBy: { billingDate: "asc" },
    });

    const spendingByMonth: Record<string, number> = {};
    for (const record of billingRecords) {
      const key = `${record.billingDate.getFullYear()}-${String(record.billingDate.getMonth() + 1).padStart(2, "0")}`;
      spendingByMonth[key] = (spendingByMonth[key] ?? 0) + record.amount;
    }

    // Provider spending
    const subscriptionsWithProvider = await prisma.subscription.findMany({
      where: { userId: user.id, status: "active" },
      include: { provider: true },
    });

    const providerSpending: Record<string, number> = {};
    for (const sub of subscriptionsWithProvider) {
      const name = sub.provider.name;
      const monthlyPrice =
        sub.billingCycle === "yearly" ? sub.price / 12 : sub.price;
      providerSpending[name] = (providerSpending[name] ?? 0) + monthlyPrice;
    }

    return Response.json({
      data: {
        activeSubscriptions,
        totalMonthlySpend,
        totalAnnualSpend,
        totalApiBalance,
        upcomingRenewals,
        recentActivity,
        spendingByMonth,
        providerSpending,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return Response.json(
      { data: null, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
