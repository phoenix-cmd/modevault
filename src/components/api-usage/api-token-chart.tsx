"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import { GlassCard } from "@/components/ui/glass-card"
import { formatNumber, formatCurrency } from "@/lib/utils"

interface ApiTokenChartProps {
  dailyTrend: Array<{ date: string; tokens: number; cost: number; requests: number }>
  byModel: Array<{ model: string; tokens: number; cost: number; requests: number; provider: string }>
}

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-elevated rounded-lg px-3 py-2 shadow-xl border border-white/[0.08] text-xs">
      <p className="font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || "#8b5cf6" }}>
          {p.name}: {typeof p.value === "number" ? formatNumber(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export function ApiTokenChart({ dailyTrend, byModel }: ApiTokenChartProps) {
  const modelColors = [
    "#8b5cf6",
    "#3b82f6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#6366f1",
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 30-Day Token Consumption Trend */}
      <GlassCard className="lg:col-span-2 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Daily Token Ingestion & Generation (30-day)
            </h3>
            <p className="text-xs text-zinc-500">
              Aggregated across all connected models and developer APIs
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyTrend}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  const parts = val.split("-")
                  return `${parts[1]}/${parts[2]}`
                }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => formatNumber(val)}
              />
              <Tooltip content={<GlassTooltip />} />
              <Area
                type="monotone"
                dataKey="tokens"
                name="Total Tokens"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#tokenGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Model Breakdown Cost */}
      <GlassCard className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Model Cost Distribution
          </h3>
          <p className="text-xs text-zinc-500">Top models by API dollar spend</p>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byModel.slice(0, 5)}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis
                type="number"
                stroke="#52525b"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="model"
                stroke="#a1a1aa"
                tick={{ fontSize: 10 }}
                width={90}
                tickFormatter={(val) => {
                  const parts = val.split("/")
                  const name = parts[parts.length - 1]
                  return name.length > 13 ? `${name.substring(0, 11)}..` : name
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="glass-elevated rounded-lg px-3 py-2 text-xs border border-white/[0.08]">
                      <p className="font-semibold text-zinc-200">{d.model}</p>
                      <p className="text-emerald-400">Cost: ${d.cost}</p>
                      <p className="text-zinc-400">Tokens: {formatNumber(d.tokens)}</p>
                      <p className="text-zinc-500">Provider: {d.provider}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {byModel.slice(0, 5).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={modelColors[index % modelColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  )
}
