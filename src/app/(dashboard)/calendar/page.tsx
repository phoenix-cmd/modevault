"use client"

import { useEffect, useState } from "react"
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"
import type { SubscriptionData } from "@/lib/types"

export default function CalendarPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)

  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/subscriptions")
        const json = await res.json()
        if (json.data) {
          const subs: SubscriptionData[] = json.data
            .filter((s: any) => s.status === "active" && s.renewalDate)
            .map((s: any) => ({
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
            .sort(
              (a: any, b: any) =>
                new Date(a.renewalDate!).getTime() -
                new Date(b.renewalDate!).getTime()
            )
          setSubscriptions(subs)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const currentTime = now ? now.getTime() : 0

  // Categorize
  const next7Days = now
    ? subscriptions.filter((s) => {
        const diff = new Date(s.renewalDate!).getTime() - currentTime
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
      })
    : []

  const next30Days = now
    ? subscriptions.filter((s) => {
        const diff = new Date(s.renewalDate!).getTime() - currentTime
        return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 30 * 24 * 60 * 60 * 1000
      })
    : []

  const laterRenewals = now
    ? subscriptions.filter((s) => {
        const diff = new Date(s.renewalDate!).getTime() - currentTime
        return diff > 30 * 24 * 60 * 60 * 1000
      })
    : []

  const totalUpcoming30Days = [...next7Days, ...next30Days].reduce(
    (sum, s) => sum + s.price,
    0
  )

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Renewal Calendar"
        description="Forward-looking billing schedule, renewal forecasts, and cancellation warning horizons."
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Imminent (Within 7 Days)</p>
            <p className="text-2xl font-bold text-red-400">{next7Days.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Next 30 Days Committed</p>
            <p className="text-2xl font-bold text-zinc-100">
              {formatCurrency(totalUpcoming30Days, "INR")}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <CreditCard className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Tracked Active Schedules</p>
            <p className="text-2xl font-bold text-emerald-400">{subscriptions.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </GlassCard>
      </div>

      {/* Imminent Renewals Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Imminent Renewals (Next 7 Days)
          </h2>
        </div>

        {next7Days.length === 0 ? (
          <GlassCard className="p-6 text-center text-xs text-zinc-500">
            No subscriptions renew in the next 7 days.
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {next7Days.map((sub) => (
              <GlassCard
                key={sub.id}
                className="p-4 border-red-500/30 bg-red-500/[0.02] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon slug={sub.providerSlug} name={sub.providerName} size="md" />
                  <div>
                    <h4 className="font-semibold text-zinc-100 text-sm">{sub.providerName}</h4>
                    <p className="text-xs text-zinc-400">{sub.planName}</p>
                    <p className="text-[11px] text-red-400 font-medium mt-1">
                      Renews {formatRelativeDate(sub.renewalDate!)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-zinc-100">
                    {formatCurrency(sub.price, sub.currency)}
                  </p>
                  <p className="text-[10px] text-zinc-500 capitalize">{sub.billingCycle}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Next 30 Days Renewals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Upcoming in 30 Days
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {next30Days.map((sub) => (
            <GlassCard
              key={sub.id}
              className="p-4 border-amber-500/20 bg-amber-500/[0.01] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ProviderIcon slug={sub.providerSlug} name={sub.providerName} size="sm" />
                <div>
                  <h4 className="font-medium text-zinc-200 text-xs">{sub.providerName}</h4>
                  <p className="text-[11px] text-zinc-400">{sub.planName}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {formatRelativeDate(sub.renewalDate!)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-100">
                  {formatCurrency(sub.price, sub.currency)}
                </p>
                <p className="text-[10px] text-zinc-500">{formatDate(sub.renewalDate!)}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Full Chronological Schedule Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Full Chronological Calendar Schedule
        </h2>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06] glass">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-white/[0.06] bg-white/[0.02] uppercase tracking-wider text-[11px] text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Renewal Date</th>
                <th className="px-5 py-3 font-medium">Provider & Service</th>
                <th className="px-5 py-3 font-medium">Billing Period</th>
                <th className="px-5 py-3 font-medium text-right">Scheduled Charge</th>
                <th className="px-5 py-3 font-medium text-right">Countdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-zinc-200">
                    {formatDate(s.renewalDate!)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-zinc-100">{s.providerName}</span>
                    <span className="ml-2 text-zinc-500">{s.planName}</span>
                  </td>
                  <td className="px-5 py-3 capitalize text-zinc-400">
                    {s.billingCycle}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-100">
                    {formatCurrency(s.price, s.currency)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-violet-300 font-mono">
                    {formatRelativeDate(s.renewalDate!)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
