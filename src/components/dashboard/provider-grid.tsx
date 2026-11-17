"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { UsageBar } from "@/components/ui/usage-bar"
import {
  formatCurrency,
  formatRelativeDate,
  getMonthlyEquivalent,
  getUsagePercentage,
} from "@/lib/utils"
import type { SubscriptionData } from "@/lib/types"

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

export function ProviderGrid({ subscriptions }: { subscriptions: SubscriptionData[] }) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <section className="panel flex flex-col items-start justify-center px-5 py-10">
        <p className="text-[13px] font-medium text-ink">No subscriptions yet</p>
        <p className="mt-1 text-[12px] text-ink-3">
          Add your first AI subscription to start tracking spend.
        </p>
        <Link href="/subscriptions" className="btn-primary btn-sm mt-4">
          Add subscription
        </Link>
      </section>
    )
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Provider portfolio</h2>
          <p className="panel-subtitle">
            {subscriptions.length} tracked subscription
            {subscriptions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          View all
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>

      <div className="row-divide">
        {subscriptions.slice(0, 8).map((sub) => {
          const usage = getMainUsageMetric(sub)
          const percentage = usage ? getUsagePercentage(usage.used, usage.quota) : 0
          const monthly = getMonthlyEquivalent(sub.price, sub.billingCycle)

          return (
            <div key={sub.id} className="px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <ProviderIcon slug={sub.providerSlug} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {sub.providerName}
                    </p>
                    <StatusBadge
                      status={sub.status}
                      pulse={sub.status === "active"}
                      className="hidden sm:inline-flex"
                    />
                  </div>
                  <p className="truncate text-[11.5px] text-ink-3">
                    {sub.planName}
                    <span className="sm:hidden"> · {sub.status}</span>
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-medium text-ink tnum">
                    {formatCurrency(monthly, sub.currency)}
                    <span className="text-[10.5px] font-normal text-ink-3">/mo</span>
                  </p>
                  <p className="text-[10.5px] text-ink-3">
                    {sub.renewalDate
                      ? `Renews ${formatRelativeDate(sub.renewalDate)}`
                      : "No renewal set"}
                  </p>
                </div>
              </div>

              {usage && (
                <div className="mt-2.5 pl-11">
                  <UsageBar
                    used={usage.used}
                    quota={usage.quota}
                    unit={usage.unit}
                    showLabel={false}
                  />
                  <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-3 tnum">
                    <span>
                      {usage.used.toLocaleString()} / {usage.quota.toLocaleString()}{" "}
                      {usage.unit}
                    </span>
                    <span
                      className={
                        percentage >= 90
                          ? "text-danger"
                          : percentage >= 75
                            ? "text-warning"
                            : undefined
                      }
                    >
                      {percentage}% used
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ProviderGridSkeleton() {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-36" />
          <div className="skeleton h-2.5 w-24" />
        </div>
        <div className="skeleton h-3 w-12" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-b-0">
          <div className="skeleton h-8 w-8 rounded-[7px]" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-2.5 w-20" />
          </div>
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
    </section>
  )
}
