"use client"

import { Database, Zap, MessageCircle, Coins } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import {
  cn,
  formatNumber,
  getUsagePercentage,
  getUsageBarColor,
  getUsageColor,
} from "@/lib/utils"
import type { SubscriptionData, DataSource, UsageUnit } from "@/lib/types"

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

const DATA_SOURCE_STYLE: Record<DataSource, { label: string; className: string }> = {
  api_sync: {
    label: "Synced",
    className: "bg-success-soft text-success",
  },
  manual: {
    label: "Manual",
    className: "bg-info-soft text-info",
  },
  estimated: {
    label: "Estimated",
    className: "bg-warning-soft text-warning",
  },
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
    return null
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Usage &amp; quota</h2>
          <p className="panel-subtitle">
            Consumption across {subsWithUsage.length} metered plan
            {subsWithUsage.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="row-divide">
        {subsWithUsage.map((sub) => {
          const metrics = extractUsageMetrics(sub)
          const source = DATA_SOURCE_STYLE[sub.dataSource]

          return (
            <div key={sub.id} className="px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProviderIcon slug={sub.providerSlug} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {sub.providerName}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-3">
                      {sub.planName}
                    </p>
                  </div>
                </div>
                <span className={cn("badge shrink-0", source.className)}>
                  {source.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {metrics.map((metric) => {
                  const pct = getUsagePercentage(metric.used, metric.quota)
                  const UnitIcon = UNIT_ICON[metric.unit]

                  return (
                    <div key={metric.unit}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11.5px]">
                        <span className="flex items-center gap-1.5 text-ink-3">
                          <UnitIcon className="h-3 w-3" strokeWidth={1.8} />
                          {metric.label}
                        </span>
                        <span
                          className={cn(
                            "font-medium tnum",
                            getUsageColor(pct)
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500 ease-out",
                            getUsageBarColor(pct)
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10.5px] text-ink-3 tnum">
                        {formatNumber(metric.used)} / {formatNumber(metric.quota)}{" "}
                        {metric.unit}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function UsageOverviewSkeleton() {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-32" />
          <div className="skeleton h-2.5 w-44" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="border-b border-line px-5 py-4 last:border-b-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="skeleton h-7 w-7 rounded-[6px]" />
              <div className="space-y-1.5">
                <div className="skeleton h-3.5 w-28" />
                <div className="skeleton h-2.5 w-20" />
              </div>
            </div>
            <div className="skeleton h-4 w-14 rounded" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((__, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-2.5 w-full" />
                <div className="skeleton h-1 w-full rounded-full" />
                <div className="skeleton h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
