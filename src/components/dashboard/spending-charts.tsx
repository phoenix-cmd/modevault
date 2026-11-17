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

/* ─── Chart palette (hex for cross-theme reliability) ─── */

const CHART_ACCENT = "#5b61d6"
const CHART_TEAL = "#2f8f83"
const GRID_COLOR = "rgba(115, 121, 130, 0.14)"
const AXIS_COLOR = "#9aa0a8"
const CURSOR_COLOR = "#d6dae1"

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
    <div className="glass-panel rounded-lg px-3 py-2">
      {label && (
        <p className="mb-1 text-[11px] font-medium text-ink-3">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={entry.dataKey ?? entry.name}
            className="flex items-center justify-between gap-5 text-[12px]"
          >
            <span className="flex items-center gap-1.5 text-ink-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-ink tnum">
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
    <section className="panel flex h-full flex-col overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Spending trend</h2>
          <p className="panel-subtitle">Subscription vs API cost by month</p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CHART_ACCENT }}
            />
            Subscriptions
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CHART_TEAL }}
            />
            API
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full px-3 py-4 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 12, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              stroke={GRID_COLOR}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={compactCurrency}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: CURSOR_COLOR, strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="subscriptions"
              name="Subscriptions"
              stroke={CHART_ACCENT}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="api"
              name="API"
              stroke={CHART_TEAL}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

/* ─── Provider-wise spending ─── */

function ProviderSpendingChart({ data }: { data: ProviderSpendingData[] }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 6)
  const max = Math.max(...sorted.map((d) => d.amount), 1)

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <h2 className="panel-title">By provider</h2>
      </div>
      <div className="row-divide">
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-ink-3">
            No provider spend recorded yet.
          </p>
        ) : (
          sorted.map((entry) => (
            <div
              key={entry.provider}
              className="flex items-center gap-2.5 px-4 py-2.5"
            >
              <ProviderIcon slug={entry.providerSlug} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-ink-2">
                    {entry.provider}
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-ink tnum">
                    {formatCurrency(entry.amount, "INR")}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((entry.amount / max) * 100, 3)}%`,
                      background: CHART_ACCENT,
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <h2 className="panel-title">Composition</h2>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full"
            style={{ width: `${subsPct}%`, background: CHART_ACCENT }}
          />
          <div
            className="h-full"
            style={{ width: `${apiPct}%`, background: CHART_TEAL }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          {rows.map((row) => (
            <div key={row.name} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: row.color }}
                />
                {row.name}
              </div>
              <p className="mt-0.5 text-[12px] font-medium text-ink tnum">
                {formatCurrency(row.value, "INR")}
                <span className="ml-1 text-[10.5px] font-normal text-ink-3">
                  {row.percent}%
                </span>
              </p>
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
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <MonthlySpendingChart data={monthlySpending} />
      </div>
      <div className="flex flex-col gap-3">
        <ProviderSpendingChart data={providerSpending} />
        <ApiVsSubscriptionSplit spending={monthlySpending} />
      </div>
    </div>
  )
}

export function SpendingChartsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="panel overflow-hidden lg:col-span-2">
        <div className="panel-header">
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-2.5 w-44" />
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="skeleton h-[236px] w-full rounded-md" />
        </div>
      </section>
      <div className="flex flex-col gap-3">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div className="skeleton h-3.5 w-20" />
          </div>
          <div className="space-y-3 px-4 py-3.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="skeleton h-2.5 w-full" />
                <div className="skeleton h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div className="skeleton h-3.5 w-24" />
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <div className="skeleton h-1.5 w-full rounded-full" />
            <div className="skeleton h-6 w-full" />
          </div>
        </section>
      </div>
    </div>
  )
}
