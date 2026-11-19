"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { SummaryCards, SummaryCardsSkeleton } from "@/components/dashboard/summary-cards"
import { UsageOverview, UsageOverviewSkeleton } from "@/components/dashboard/usage-overview"
import { SpendingCharts, SpendingChartsSkeleton } from "@/components/dashboard/spending-charts"
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/activity-feed"
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

        const [dashRes, subRes, suggestionRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/subscriptions"),
          fetch("/api/suggestions"),
        ])

        const [dashJson, subJson, suggestionJson] = await Promise.all([
          dashRes.json(),
          subRes.json(),
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
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow={`Workspace · ${reportingPeriod}`}
        title="Overview"
        description="Spend, quota pressure, and agent activity across your AI stack."
        action={
          <>
            <Link href="/analytics" className="btn-secondary">
              View analytics
            </Link>
            <Link href="/subscriptions" className="btn-primary">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Add subscription
            </Link>
          </>
        }
      />

      {loading || !summary ? (
        <SummaryCardsSkeleton />
      ) : (
        <SummaryCards data={summary} />
      )}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-8">
          {loading ? (
            <SpendingChartsSkeleton />
          ) : (
            <SpendingCharts
              monthlySpending={spendingHistory}
              providerSpending={providerSpending}
            />
          )}

          {loading ? (
            <UsageOverviewSkeleton />
          ) : (
            <UsageOverview subscriptions={subscriptions} />
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          {loading ? (
            <SuggestionsCardSkeleton />
          ) : (
            <SuggestionsCard suggestions={suggestions} />
          )}

          {loading ? (
            <ActivityFeedSkeleton />
          ) : (
            <ActivityFeed activities={activities} />
          )}
        </aside>
      </div>
    </div>
  )
}
