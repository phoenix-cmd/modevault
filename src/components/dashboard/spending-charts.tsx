"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { formatCurrency } from "@/lib/utils"
import type { SpendingDataPoint, ProviderSpendingData } from "@/lib/types"

/* ─── Chart palette (CSS variables so both themes stay in sync) ─── */

const CHART_ACCENT = "var(--mv-chart-1)"
const CHART_TEAL = "var(--mv-chart-2)"
const GRID_COLOR = "var(--mv-grid)"
const AXIS_COLOR = "var(--mv-text-3)"
const CURSOR_COLOR = "var(--mv-border-strong)"

/* ─── Shared section frame ─── */

function SectionHead({
  title,
  meta,
  aside,
}: {
  title: string
  meta: string
  aside?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 pb-4">
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">{title}</h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{meta}</p>
      </div>
      {aside}
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

/* ─── Tooltip ─── */

interface TooltipEntry {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded border border-line bg-surface px-3 py-2">
      {label && (
        <p className="mb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={entry.dataKey ?? entry.name}
            className="flex items-center justify-between gap-6 font-mono text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-ink-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="tabular-nums text-ink">
              {formatCurrency(Number(entry.value ?? 0), "INR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function compactCurrency(value: number) {
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`
  return `₹${Math.round(value)}`
}

/* ─── Monthly spending trend ─── */

function MonthlySpendingChart({ data }: { data: SpendingDataPoint[] }) {
  return (
    <section className="border-t border-line pt-5">
      <SectionHead
        title="Spending trend"
        meta="Subscriptions vs API · trailing six months"
        aside={
          <div className="flex items-center gap-4 pt-1">
            <LegendItem color={CHART_ACCENT} label="Subscriptions" />
            <LegendItem color={CHART_TEAL} label="API" />
          </div>
        }
      />

      {data.length === 0 ? (
        <p className="border-t border-line py-8 text-[13px] leading-relaxed text-ink-3">
          No spending history recorded yet.
        </p>
      ) : (
        <div className="h-[280px] w-full border-t border-line pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 10.5 }} axisLine={false} tickLine={false} dy={8} />
              <YAxis
                tick={{ fill: AXIS_COLOR, fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={compactCurrency}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CURSOR_COLOR, strokeDasharray: "4 4" }} />
              <Line type="monotone" dataKey="subscriptions" name="Subscriptions" stroke={CHART_ACCENT} strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="api" name="API" stroke={CHART_TEAL} strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

/* ─── Provider-wise spending ─── */

function ProviderSpendingChart({ data }: { data: ProviderSpendingData[] }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 6)
  const max = Math.max(...sorted.map((d) => d.amount), 1)
  const total = sorted.reduce((sum, d) => sum + d.amount, 0)

  return (
    <section className="border-t border-line pt-5">
      <SectionHead title="Provider distribution" meta={`${sorted.length} providers · ${formatCurrency(total, "INR")} recorded`} />

      {sorted.length === 0 ? (
        <p className="border-t border-line py-8 text-[13px] leading-relaxed text-ink-3">No provider spend recorded yet.</p>
      ) : (
        <ul className="border-t border-line">
          {sorted.map((entry, idx) => (
            <li key={entry.provider} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 border-b border-line py-2.5 last:border-b-0">
              <span className="pt-1 font-mono text-[10px] tabular-nums text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <ProviderIcon slug={entry.providerSlug} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{entry.provider}</span>
                  <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-ink">{formatCurrency(entry.amount, "INR")}</span>
                </div>
                <div className="mt-2 h-px w-full bg-surface-3">
                  <div className="h-px bg-accent" style={{ width: `${Math.max((entry.amount / max) * 100, 2)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ─── API vs subscription split ─── */

function ApiVsSubscriptionSplit({ spending }: { spending: SpendingDataPoint[] }) {
  const totalSubs = spending.reduce((sum, d) => sum + d.subscriptions, 0)
  const totalApi = spending.reduce((sum, d) => sum + d.api, 0)
  const total = totalSubs + totalApi || 1
  const subsPct = Math.round((totalSubs / total) * 100)
  const apiPct = 100 - subsPct

  const rows = [
    { name: "Subscriptions", value: totalSubs, percent: subsPct, color: CHART_ACCENT },
    { name: "API usage", value: totalApi, percent: apiPct, color: CHART_TEAL },
  ]

  return (
    <section className="border-t border-line pt-5">
      <SectionHead title="Spend composition" meta="Six-month allocation by source" />

      <div className="border-t border-line pt-4">
        <div className="flex h-[3px] w-full overflow-hidden bg-surface-3">
          <div className="h-full" style={{ width: `${subsPct}%`, background: CHART_ACCENT }} />
          <div className="h-full" style={{ width: `${apiPct}%`, background: CHART_TEAL }} />
        </div>
        <div className="mt-4 space-y-0 border-t border-line">
          {rows.map((row) => (
            <div key={row.name} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
              <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                {row.name}
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-ink">
                {formatCurrency(row.value, "INR")}
                <span className="ml-2 text-ink-3">{row.percent}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Combined section ─── */

interface SpendingChartsProps {
  monthlySpending: SpendingDataPoint[]
  providerSpending: ProviderSpendingData[]
}

export function SpendingCharts({
  monthlySpending,
  providerSpending,
}: SpendingChartsProps) {
  return (
    <div className="space-y-7">
      <MonthlySpendingChart data={monthlySpending} />
      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        <ProviderSpendingChart data={providerSpending} />
        <ApiVsSubscriptionSplit spending={monthlySpending} />
      </div>
    </div>
  )
}

export function SpendingChartsSkeleton() {
  return (
    <div className="space-y-7">
      <section className="border-t border-line pt-5">
        <div className="flex items-start justify-between pb-5">
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-2.5 w-48" />
          </div>
          <div className="skeleton h-2.5 w-32" />
        </div>
        <div className="skeleton h-[280px] w-full" />
      </section>
      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="border-t border-line pt-5">
            <div className="space-y-2 pb-5">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-2.5 w-32" />
            </div>
            <div className="space-y-3 border-t border-line pt-4">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="space-y-2">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-px w-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
