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

const CHART_ACCENT = "#5b61d6"
const GRID_COLOR = "rgba(115, 121, 130, 0.14)"
const AXIS_COLOR = "#9aa0a8"

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
    <div className="glass-panel rounded-lg px-3 py-2">
      <p className="mb-1.5 text-[11px] font-medium text-ink-3">
        {new Date(point.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </p>
      <div className="space-y-1 text-[12px]">
        <div className="flex items-center justify-between gap-5">
          <span className="text-ink-2">Tokens</span>
          <span className="font-medium text-ink tnum">
            {formatNumber(point.tokens)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-ink-2">Cost</span>
          <span className="font-medium text-ink tnum">
            {formatCurrency(point.cost, "USD")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-ink-2">Requests</span>
          <span className="font-medium text-ink tnum">
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
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="panel overflow-hidden lg:col-span-2">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Token consumption</h2>
            <p className="panel-subtitle">
              Daily ingest and generation, last 30 days
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CHART_ACCENT }}
            />
            Tokens
          </span>
        </div>

        <div className="h-[260px] w-full px-3 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyTrend}
              margin={{ top: 4, right: 12, left: -14, bottom: 0 }}
            >
              <CartesianGrid
                stroke={GRID_COLOR}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={6}
                tickFormatter={(value: string) => {
                  const parts = value.split("-")
                  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : value
                }}
              />
              <YAxis
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(value: number) => formatNumber(value)}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: "#d6dae1", strokeDasharray: "4 4" }}
              />
              <Line
                type="monotone"
                dataKey="tokens"
                name="Tokens"
                stroke={CHART_ACCENT}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Model cost</h2>
            <p className="panel-subtitle">Top models by spend</p>
          </div>
        </div>

        {topModels.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-ink-3">
            No model level spend recorded yet.
          </p>
        ) : (
          <div className="row-divide">
            {topModels.map((model) => (
              <div key={`${model.provider}-${model.model}`} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-mono text-[11.5px] text-ink">
                    {model.model}
                  </p>
                  <span className="shrink-0 text-[12px] font-medium text-ink tnum">
                    {formatCurrency(model.cost, "USD")}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((model.cost / maxCost) * 100, 3)}%`,
                        background: CHART_ACCENT,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[10.5px] text-ink-3 tnum">
                    {formatNumber(model.tokens)} tok
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
