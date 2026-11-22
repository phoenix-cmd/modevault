"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"
import type { RawSubscription, SubscriptionData } from "@/lib/types"

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
          const subs: SubscriptionData[] = (json.data as RawSubscription[])
            .filter((s) => s.status === "active" && s.renewalDate)
            .map((s) => {
              const raw = s as RawSubscription & Record<string, any>
              const provider = raw.provider as (RawSubscription["provider"] & { color?: string; features?: string[] }) | null
              return {
                id: raw.id,
                userId: raw.userId,
                providerId: raw.providerId,
                providerSlug: raw.providerSlug ?? provider?.slug ?? "",
                providerName: raw.providerName ?? provider?.name ?? "Provider",
                planName: raw.planName ?? raw.plan?.name ?? raw.customPlanName ?? "Plan",
                type: raw.type,
                status: raw.status,
                billingCycle: raw.billingCycle,
                price: raw.price,
                currency: raw.currency,
                startDate: raw.startDate,
                renewalDate: raw.renewalDate || null,
                expiryDate: raw.expiryDate || null,
                quotaMessages: raw.quotaMessages ?? null,
                quotaTokens: raw.quotaTokens ?? null,
                quotaRequests: raw.quotaRequests ?? null,
                quotaCredits: raw.quotaCredits ?? null,
                usedMessages: raw.usedMessages ?? 0,
                usedTokens: raw.usedTokens ?? 0,
                usedRequests: raw.usedRequests ?? 0,
                usedCredits: raw.usedCredits ?? 0,
                quotaResetDate: raw.quotaResetDate ?? null,
                quotaResetPeriod: raw.quotaResetPeriod ?? null,
                dataSource: raw.dataSource,
                notes: raw.notes ?? null,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
              } as unknown as SubscriptionData
            })
            .sort(
              (a, b) =>
                new Date(a.renewalDate || "").getTime() -
                new Date(b.renewalDate || "").getTime()
            )
          setSubscriptions(subs)
        }
      } catch (err) {
        console.error("Failed to load calendar", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const thisMonth = subscriptions.filter((s) => {
    if (!s.renewalDate || !now) return false
    const date = new Date(s.renewalDate)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const nextMonth = subscriptions.filter((s) => {
    if (!s.renewalDate || !now) return false
    const date = new Date(s.renewalDate)
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return date.getMonth() === next.getMonth() && date.getFullYear() === next.getFullYear()
  })

  const later = subscriptions.filter((s) => {
    if (!s.renewalDate || !now) return false
    const date = new Date(s.renewalDate)
    const next = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    return date >= next
  })

  const totalThisMonth = thisMonth.reduce((sum, s) => sum + s.price, 0)

  const renderSection = (
    title: string,
    items: SubscriptionData[],
    empty: string,
    accent?: boolean
  ) => (
    <section className="border-t border-line pt-5">
      <div className="flex items-end justify-between gap-3 pb-4">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{title}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            {items.length} renewal{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {accent && items.length > 0 && (
          <span className="font-mono text-[11px] font-medium tabular-nums text-accent">
            {formatCurrency(totalThisMonth, "USD")} due
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border-y border-line py-8">
          <p className="text-[12.5px] leading-relaxed text-ink-3">{empty}</p>
        </div>
      ) : (
        <div className="border-t border-line">
          {items.map((sub) => {
            const due = sub.renewalDate ? new Date(sub.renewalDate) : null
            const daysUntil =
              due && now
                ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null
            const urgent = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7

            return (
              <div key={sub.id} className="border-b border-line py-3.5 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <ProviderIcon slug={sub.providerSlug} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{sub.providerName}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">{sub.planName}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12px] font-medium tabular-nums text-ink">
                      {formatCurrency(sub.price, sub.currency)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {sub.billingCycle}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:pl-10">
                  <span className="font-mono tabular-nums text-ink-2">
                    {sub.renewalDate ? formatDate(sub.renewalDate) : "—"}
                  </span>
                  {sub.renewalDate && (
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.06em] ${
                        urgent ? "text-warning" : "text-ink-3"
                      }`}
                    >
                      {formatRelativeDate(sub.renewalDate)}
                    </span>
                  )}
                  {urgent && <span className="badge bg-warning-soft text-warning">Due soon</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const metrics = [
    {
      label: "Due this month",
      value: formatCurrency(totalThisMonth, "USD"),
      meta: `${thisMonth.length} renewal${thisMonth.length === 1 ? "" : "s"}`,
      accent: thisMonth.length > 0,
    },
    {
      label: "Next month",
      value: String(nextMonth.length),
      meta: "Scheduled renewals",
    },
    {
      label: "Tracked",
      value: String(subscriptions.length),
      meta: "Active with renewal dates",
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Finance · Schedule"
        title="Calendar"
        description="Upcoming renewals, billing windows, and payment obligations across active subscriptions."
      />

      {loading || !now ? <StatBandSkeleton columns={3} /> : <StatBand items={metrics} columns={3} />}

      {loading || !now ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <section key={i} className="border-t border-line pt-5">
              <div className="mb-4 space-y-2">
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-2.5 w-24" />
              </div>
              <div className="border-t border-line">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                    <div className="skeleton h-7 w-7 rounded-[6px]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3.5 w-28" />
                      <div className="skeleton h-2.5 w-20" />
                    </div>
                    <div className="skeleton h-3.5 w-14" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {renderSection(
            now.toLocaleString("default", { month: "long", year: "numeric" }),
            thisMonth,
            "No renewals scheduled for this month.",
            true
          )}
          {renderSection("Next month", nextMonth, "No renewals scheduled for next month.")}
          {later.length > 0 && renderSection("Later", later, "")}
          {subscriptions.length === 0 && (
            <section className="border-t border-line pt-5">
              <div className="border-y border-line py-12">
                <p className="text-[13px] font-medium text-ink">No upcoming renewals</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  Active subscriptions with renewal dates will appear here.
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
