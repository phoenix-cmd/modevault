import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUserOrDefault } from "@/lib/auth"

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Active subscriptions count
    const activeSubscriptions = await db.orm.public.Subscription
      .where({ userId: user.id })
      .where({ status: "active" })
      .aggregate((a) => ({ total: a.count() }))
      .then((r) => r.total);

    // Total monthly spend (sum of active monthly subscription prices)
    const activeMonthlyAgg = await db.orm.public.Subscription
      .where({ userId: user.id })
      .where({ status: "active" })
      .where({ billingCycle: "monthly" })
      .aggregate((a) => ({ price: a.sum("price") }));
    const activeYearlyAgg = await db.orm.public.Subscription
      .where({ userId: user.id })
      .where({ status: "active" })
      .where({ billingCycle: "yearly" })
      .aggregate((a) => ({ price: a.sum("price") }));

    const monthlyFromMonthly = activeMonthlyAgg.price ?? 0;
    const monthlyFromYearly = (activeYearlyAgg.price ?? 0) / 12;
    const totalMonthlySpend = monthlyFromMonthly + monthlyFromYearly;
    const totalAnnualSpend = monthlyFromMonthly * 12 + (activeYearlyAgg.price ?? 0);

    // Total API balance
    const apiBalanceAgg = await db.orm.public.ApiAccount
      .where({ userId: user.id })
      .aggregate((a) => ({ prepaidBalance: a.sum("prepaidBalance") }));
    const totalApiBalance = apiBalanceAgg.prepaidBalance ?? 0;

    // Upcoming renewals (next 30 days)
    const upcomingRenewals = await db.orm.public.Subscription
      .where({ userId: user.id })
      .where({ status: "active" })
      .where((s) => s.renewalDate.gte(now))
      .where((s) => s.renewalDate.lte(thirtyDaysFromNow))
      .aggregate((a) => ({ total: a.count() }))
      .then((r) => r.total);

    // Recent activity — last 10 events combined from billing, notifications, sync logs
    const [recentBilling, recentNotifications, recentSyncLogs] = await Promise.all([
      db.orm.public.BillingRecord
        .where({ userId: user.id })
        .orderBy((b) => b.createdAt.desc())
        .limit(10)
        .all(),
      db.orm.public.Notification
        .where({ userId: user.id })
        .orderBy((n) => n.createdAt.desc())
        .limit(10)
        .all(),
      db.orm.public.SyncLog
        .where({ userId: user.id })
        .orderBy((s) => s.createdAt.desc())
        .limit(10)
        .all(),
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
    const billingRecords = await db.orm.public.BillingRecord
      .where({ userId: user.id })
      .where((b) => b.billingDate.gte(sixMonthsAgo))
      .orderBy((b) => b.billingDate.asc())
      .all();

    const spendingByMonth: Record<string, number> = {};
    for (const record of billingRecords) {
      const key = `${record.billingDate.getFullYear()}-${String(record.billingDate.getMonth() + 1).padStart(2, "0")}`;
      spendingByMonth[key] = (spendingByMonth[key] ?? 0) + record.amount;
    }

    // Provider spending
    const subscriptionsWithProvider = await db.orm.public.Subscription
      .include("provider")
      .where({ userId: user.id })
      .where({ status: "active" })
      .all();

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
