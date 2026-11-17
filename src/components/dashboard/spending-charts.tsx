"use client"

import { motion } from "framer-motion"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { cn, formatCurrency } from "@/lib/utils"
import type { SpendingDataPoint, ProviderSpendingData } from "@/lib/types"

/* ─── Custom Tooltip ─── */

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-elevated rounded-lg px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, "INR")}
        </p>
      ))}
    </div>
  )
}

/* ─── Monthly Spending Trend ─── */

interface MonthlyChartProps {
  data: SpendingDataPoint[]
}

function MonthlySpendingChart({ data }: MonthlyChartProps) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-vault-text">
        Monthly Spending Trend
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradApi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<GlassTooltip />} />
            <Area
              type="monotone"
              dataKey="subscriptions"
              name="Subscriptions"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#gradSubs)"
            />
            <Area
              type="monotone"
              dataKey="api"
              name="API"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#gradApi)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─── Provider-wise Spending ─── */

interface ProviderChartProps {
  data: ProviderSpendingData[]
}

function ProviderSpendingChart({ data }: ProviderChartProps) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount)

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-vault-text">
        Spending by Provider
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="provider"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<GlassTooltip />} />
            <Bar dataKey="amount" name="Spend" radius={[0, 4, 4, 0]} barSize={20}>
              {sorted.map((entry) => (
                <Cell key={entry.provider} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─── API vs Subscription Split ─── */

interface SplitChartProps {
  spending: SpendingDataPoint[]
}

function ApiVsSubscriptionSplit({ spending }: SplitChartProps) {
  const totalSubs = spending.reduce((s, d) => s + d.subscriptions, 0)
  const totalApi = spending.reduce((s, d) => s + d.api, 0)
  const total = totalSubs + totalApi || 1

  const data = [
    { name: "Subscriptions", value: totalSubs, color: "#8b5cf6" },
    { name: "API Usage", value: totalApi, color: "#06b6d4" },
  ]

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-vault-text">
        API vs Subscription Split
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: item.color }}
              />
              <div>
                <p className="text-xs text-zinc-400">{item.name}</p>
                <p className="text-sm font-semibold text-vault-text">
                  {formatCurrency(item.value, "INR")}{" "}
                  <span className="text-xs font-normal text-zinc-500">
                    ({Math.round((item.value / total) * 100)}%)
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Combined Spending Charts Section ─── */

interface SpendingChartsProps {
  monthlySpending: SpendingDataPoint[]
  providerSpending: ProviderSpendingData[]
}

export function SpendingCharts({
  monthlySpending,
  providerSpending,
}: SpendingChartsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-vault-text">
        Spending Analytics
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MonthlySpendingChart data={monthlySpending} />
        <ProviderSpendingChart data={providerSpending} />
      </div>
      <ApiVsSubscriptionSplit spending={monthlySpending} />
    </motion.div>
  )
}

export function SpendingChartsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-40" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <div className="skeleton mb-4 h-4 w-40" />
          <div className="skeleton h-[260px] w-full rounded-lg" />
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="skeleton mb-4 h-4 w-40" />
          <div className="skeleton h-[260px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
