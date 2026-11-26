"use client"

import { Database, Zap, MessageCircle, Coins } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { TrustBadge } from "@/components/ui/trust-badge"
import {
  cn,
  formatNumber,
  getUsagePercentage,
  getUsageBarColor,
  getUsageColor,
} from "@/lib/utils"
import type { SubscriptionData, UsageUnit } from "@/lib/types"

interface UsageMetric {
  label: string
  used: number
  quota: number
  unit: UsageUnit
}

function extractUsageMetrics(sub: SubscriptionData): UsageMetric[] {
  const metrics: UsageMetric[] = []

  if (sub.quotaMessages && sub.quotaMessages > 0) {
    metrics.push({
      label: "Messages",
      used: sub.usedMessages,
      quota: sub.quotaMessages,
      unit: "messages",
    })
  }
  if (sub.quotaRequests && sub.quotaRequests > 0) {
    metrics.push({
      label: "Requests",
      used: sub.usedRequests,
      quota: sub.quotaRequests,
      unit: "requests",
    })
  }
  if (sub.quotaTokens && sub.quotaTokens > 0) {
    metrics.push({
      label: "Tokens",
      used: sub.usedTokens,
      quota: sub.quotaTokens,
      unit: "tokens",
    })
  }
  if (sub.quotaCredits && sub.quotaCredits > 0) {
    metrics.push({
      label: "Credits",
      used: sub.usedCredits,
      quota: sub.quotaCredits,
      unit: "credits",
    })
  }

  return metrics
}

const UNIT_ICON: Record<UsageUnit, React.ElementType> = {
  messages: MessageCircle,
  tokens: Database,
  requests: Zap,
  credits: Coins,
  percentage: Zap,
}

interface UsageOverviewProps {
  subscriptions: SubscriptionData[]
}

export function UsageOverview({ subscriptions }: UsageOverviewProps) {
  const subsWithUsage = subscriptions.filter(
    (s) => extractUsageMetrics(s).length > 0
  )

  if (subsWithUsage.length === 0) {
    if (subscriptions.length === 0) return null
    return (
      <div className="border-t border-line py-6">
        <p className="max-w-2xl text-[13px] leading-relaxed text-ink-3">
          {subscriptions.length} subscription{subscriptions.length === 1 ? "" : "s"} tracked, but no quota
          limits are recorded yet. Add message, request, token, or credit limits to surface usage pressure here.
        </p>
      </div>
    )
  }

  return (
    <section className="border-t border-line">
      <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(0,2fr)] items-center gap-8 border-b border-line bg-surface-2/30 px-0 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 sm:grid">
        <span>Subscription</span>
        <span>Quota utilisation</span>
      </div>
      <ul>
        {subsWithUsage.map((sub) => {
          const metrics = extractUsageMetrics(sub)

          return (
            <li
              key={sub.id}
              className="grid gap-4 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(180px,1.2fr)_minmax(0,2fr)] sm:gap-8"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <ProviderIcon slug={sub.providerSlug} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{sub.providerName}</p>
                  <p className="truncate text-[11.5px] text-ink-3">{sub.planName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <TrustBadge source={sub.dataSource} syncedAt={sub.updatedAt} showFreshness={sub.dataSource === "live_api_sync" || sub.dataSource === "api_sync"} />
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      {metrics.length} metric{metrics.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                {metrics.map((metric) => {
                  const pct = getUsagePercentage(metric.used, metric.quota)
                  const UnitIcon = UNIT_ICON[metric.unit]

                  return (
                    <div key={metric.unit} className="min-w-0">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
                          <UnitIcon className="h-3 w-3" strokeWidth={1.8} />
                          {metric.label}
                        </span>
                        <span className={cn("font-mono text-[11px] tabular-nums", getUsageColor(pct))}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-px w-full overflow-hidden bg-surface-3">
                        <div
                          className={cn("h-full transition-[width] duration-500 ease-out", getUsageBarColor(pct))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 font-mono text-[10px] tabular-nums text-ink-3">
                        {formatNumber(metric.used)} / {formatNumber(metric.quota)} {metric.unit}
                      </p>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function UsageOverviewSkeleton() {
  return (
    <section className="border-t border-line pt-5">
      <div className="space-y-2 pb-4">
        <div className="skeleton h-3.5 w-32" />
        <div className="skeleton h-2.5 w-44" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-4 border-t border-line py-4 sm:grid-cols-[minmax(170px,1fr)_minmax(0,2fr)] sm:gap-8"
        >
          <div className="flex items-start gap-2.5">
            <div className="skeleton h-7 w-7 rounded-[6px]" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-2.5 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 2 }).map((__, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-2.5 w-full" />
                <div className="skeleton h-px w-full" />
                <div className="skeleton h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
