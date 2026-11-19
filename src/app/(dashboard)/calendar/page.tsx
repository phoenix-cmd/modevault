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
          const subs: SubscriptionData[] = json.data
            .filter((s: RawSubscription) => s.status === "active" && s.renewalDate)
            .map((s: RawSubscription) => ({
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
              (a: SubscriptionData, b: SubscriptionData) =>
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

  const next7Days = now
    ? subscriptions.filter((s) => {
        const diff = new Date(s.renewalDate!).getTime() - currentTime
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
      })
    : []

  const next30Days = now
    ? subscriptions.filter((s) => {
        const diff = new Date(s.renewalDate!).getTime() - currentTime
        return (
          diff > 7 * 24 * 60 * 60 * 1000 && diff <= 30 * 24 * 60 * 60 * 1000
        )
      })
    : []

  const totalUpcoming30Days = [...next7Days, ...next30Days].reduce(
    (sum, s) => sum + s.price,
    0
  )

  const metrics = [
    {
      label: "Next 7 days",
      value: String(next7Days.length),
      meta: next7Days.length > 0 ? "Imminent renewals" : "Nothing imminent",
      accent: next7Days.length > 0,
    },
    {
      label: "30-day committed",
      value: formatCurrency(totalUpcoming30Days, "INR"),
      meta: "Scheduled charges",
    },
    {
      label: "Active schedules",
      value: String(subscriptions.length),
      meta: "Subscriptions with a renewal date",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-7 pb-16">
        <PageHeader
          eyebrow="Intelligence · Schedule"
          title="Renewals"
          description="Forward-looking billing schedule and renewal forecast."
        />
        <StatBandSkeleton columns={3} />
        <div className="grid gap-8 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <section key={index} className="border-t border-line pt-5">
              <div className="space-y-2 pb-4">
                <div className="skeleton h-3.5 w-32" />
                <div className="skeleton h-2.5 w-44" />
              </div>
              <div className="space-y-3 border-t border-line pt-4">
                {Array.from({ length: 3 }).map((__, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-7 w-7 rounded-[6px]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-28" />
                      <div className="skeleton h-2.5 w-20" />
                    </div>
                    <div className="skeleton h-3 w-14" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Schedule"
        title="Renewals"
        description="A forward-looking schedule of upcoming auto-debits and cancellation warning horizons."
      />

      <StatBand items={metrics} columns={3} />

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section className="border-t border-line pt-5">
          <div className="flex items-start justify-between gap-4 pb-4">
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                Next 7 days
              </h2>
              <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                Imminent charges to review
              </p>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-warning">
              {String(next7Days.length).padStart(2, "0")}
            </span>
          </div>

          <div className="border-t border-line">
            {next7Days.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-ink-3">
                No subscriptions renew in the next 7 days.
              </p>
            ) : (
              next7Days.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProviderIcon slug={sub.providerSlug} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {sub.providerName}
                      </p>
                      <p className="truncate text-[11px] text-ink-3">
                        {sub.planName} ·{" "}
                        <span className="text-warning">
                          {formatRelativeDate(sub.renewalDate!)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12px] font-medium text-ink tabular-nums">
                      {formatCurrency(sub.price, sub.currency)}
                    </p>
                    <p className="font-mono text-[9.5px] uppercase text-ink-3">
                      {sub.billingCycle}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <div className="flex items-start justify-between gap-4 pb-4">
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                Days 8–30
              </h2>
              <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                Upcoming later this month
              </p>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">
              {String(next30Days.length).padStart(2, "0")}
            </span>
          </div>

          <div className="border-t border-line">
            {next30Days.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-ink-3">
                Nothing scheduled for the rest of the 30-day window.
              </p>
            ) : (
              next30Days.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProviderIcon slug={sub.providerSlug} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {sub.providerName}
                      </p>
                      <p className="truncate text-[11px] text-ink-3">
                        {sub.planName} · {formatRelativeDate(sub.renewalDate!)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12px] font-medium text-ink tabular-nums">
                      {formatCurrency(sub.price, sub.currency)}
                    </p>
                    <p className="font-mono text-[9.5px] text-ink-3 tabular-nums">
                      {formatDate(sub.renewalDate!)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Full schedule
          </h2>
          <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            All active renewals in date order
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden border-t border-line md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Renewal date</th>
                <th>Provider &amp; plan</th>
                <th>Billing period</th>
                <th className="text-right">Scheduled charge</th>
                <th className="text-right">Countdown</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="whitespace-nowrap font-mono text-[11px] font-medium text-ink tabular-nums">
                    {formatDate(sub.renewalDate!)}
                  </td>
                  <td>
                    <p className="text-[13px] font-medium text-ink">
                      {sub.providerName}
                    </p>
                    <p className="text-[11px] text-ink-3">{sub.planName}</p>
                  </td>
                  <td className="capitalize text-ink-2">{sub.billingCycle}</td>
                  <td className="text-right font-mono text-[11.5px] font-medium text-ink tabular-nums">
                    {formatCurrency(sub.price, sub.currency)}
                  </td>
                  <td className="text-right text-ink-2">
                    {formatRelativeDate(sub.renewalDate!)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="border-t border-line md:hidden">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="border-b border-line py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProviderIcon slug={sub.providerSlug} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {sub.providerName}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      {formatDate(sub.renewalDate!)} · {sub.planName}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[12px] font-medium text-ink tabular-nums">
                    {formatCurrency(sub.price, sub.currency)}
                  </p>
                  <p className="font-mono text-[9.5px] text-ink-3 tabular-nums">
                    {formatRelativeDate(sub.renewalDate!)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
