"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
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
import { cn, formatNumber } from "@/lib/utils"
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

interface ExecutionRow {
  id: string
  title: string
  status: string
  targetBranch?: string | null
  totalTokens?: number | null
  estimatedCost?: number | null
  project?: { id: string; name: string } | null
  tasks?: Array<{ id: string; status: string }>
}

interface ProjectRow {
  id: string
  name: string
  framework?: string | null
  language?: string | null
  executions?: Array<{ id: string }>
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [spendingHistory, setSpendingHistory] = useState<SpendingDataPoint[]>([])
  const [providerSpending, setProviderSpending] = useState<ProviderSpendingData[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [executions, setExecutions] = useState<ExecutionRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [reportingPeriod, setReportingPeriod] = useState("—")

  useEffect(() => {
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

        const [dashRes, subRes, suggestionRes, execRes, projRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/subscriptions"),
          fetch("/api/suggestions"),
          fetch("/api/executions"),
          fetch("/api/projects"),
        ])

        const [dashJson, subJson, suggestionJson, execJson, projJson] = await Promise.all([
          dashRes.json(),
          subRes.json(),
          suggestionRes.json().catch(() => ({ data: null })),
          execRes.json().catch(() => ({ data: [] })),
          projRes.json().catch(() => ({ data: [] })),
        ])

        setSuggestions((suggestionJson?.data?.suggestions as Suggestion[]) || [])
        setExecutions(Array.isArray(execJson?.data) ? execJson.data : [])
        setProjects(Array.isArray(projJson?.data) ? projJson.data : [])

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
                color: "var(--mv-chart-1)",
              }
            })
            setProviderSpending(provPoints)
          }

          if (d.recentActivity) {
            const mappedActivities: ActivityItem[] = d.recentActivity.map((a) => ({
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
    (s) =>
      (s.quotaMessages ?? 0) > 0 ||
      (s.quotaRequests ?? 0) > 0 ||
      (s.quotaTokens ?? 0) > 0 ||
      (s.quotaCredits ?? 0) > 0
  ).length
  const runningExecutions = executions.filter((e) => e.status === "running").length
  const awaitingApproval = executions.filter((e) => e.status === "awaiting_approval").length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow={`Workspace · ${reportingPeriod}`}
        title="Overview"
        description="Operational console for agent executions, pending approvals, project activity, resource quotas, and recorded spend."
        action={
          <>
            <Link href="/agents" className="btn-secondary">
              Agent Center
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

      {/* Operations Register: Executions, Approvals & Projects */}
      <section aria-label="Operations and projects" className="border-t border-line pt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
              Agent operations &amp; approvals
            </h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {executions.length} runs · {runningExecutions} running · {awaitingApproval} awaiting approval · {projects.length} projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:text-accent"
            >
              Verify queue
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent transition-opacity hover:opacity-80"
            >
              Open Agent Center
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 border-y border-line py-5">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ) : executions.length === 0 ? (
          <EmptyPanel message="No agent runs recorded yet. Open Agent Center to dispatch the first execution against a project." />
        ) : (
          <>
            <div className="hidden overflow-x-auto border-y border-line md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Execution</th>
                    <th>Project</th>
                    <th className="hidden xl:table-cell">Branch</th>
                    <th className="hidden lg:table-cell">Tasks</th>
                    <th className="text-right">Tokens</th>
                    <th className="text-right">Est. cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.slice(0, 6).map((exec) => (
                    <tr key={exec.id}>
                      <td className="max-w-[260px]">
                        <Link
                          href="/agents"
                          className="block truncate font-medium text-ink transition-colors hover:text-accent"
                        >
                          {exec.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[11px] text-ink-2">
                        {exec.project?.name || "—"}
                      </td>
                      <td className="hidden whitespace-nowrap font-mono text-[11px] text-ink-3 xl:table-cell">
                        {exec.targetBranch || "—"}
                      </td>
                      <td className="hidden whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-2 lg:table-cell">
                        {exec.tasks?.length ?? 0} stages
                      </td>
                      <td className="text-right font-mono text-[11px] tabular-nums text-ink-2">
                        {formatNumber(Number(exec.totalTokens || 0))}
                      </td>
                      <td className="text-right font-mono text-[11px] tabular-nums text-ink">
                        ${Number(exec.estimatedCost || 0).toFixed(3)}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "badge",
                            exec.status === "completed"
                              ? "bg-success-soft text-success"
                              : exec.status === "awaiting_approval"
                              ? "bg-accent-soft text-accent"
                              : exec.status === "failed"
                              ? "bg-danger-soft text-danger"
                              : "bg-surface-2 text-ink-3"
                          )}
                        >
                          {String(exec.status || "unknown").replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line border-y border-line md:hidden">
              {executions.slice(0, 6).map((exec) => (
                <div key={exec.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href="/agents"
                        className="block text-[13px] font-medium leading-snug text-ink transition-colors hover:text-accent"
                      >
                        {exec.title}
                      </Link>
                      <p className="mt-1 font-mono text-[10.5px] text-ink-3">
                        {exec.project?.name || "Workspace"} ·{" "}
                        <span className="tabular-nums text-ink-2">
                          ${Number(exec.estimatedCost || 0).toFixed(3)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "badge shrink-0",
                        exec.status === "completed"
                          ? "bg-success-soft text-success"
                          : exec.status === "awaiting_approval"
                          ? "bg-accent-soft text-accent"
                          : exec.status === "failed"
                          ? "bg-danger-soft text-danger"
                          : "bg-surface-2 text-ink-3"
                      )}
                    >
                      {String(exec.status || "unknown").replaceAll("_", " ")}
                    </span>
                  </div>

                  <details className="mt-2 group">
                    <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 select-none hover:text-ink-2">
                      Run telemetry &amp; branch details
                    </summary>
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line/70 pt-2 font-mono text-[10.5px]">
                      <div className="min-w-0">
                        <span className="block text-[9px] uppercase tracking-[0.08em] text-ink-3">
                          Branch
                        </span>
                        <span className="truncate block text-ink-2">{exec.targetBranch || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-[0.08em] text-ink-3">
                          Tasks
                        </span>
                        <span className="tabular-nums text-ink-2">{exec.tasks?.length ?? 0} stages</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] uppercase tracking-[0.08em] text-ink-3">
                          Tokens
                        </span>
                        <span className="tabular-nums text-ink-2">
                          {formatNumber(Number(exec.totalTokens || 0))}
                        </span>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

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
