"use client"

import { motion } from "framer-motion"
import {
  Bot,
  MessageSquare,
  Sparkles,
  GitBranch,
  MousePointer,
  Search,
  Route,
  Wind,
  Smile,
  type LucideIcon,
} from "lucide-react"
import {
  cn,
  formatCurrency,
  formatDate,
  getUsagePercentage,
  getUsageBarColor,
  getUsageColor,
  getStatusBadgeColor,
  formatNumber,
} from "@/lib/utils"
import { PROVIDERS } from "@/lib/providers"
import type { SubscriptionData } from "@/lib/types"

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  MessageSquare,
  Sparkles,
  GitBranch,
  MousePointer,
  Search,
  Route,
  Wind,
  Smile,
}

function getProviderIcon(slug: string): LucideIcon {
  const provider = PROVIDERS[slug]
  if (provider) {
    return ICON_MAP[provider.logoIcon] || Bot
  }
  return Bot
}

function getProviderColor(slug: string): string {
  return PROVIDERS[slug]?.brandColor || "#8b5cf6"
}

interface ProviderGridProps {
  subscriptions: SubscriptionData[]
}

export function ProviderGrid({ subscriptions }: ProviderGridProps) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <p className="text-zinc-500">No active subscriptions yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-vault-text">
        Provider Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subscriptions.map((sub, index) => (
          <ProviderCard key={sub.id} subscription={sub} index={index} />
        ))}
      </div>
    </div>
  )
}

function ProviderCard({
  subscription: sub,
  index,
}: {
  subscription: SubscriptionData
  index: number
}) {
  const Icon = getProviderIcon(sub.providerSlug)
  const color = getProviderColor(sub.providerSlug)

  // Determine the primary usage metric
  const usageMetric = getMainUsageMetric(sub)
  const percentage = usageMetric
    ? getUsagePercentage(usageMetric.used, usageMetric.quota)
    : 0
  const barColor = getUsageBarColor(percentage)
  const textColor = getUsageColor(percentage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="glass-card rounded-xl overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: `${color}22` }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color }} />
            </div>
            <div>
              <p className="font-semibold text-sm text-vault-text">
                {sub.providerName}
              </p>
              <p className="text-xs text-zinc-500">{sub.planName}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              getStatusBadgeColor(sub.status)
            )}
          >
            {sub.status}
          </span>
        </div>

        {/* Usage bar */}
        {usageMetric && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                {formatNumber(usageMetric.used)} / {formatNumber(usageMetric.quota!)}{" "}
                {usageMetric.unit}
              </span>
              <span className={cn("font-medium", textColor)}>
                {percentage}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {sub.quotaResetDate
              ? `Resets ${formatDate(sub.quotaResetDate)}`
              : "No reset date"}
          </span>
          <span className="font-medium text-vault-text">
            {formatCurrency(sub.price, sub.currency)}/{sub.billingCycle === "yearly" ? "yr" : "mo"}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function getMainUsageMetric(sub: SubscriptionData) {
  if (sub.quotaMessages && sub.quotaMessages > 0) {
    return { used: sub.usedMessages, quota: sub.quotaMessages, unit: "messages" }
  }
  if (sub.quotaRequests && sub.quotaRequests > 0) {
    return { used: sub.usedRequests, quota: sub.quotaRequests, unit: "requests" }
  }
  if (sub.quotaTokens && sub.quotaTokens > 0) {
    return { used: sub.usedTokens, quota: sub.quotaTokens, unit: "tokens" }
  }
  if (sub.quotaCredits && sub.quotaCredits > 0) {
    return { used: sub.usedCredits, quota: sub.quotaCredits, unit: "credits" }
  }
  return null
}

export function ProviderGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
            <div className="skeleton h-1.5 w-full rounded-full" />
            <div className="flex justify-between">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
