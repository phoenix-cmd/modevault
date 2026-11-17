"use client"

import {
  CalendarDays,
  Clock3,
  Layers,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { DashboardSummary } from "@/lib/types"

interface MetricProps {
  label: string
  value: string
  meta: string
  icon: LucideIcon
  accent?: boolean
}

function Metric({ label, value, meta, icon: Icon, accent }: MetricProps) {
  return (
    <div className="panel px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="metric-label">{label}</p>
        <Icon
          className={accent ? "h-3.5 w-3.5 text-accent" : "h-3.5 w-3.5 text-ink-3"}
          strokeWidth={1.8}
        />
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-meta">{meta}</p>
    </div>
  )
}

export function SummaryCards({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Metric
        label="Active subscriptions"
        value={String(data.activeSubscriptions)}
        meta="Currently renewing"
        icon={Layers}
      />
      <Metric
        label="Monthly recurring"
        value={formatCurrency(data.totalMonthlySpend, data.currency)}
        meta="Subscription run-rate"
        icon={TrendingUp}
      />
      <Metric
        label="Annual projected"
        value={formatCurrency(data.totalAnnualSpend, data.currency)}
        meta="12-month baseline"
        icon={CalendarDays}
      />
      <Metric
        label="API credit balance"
        value={formatCurrency(data.totalApiBalance, "USD")}
        meta="Prepaid developer credits"
        icon={Wallet}
      />
      <Metric
        label="Upcoming renewals"
        value={String(data.upcomingRenewals)}
        meta="Next 30 days"
        icon={Clock3}
        accent={data.upcomingRenewals > 0}
      />
    </div>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="panel px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton h-3.5 w-3.5 rounded" />
          </div>
          <div className="skeleton mt-3 h-6 w-24" />
          <div className="skeleton mt-2 h-2.5 w-28" />
        </div>
      ))}
    </div>
  )
}
