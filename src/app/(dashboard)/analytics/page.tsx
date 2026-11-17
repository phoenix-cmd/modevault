"use client"

import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, Layers, DollarSign, Wallet } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { SpendingCharts } from "@/components/dashboard/spending-charts"
import { SmartIntelligenceCards } from "@/components/analytics/smart-intelligence-cards"
import { ModelComparisonTable } from "@/components/analytics/model-comparison-table"
import { formatCurrency } from "@/lib/utils"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [currency, setCurrency] = useState("INR")

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics")
        const json = await res.json()
        if (json.data) {
          setData(json.data)
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  const rate = 84.5 // USD to INR

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Analytics & Spend Intelligence"
        description="Cross-portfolio financial forensics, usage efficiency vectors, and predictive cost modeling."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Currency:</span>
            <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5 text-xs">
              <button
                onClick={() => setCurrency("INR")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  currency === "INR"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                INR (₹)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  currency === "USD"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        }
      />

      {/* Financial Overview Metrics */}
      {data?.overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Monthly Committed Subscriptions</p>
            <p className="text-xl font-bold text-zinc-100">
              {currency === "INR"
                ? formatCurrency(data.overview.monthlySubscriptions, "INR")
                : formatCurrency(data.overview.monthlySubscriptions / rate, "USD")}
            </p>
            <p className="text-[11px] text-zinc-500">Fixed recurring subscriptions</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Annualized Subscription Run-rate</p>
            <p className="text-xl font-bold text-zinc-100">
              {currency === "INR"
                ? formatCurrency(data.overview.annualSubscriptions, "INR")
                : formatCurrency(data.overview.annualSubscriptions / rate, "USD")}
            </p>
            <p className="text-[11px] text-zinc-500">Projected 12-month baseline</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">API Incurred Spend (Total)</p>
            <p className="text-xl font-bold text-emerald-400">
              {currency === "INR"
                ? formatCurrency(data.overview.apiSpent * rate, "INR")
                : formatCurrency(data.overview.apiSpent, "USD")}
            </p>
            <p className="text-[11px] text-zinc-500">Metered developer consumption</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Remaining API Prepaid Balance</p>
            <p className="text-xl font-bold text-cyan-400">
              {currency === "INR"
                ? formatCurrency(data.overview.apiBalance * rate, "INR")
                : formatCurrency(data.overview.apiBalance, "USD")}
            </p>
            <p className="text-[11px] text-zinc-500">Available across developer accounts</p>
          </GlassCard>
        </div>
      )}

      {/* Spending Charts (Trends & Provider Split) */}
      {data && (
        <SpendingCharts
          monthlySpending={data.spendingTrends}
          providerSpending={data.providerBreakdown}
        />
      )}

      {/* Subscription Intelligence Engine */}
      {data?.insights && <SmartIntelligenceCards insights={data.insights} />}

      {/* Frontier Model Economics */}
      {data?.modelComparison && (
        <ModelComparisonTable models={data.modelComparison} />
      )}
    </div>
  )
}
