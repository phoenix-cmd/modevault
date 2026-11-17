"use client"

import { motion } from "framer-motion"
import {
  Layers,
  TrendingUp,
  Calendar,
  Wallet,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import type { DashboardSummary } from "@/lib/types"

interface SummaryCardProps {
  label: string
  value: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
  index: number
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
  index,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={cn(
        "glass-card rounded-xl p-5 group cursor-default",
        "hover:glow-violet"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-vault-text">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}22, ${gradientTo}44)`,
          }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: gradientFrom }}
          />
        </div>
      </div>
    </motion.div>
  )
}

interface SummaryCardsProps {
  data: DashboardSummary
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const cards: Omit<SummaryCardProps, "index">[] = [
    {
      label: "Active Subscriptions",
      value: formatNumber(data.activeSubscriptions),
      icon: Layers,
      gradientFrom: "#8b5cf6",
      gradientTo: "#7c3aed",
    },
    {
      label: "Monthly Spend",
      value: formatCurrency(data.totalMonthlySpend, data.currency),
      icon: TrendingUp,
      gradientFrom: "#3b82f6",
      gradientTo: "#2563eb",
    },
    {
      label: "Annual Spend",
      value: formatCurrency(data.totalAnnualSpend, data.currency),
      icon: Calendar,
      gradientFrom: "#06b6d4",
      gradientTo: "#0891b2",
    },
    {
      label: "API Credits Balance",
      value: formatCurrency(data.totalApiBalance, "USD"),
      icon: Wallet,
      gradientFrom: "#10b981",
      gradientTo: "#059669",
    },
    {
      label: "Upcoming Renewals",
      value: formatNumber(data.upcomingRenewals),
      icon: Clock,
      gradientFrom: "#f59e0b",
      gradientTo: "#d97706",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card, index) => (
        <SummaryCard key={card.label} {...card} index={index} />
      ))}
    </div>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-20" />
            </div>
            <div className="skeleton h-10 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
