"use client"

import { useEffect, useState } from "react"
import { SummaryCards, SummaryCardsSkeleton } from "@/components/dashboard/summary-cards"
import { ProviderGrid } from "@/components/dashboard/provider-grid"
import { UsageOverview, UsageOverviewSkeleton } from "@/components/dashboard/usage-overview"
import { SpendingCharts, SpendingChartsSkeleton } from "@/components/dashboard/spending-charts"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickInsights } from "@/components/dashboard/quick-insights"
import { PageHeader } from "@/components/ui/page-header"
import type {
  DashboardSummary,
  SpendingDataPoint,
  ProviderSpendingData,
  ActivityItem,
  SubscriptionData,
  NotificationData,
} from "@/lib/types"

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [spendingHistory, setSpendingHistory] = useState<SpendingDataPoint[]>([])
  const [providerSpending, setProviderSpending] = useState<ProviderSpendingData[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // 1. Fetch dashboard stats
        const [dashRes, subRes, notifRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/subscriptions"),
          fetch("/api/notifications"),
        ])

        const [dashJson, subJson, notifJson] = await Promise.all([
          dashRes.json(),
          subRes.json(),
          notifRes.json(),
        ])

        if (dashJson.data) {
          const d = dashJson.data
          setSummary({
            activeSubscriptions: d.activeSubscriptions,
            totalMonthlySpend: d.totalMonthlySpend,
            totalAnnualSpend: d.totalAnnualSpend,
            totalApiBalance: d.totalApiBalance,
            upcomingRenewals: d.upcomingRenewals,
            currency: "INR",
          })

          // Transform spending by month
          if (d.spendingByMonth) {
            const points: SpendingDataPoint[] = Object.entries(d.spendingByMonth).map(
              ([key, amount]: [string, any]) => {
                const date = new Date(`${key}-01`)
                const month = date.toLocaleString("default", { month: "short" })
                return {
                  month,
                  subscriptions: Math.round(Number(amount) * 0.7),
                  api: Math.round(Number(amount) * 0.3),
                  total: Math.round(Number(amount)),
                }
              }
            )
            setSpendingHistory(points)
          }

          // Transform provider spending
          if (d.providerSpending) {
            const provPoints: ProviderSpendingData[] = Object.entries(d.providerSpending).map(
              ([name, amount]: [string, any]) => {
                const slug = name.toLowerCase().replace(/ /g, "-") as any
                const colors: Record<string, string> = {
                  OpenAI: "#10a37f",
                  Anthropic: "#d4a574",
                  Google: "#4285f4",
                  "GitHub Copilot": "#6e40c9",
                  Cursor: "#00d4aa",
                  Perplexity: "#20b2aa",
                  Windsurf: "#059669",
                  OpenRouter: "#6366f1",
                  "Hugging Face": "#ff9d00",
                }
                return {
                  provider: name,
                  providerSlug: slug,
                  amount: Math.round(Number(amount)),
                  color: colors[name] || "#8b5cf6",
                }
              }
            )
            setProviderSpending(provPoints)
          }

          if (d.recentActivity) {
            const mappedActivities: ActivityItem[] = d.recentActivity.map((a: any) => ({
              id: a.id,
              type: a.type === "billing" ? "billing" : a.type === "sync" ? "sync" : "alert",
              title: a.title,
              description: a.description || "",
              provider: null,
              providerSlug: null,
              timestamp: a.date,
              severity: "info",
            }))
            setActivities(mappedActivities)
          }
        }

        if (subJson.data) {
          const subs: SubscriptionData[] = subJson.data.map((s: any) => ({
            id: s.id,
            userId: s.userId,
            providerId: s.providerId,
            providerSlug: s.provider?.slug || "openai",
            providerName: s.provider?.name || "Provider",
            planName: s.customPlanName || s.plan?.name || "Standard Plan",
            type: s.type || "consumer",
            status: s.status || "active",
            billingCycle: s.billingCycle || "monthly",
            price: s.price,
            currency: s.currency || "INR",
            startDate: s.startDate,
            renewalDate: s.renewalDate,
            expiryDate: s.expiryDate,
            quotaMessages: s.quotaMessages,
            quotaTokens: s.quotaTokens,
            quotaRequests: s.quotaRequests,
            quotaCredits: s.quotaCredits,
            usedMessages: s.usedMessages || 0,
            usedTokens: s.usedTokens || 0,
            usedRequests: s.usedRequests || 0,
            usedCredits: s.usedCredits || 0,
            quotaResetDate: s.quotaResetDate,
            quotaResetPeriod: s.quotaResetPeriod,
            dataSource: s.dataSource || "manual",
            notes: s.notes,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          }))
          setSubscriptions(subs)
        }

        if (notifJson.data?.notifications) {
          setNotifications(notifJson.data.notifications)
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Command Center"
        description="Unified monitoring, quota utilization, and expenditure analytics across your AI stack."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Ecosystem
          </span>
        }
      />

      {/* Summary Cards */}
      {loading || !summary ? (
        <SummaryCardsSkeleton />
      ) : (
        <SummaryCards data={summary} />
      )}

      {/* Provider Cards Overview */}
      <ProviderGrid subscriptions={subscriptions} />

      {/* Two Column Section: Usage Overview & Quick Insights */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <UsageOverviewSkeleton />
          ) : (
            <UsageOverview subscriptions={subscriptions} />
          )}
        </div>
        <div>
          <QuickInsights
            subscriptions={subscriptions}
            notifications={notifications}
            totalProviders={subscriptions.length}
          />
        </div>
      </div>

      {/* Spending Analytics */}
      {loading ? (
        <SpendingChartsSkeleton />
      ) : (
        <SpendingCharts
          monthlySpending={spendingHistory}
          providerSpending={providerSpending}
        />
      )}

      {/* Recent Activity Timeline */}
      {activities.length > 0 && <ActivityFeed activities={activities} />}
    </div>
  )
}
