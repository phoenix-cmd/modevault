"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Plus } from "lucide-react"
import { SummaryCards, SummaryCardsSkeleton } from "@/components/dashboard/summary-cards"
import { ProviderGrid, ProviderGridSkeleton } from "@/components/dashboard/provider-grid"
import { UsageOverview, UsageOverviewSkeleton } from "@/components/dashboard/usage-overview"
import { SpendingCharts, SpendingChartsSkeleton } from "@/components/dashboard/spending-charts"
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/activity-feed"
import { QuickInsights, QuickInsightsSkeleton } from "@/components/dashboard/quick-insights"
import {
  SuggestionsCard,
  SuggestionsCardSkeleton,
} from "@/components/dashboard/suggestions-card"
import { PageHeader } from "@/components/ui/page-header"
import { PROVIDERS } from "@/lib/providers"
import type { Suggestion } from "@/lib/suggestions"
import type {
  DashboardSummary,
  SpendingDataPoint,
  ProviderSpendingData,
  ActivityItem,
  RawSubscription,
  SubscriptionData,
  NotificationData,
} from "@/lib/types"

interface DashboardApiData {
  activeSubscriptions: number
  totalMonthlySpend: number
  totalAnnualSpend: number
  totalApiBalance: number
  upcomingRenewals: number
  spendingByMonth?: Record<string, number>
  providerSpending?: Record<string, number>
  recentActivity?: Array<{
    id: string
    type: string
    title: string
    description?: string
    date: string
  }>
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [spendingHistory, setSpendingHistory] = useState<SpendingDataPoint[]>([])
  const [providerSpending, setProviderSpending] = useState<ProviderSpendingData[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reportingPeriod, setReportingPeriod] = useState("—")

  useEffect(() => {
    // Resolve after hydration so the prerender stays deterministic.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock value
    setReportingPeriod(
      new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    )
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const [dashRes, subRes, notifRes, suggestionRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/subscriptions"),
          fetch("/api/notifications"),
          fetch("/api/suggestions"),
        ])

        const [dashJson, subJson, notifJson, suggestionJson] = await Promise.all([
          dashRes.json(),
          subRes.json(),
          notifRes.json(),
          suggestionRes.json().catch(() => ({ data: null })),
        ])

        setSuggestions((suggestionJson?.data?.suggestions as Suggestion[]) || [])

        if (dashJson.data) {
          const d = dashJson.data as DashboardApiData
          setSummary({
            activeSubscriptions: d.activeSubscriptions,
            totalMonthlySpend: d.totalMonthlySpend,
            totalAnnualSpend: d.totalAnnualSpend,
            totalApiBalance: d.totalApiBalance,
            upcomingRenewals: d.upcomingRenewals,
            currency: "INR",
          })

          if (d.spendingByMonth) {
            const points: SpendingDataPoint[] = Object.entries(d.spendingByMonth).map(
              ([key, amount]) => {
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

          if (d.providerSpending) {
            const provPoints: ProviderSpendingData[] = Object.entries(
              d.providerSpending
            ).map(([name, amount]) => {
              const known = Object.values(PROVIDERS).find(
                (provider) => provider.name === name
              )
              return {
                provider: name,
                providerSlug: known?.slug ?? "openai",
                amount: Math.round(Number(amount)),
                color: "#5b61d6",
              }
            })
            setProviderSpending(provPoints)
          }

          if (d.recentActivity) {
            const mappedActivities: ActivityItem[] = d.recentActivity.map(
              (a) => ({
                id: a.id,
                type: a.type === "billing" ? "billing" : a.type === "sync" ? "sync" : "alert",
                title: a.title,
                description: a.description || "",
                provider: null,
                providerSlug: null,
                timestamp: a.date,
                severity: "info",
              })
            )
            setActivities(mappedActivities)
          }
        }

        if (subJson.data) {
          const subs: SubscriptionData[] = subJson.data.map((s: RawSubscription) => ({
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
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dashboard"
        description="A single view of subscription spend, quota consumption and upcoming renewals across your AI stack."
        action={
          <>
            <Link href="/analytics" className="btn-secondary">
              View analytics
            </Link>
            <Link href="/subscriptions" className="btn-primary">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add subscription
            </Link>
          </>
        }
      />

      <div className="-mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
        Reporting period
        <span className="text-ink-2">·</span>
        <span className="font-medium text-ink-2">{reportingPeriod}</span>
      </div>

      {loading || !summary ? <SummaryCardsSkeleton /> : <SummaryCards data={summary} />}

      {loading ? (
        <SuggestionsCardSkeleton />
      ) : (
        <SuggestionsCard suggestions={suggestions} />
      )}

      {loading ? (
        <SpendingChartsSkeleton />
      ) : (
        <SpendingCharts
          monthlySpending={spendingHistory}
          providerSpending={providerSpending}
        />
      )}

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {loading ? (
            <UsageOverviewSkeleton />
          ) : (
            <UsageOverview subscriptions={subscriptions} />
          )}
        </div>
        <div className="min-w-0">
          {loading ? (
            <QuickInsightsSkeleton />
          ) : (
            <QuickInsights
              subscriptions={subscriptions}
              notifications={notifications}
              totalProviders={subscriptions.length}
            />
          )}
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {loading ? (
            <ProviderGridSkeleton />
          ) : (
            <ProviderGrid subscriptions={subscriptions} />
          )}
        </div>
        <div className="min-w-0">
          {loading ? (
            <ActivityFeedSkeleton />
          ) : (
            <ActivityFeed activities={activities} />
          )}
        </div>
      </div>
    </div>
  )
}
