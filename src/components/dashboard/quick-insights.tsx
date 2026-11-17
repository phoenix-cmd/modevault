"use client"

/* eslint-disable react-hooks/set-state-in-effect -- current time is resolved after hydration */

import { useEffect, useState } from "react"
import { AlertTriangle, CalendarClock, TrendingUp } from "lucide-react"
import {
  cn,
  formatCurrency,
  formatRelativeDate,
  getMonthlyEquivalent,
} from "@/lib/utils"
import type { SubscriptionData, NotificationData } from "@/lib/types"

interface QuickInsightsProps {
  subscriptions: SubscriptionData[]
  notifications: NotificationData[]
  totalProviders: number
}

export function QuickInsights({
  subscriptions,
  notifications,
  totalProviders,
}: QuickInsightsProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  const alerts = notifications
    .filter(
      (n) =>
        !n.isRead &&
        (n.severity === "warning" || n.severity === "critical")
    )
    .slice(0, 3)

  const renewals = now
    ? subscriptions
        .filter((s) => {
          if (!s.renewalDate || s.status !== "active") return false
          const diff = new Date(s.renewalDate).getTime() - now.getTime()
          return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000
        })
        .sort(
          (a, b) =>
            new Date(a.renewalDate!).getTime() -
            new Date(b.renewalDate!).getTime()
        )
        .slice(0, 3)
    : []

  const monthlyRunRate = subscriptions
    .filter((s) => s.status === "active")
    .reduce(
      (sum, s) => sum + getMonthlyEquivalent(s.price, s.billingCycle),
      0
    )

  const hasMonthlyPlans = subscriptions.some(
    (s) =>
      s.status === "active" && s.billingCycle === "monthly" && (s.price ?? 0) > 0
  )

  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Signals</h2>
          <p className="panel-subtitle">Alerts and renewals to watch</p>
        </div>
      </div>

      <div className="row-divide flex-1">
        {/* Alerts */}
        <div className="px-4 py-3.5 sm:px-5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Alerts
          </div>
          {alerts.length > 0 ? (
            <ul className="space-y-2.5">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full",
                      alert.severity === "critical" ? "bg-danger" : "bg-warning"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">
                      {alert.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                      {alert.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-3">
              All clear — no active alerts.
            </p>
          )}
        </div>

        {/* Renewals */}
        <div className="px-4 py-3.5 sm:px-5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
            <CalendarClock className="h-3 w-3" strokeWidth={2} />
            Renewing in 14 days
          </div>
          {renewals.length > 0 ? (
            <ul className="space-y-2">
              {renewals.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {sub.providerName}
                    </p>
                    <p className="text-[11px] text-ink-3">
                      {formatRelativeDate(sub.renewalDate!)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-medium text-ink tnum">
                    {formatCurrency(sub.price, sub.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-3">Nothing due in the next 14 days.</p>
          )}
        </div>
      </div>

      {/* Run rate */}
      <div className="border-t border-line bg-surface-2/50 px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <TrendingUp className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.8} />
            Monthly run-rate
            <span className="text-ink-3">
              · {totalProviders} provider{totalProviders === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-[12.5px] font-semibold text-ink tnum">
            {formatCurrency(monthlyRunRate, "INR")}
          </span>
        </div>
        {hasMonthlyPlans && (
          <p className="mt-2.5 rounded-md border border-accent-line bg-accent-soft px-2.5 py-2 text-[11.5px] leading-relaxed text-accent">
            Switching monthly plans to annual billing could save up to 20%.
          </p>
        )}
      </div>
    </section>
  )
}

export function QuickInsightsSkeleton() {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-16" />
          <div className="skeleton h-2.5 w-36" />
        </div>
      </div>
      <div className="space-y-5 border-b border-line px-5 py-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="space-y-2 px-5 py-4">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-8 w-full rounded-md" />
      </div>
    </section>
  )
}
