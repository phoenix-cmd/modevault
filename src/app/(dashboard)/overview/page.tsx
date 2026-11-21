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

  const trackedProviders = new Set(subscriptions.map((s) => s.providerId || s.providerName)).size
  const meteredSubscriptions = subscriptions.filter(
    (s) => (s.quotaMessages ?? 0) > 0 || (s.quotaRequests ?? 0) > 0 || (s.quotaTokens ?? 0) > 0 || (s.quotaCredits ?? 0) > 0
  ).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow={`Workspace · ${reportingPeriod}`}
        title="Overview"
        description="Operational summary of spend, resource quotas, and recorded activity across connected providers and subscriptions."
        action={
          <>
            <Link href="/analytics" className="btn-secondary">
              Open analytics
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

      <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-10">
          <section aria-label="Spend and allocation">
            <SectionLabel
              title="Spend & allocation"
              meta="Recorded billing and provider distribution"
            />
            {loading ? (
              <SpendingChartsSkeleton />
            ) : spendingHistory.length === 0 && providerSpending.length === 0 ? (
              <EmptyPanel message="No spending history is recorded yet. Add subscriptions or usage records to populate trend and provider allocation." />
            ) : (
              <SpendingCharts
                monthlySpending={spendingHistory}
                providerSpending={providerSpending}
              />
            )}
          </section>

          <section aria-label="Resource quotas">
            <SectionLabel
              title="Resource quotas"
              meta={
                loading
                  ? "Metered subscription usage"
                  : `${meteredSubscriptions} metered of ${subscriptions.length} tracked subscriptions · ${trackedProviders} providers`
              }
            />
            {loading ? (
              <UsageOverviewSkeleton />
            ) : subscriptions.length === 0 ? (
              <EmptyPanel message="No subscriptions are tracked yet. Quota pressure and consumption will appear here once plans with limits are added." />
            ) : (
              <UsageOverview subscriptions={subscriptions} />
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-10 lg:border-l lg:border-line lg:pl-8">
          <section aria-label="Recommendations">
            <SectionLabel title="Recommendations" meta="Signals from live records" />
            {loading ? (
              <SuggestionsCardSkeleton />
            ) : (
              <SuggestionsCard suggestions={suggestions} />
            )}
          </section>

          <section aria-label="Development activity">
            <SectionLabel title="Development activity" meta="Recent recorded events" />
            {loading ? (
              <ActivityFeedSkeleton />
            ) : activities.length === 0 ? (
              <EmptyPanel message="No recent activity recorded yet. Sync, billing, and usage events will appear in this timeline." />
            ) : (
              <ActivityFeed activities={activities} />
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function SectionLabel({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{meta}</p>
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="border-t border-line py-8">
      <p className="max-w-2xl text-[13px] leading-relaxed text-ink-3">{message}</p>
    </div>
  )
}
