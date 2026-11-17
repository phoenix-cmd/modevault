"use client"

import { motion } from "framer-motion"
import { Database, Zap, MessageCircle, Coins } from "lucide-react"
import {
  cn,
  formatNumber,
  getUsagePercentage,
  getUsageBarColor,
  getUsageColor,
} from "@/lib/utils"
import type { SubscriptionData, DataSource, UsageUnit } from "@/lib/types"
import { PROVIDERS } from "@/lib/providers"

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

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; className: string }> = {
    api_sync: {
      label: "API Synced",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    manual: {
      label: "Manual",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    estimated: {
      label: "Estimated",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  }
  const { label, className } = config[source]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        className
      )}
    >
      {label}
    </span>
  )
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
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-vault-text">Usage Overview</h2>
      <div className="space-y-3">
        {subsWithUsage.map((sub, index) => {
          const metrics = extractUsageMetrics(sub)
          const color = PROVIDERS[sub.providerSlug]?.brandColor || "#8b5cf6"

          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                delay: index * 0.06,
                ease: "easeOut",
              }}
              className="glass-card rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-sm font-semibold text-vault-text">
                    {sub.providerName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    — {sub.planName}
                  </span>
                </div>
                <DataSourceBadge source={sub.dataSource} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {metrics.map((metric) => {
                  const pct = getUsagePercentage(metric.used, metric.quota)
                  const barColor = getUsageBarColor(pct)
                  const textColor = getUsageColor(pct)
                  const UnitIcon = UNIT_ICON[metric.unit]

                  return (
                    <div key={metric.unit} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <UnitIcon className="h-3 w-3" />
                          {metric.label}
                        </span>
                        <span className={cn("font-medium", textColor)}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/5">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            barColor
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {formatNumber(metric.used)} /{" "}
                        {formatNumber(metric.quota)} {metric.unit}
                      </p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export function UsageOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-36" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex justify-between">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
