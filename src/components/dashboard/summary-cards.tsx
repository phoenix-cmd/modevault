"use client"

import { formatCurrency } from "@/lib/utils"
import type { DashboardSummary } from "@/lib/types"

interface StatProps {
  label: string
  value: string
  meta: string
  emphasis?: boolean
}

function Stat({ label, value, meta, emphasis }: StatProps) {
  return (
    <div className="min-w-0">
      <p className="metric-label">{label}</p>
      <p
        className={
          emphasis
            ? "mt-2.5 font-mono text-[22px] font-medium tracking-[-0.04em] text-accent tabular-nums"
            : "mt-2.5 font-mono text-[22px] font-medium tracking-[-0.04em] text-ink tabular-nums"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-3">{meta}</p>
    </div>
  )
}

export function SummaryCards({ data }: { data: DashboardSummary }) {
  return (
    <section className="grid gap-8 border-y border-line py-7 lg:grid-cols-12 lg:gap-0">
      <div className="lg:col-span-4 lg:border-r lg:border-line lg:pr-8">
        <p className="metric-label">Monthly run-rate</p>
        <p className="mt-3 font-mono text-[40px] font-medium leading-none tracking-[-0.055em] text-ink tabular-nums sm:text-[46px]">
          {formatCurrency(data.totalMonthlySpend, data.currency)}
        </p>
        <p className="mt-3 text-[11.5px] text-ink-3">
          Across {data.activeSubscriptions} active subscription
          {data.activeSubscriptions === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 lg:col-span-8 lg:pl-8">
        <Stat
          label="Annual projected"
          value={formatCurrency(data.totalAnnualSpend, data.currency)}
          meta="12-month baseline"
        />
        <Stat
          label="API balance"
          value={formatCurrency(data.totalApiBalance, "USD")}
          meta="Prepaid credits"
        />
        <Stat
          label="Active plans"
          value={String(data.activeSubscriptions)}
          meta="Currently renewing"
        />
        <Stat
          label="Renewals"
          value={String(data.upcomingRenewals)}
          meta="Next 30 days"
          emphasis={data.upcomingRenewals > 0}
        />
      </div>
    </section>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <section className="grid gap-8 border-y border-line py-7 lg:grid-cols-12 lg:gap-0">
      <div className="lg:col-span-4 lg:border-r lg:border-line lg:pr-8">
        <div className="skeleton h-2.5 w-28" />
        <div className="skeleton mt-3 h-10 w-48" />
        <div className="skeleton mt-3 h-2.5 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 lg:col-span-8 lg:pl-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-2.5 h-6 w-24" />
            <div className="skeleton mt-1.5 h-2.5 w-24" />
          </div>
        ))}
      </div>
    </section>
  )
}
