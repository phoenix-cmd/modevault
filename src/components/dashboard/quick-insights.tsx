"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CalendarClock,
  Lightbulb,
  Layers,
  TrendingDown,
} from "lucide-react"
import { cn, formatCurrency, formatRelativeDate } from "@/lib/utils"
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

  // Build alerts from active notifications
  const alerts = notifications
    .filter((n) => !n.isRead && (n.severity === "warning" || n.severity === "critical"))
    .slice(0, 4)

  // Find upcoming renewals within 14 days
  const renewals = now
    ? subscriptions
        .filter((s) => {
          if (!s.renewalDate || s.status !== "active") return false
          const diff = new Date(s.renewalDate).getTime() - now.getTime()
          return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000
        })
        .sort(
          (a, b) =>
            new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime()
        )
        .slice(0, 4)
    : []

  // Calculate simple insight: total monthly cost
  const totalMonthly = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.price, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-vault-text">
        Quick Insights
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Smart Alerts */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-vault-text">
              Smart Alerts
            </h3>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs",
                    alert.severity === "critical"
                      ? "bg-red-500/8 text-red-300"
                      : "bg-amber-500/8 text-amber-300"
                  )}
                >
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-0.5 text-[11px] opacity-70">
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              All clear — no alerts right now.
            </p>
          )}
        </div>

        {/* Upcoming Renewals */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-vault-text">
              Upcoming Renewals
            </h3>
          </div>
          {renewals.length > 0 ? (
            <div className="space-y-2">
              {renewals.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-vault-text">
                      {sub.providerName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {formatRelativeDate(sub.renewalDate!)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-vault-text">
                    {formatCurrency(sub.price, sub.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              No renewals in the next 14 days.
            </p>
          )}
        </div>

        {/* Intelligence Summary */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-vault-text">
              Intelligence
            </h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Layers className="h-3.5 w-3.5 text-violet-400" />
              <span>
                Tracking{" "}
                <span className="font-semibold text-vault-text">
                  {totalProviders}
                </span>{" "}
                provider{totalProviders !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Monthly AI spend:{" "}
                <span className="font-semibold text-vault-text">
                  {formatCurrency(totalMonthly, "INR")}
                </span>
              </span>
            </div>
            {subscriptions.some(
              (s) =>
                s.status === "active" &&
                s.billingCycle === "monthly" &&
                (s.price ?? 0) > 0
            ) && (
              <div className="mt-2 rounded-lg bg-violet-500/8 px-3 py-2 text-[11px] text-violet-300">
                💡 Switching monthly plans to annual could save you up to 20%.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function QuickInsightsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-32" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 space-y-3">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
