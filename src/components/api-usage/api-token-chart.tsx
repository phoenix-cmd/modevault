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
import { formatCurrency, formatNumber } from "@/lib/utils"

const CHART_ACCENT = "var(--mv-chart-1)"
const GRID_COLOR = "var(--mv-grid)"
const AXIS_COLOR = "var(--mv-text-3)"
const CURSOR_COLOR = "var(--mv-border-strong)"

interface DailyPoint {
  date: string
  tokens: number
  cost: number
  requests: number
}

interface ApiTokenChartProps {
  dailyTrend: DailyPoint[]
  byModel: Array<{
    model: string
    tokens: number
    cost: number
    requests: number
    provider: string
  }>
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: DailyPoint }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded border border-line bg-surface px-3 py-2">
      <p className="mb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
        {new Date(point.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </p>
      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-2">Tokens</span>
          <span className="tabular-nums text-ink">
            {formatNumber(point.tokens)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-2">Cost</span>
          <span className="tabular-nums text-ink">
            {formatCurrency(point.cost, "USD")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-2">Requests</span>
          <span className="tabular-nums text-ink">
            {formatNumber(point.requests)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ApiTokenChart({ dailyTrend, byModel }: ApiTokenChartProps) {
  const topModels = [...byModel].sort((a, b) => b.cost - a.cost).slice(0, 5)
  const maxCost = Math.max(...topModels.map((m) => m.cost), 0.0001)

  return (
    <section className="grid gap-8 border-t border-line pt-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Token consumption</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Daily ingest and generation over recent activity.</p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHART_ACCENT }} />
            Tokens
          </span>
        </div>

        <div className="h-[260px] w-full border-t border-line pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrend} margin={{ top: 4, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS_COLOR, fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                dy={6}
                tickFormatter={(value: string) => {
                  const parts = value.split("-")
                  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : value
                }}
              />
              <YAxis
                tick={{ fill: AXIS_COLOR, fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(value: number) => formatNumber(value)}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: CURSOR_COLOR, strokeDasharray: "4 4" }} />
              <Line type="monotone" dataKey="tokens" name="Tokens" stroke={CHART_ACCENT} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border-t border-line pt-4 lg:border-t-0 lg:pt-0">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Model cost</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Top models by recorded spend.</p>
        </div>

        {topModels.length === 0 ? (
          <p className="border-t border-line py-6 text-[12.5px] leading-relaxed text-ink-3">No model-level spend recorded yet.</p>
        ) : (
          <div className="border-t border-line">
            {topModels.map((model) => (
              <div key={`${model.provider}-${model.model}`} className="border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-mono text-[11px] text-ink">{model.model}</p>
                  <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-ink">{formatCurrency(model.cost, "USD")}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-surface-3">
                    <div className="h-px" style={{ width: `${Math.max((model.cost / maxCost) * 100, 2)}%`, background: CHART_ACCENT }} />
                  </div>
                  <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-3">{formatNumber(model.tokens)} tok</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
