"use client"

import { useEffect, useState, type ComponentProps } from "react"
import { Activity, Layers, TrendingUp, Wallet } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import {
  SpendingCharts,
  SpendingChartsSkeleton,
} from "@/components/dashboard/spending-charts"
import { SmartIntelligenceCards } from "@/components/analytics/smart-intelligence-cards"
import { ModelComparisonTable } from "@/components/analytics/model-comparison-table"
import { PROVIDERS } from "@/lib/providers"
import { cn, formatCurrency } from "@/lib/utils"
import type { ProviderSpendingData, SpendingDataPoint } from "@/lib/types"

interface AnalyticsData {
  spendingTrends: SpendingDataPoint[]
  providerBreakdown: Array<{
    name: string
    amount: number
    color: string
    count: number
  }>
  overview: {
    monthlySubscriptions: number
    annualSubscriptions: number
    apiSpent: number
    apiBalance: number
  }
  insights: ComponentProps<typeof SmartIntelligenceCards>["insights"]
  modelComparison: ComponentProps<typeof ModelComparisonTable>["models"]
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [currency, setCurrency] = useState("INR")

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true)
        const res = await fetch("/api/analytics")
        const json = await res.json()
        if (json.data) {
          setData(json.data as AnalyticsData)
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
  const inr = (amount: number) =>
    currency === "INR"
      ? formatCurrency(amount, "INR")
      : formatCurrency(amount / rate, "USD")
  const usd = (amount: number) =>
    currency === "INR"
      ? formatCurrency(amount * rate, "INR")
      : formatCurrency(amount, "USD")

  const providerSpending: ProviderSpendingData[] = (
    data?.providerBreakdown ?? []
  ).map((entry) => {
    const known = Object.values(PROVIDERS).find(
      (provider) => provider.name === entry.name
    )
    return {
      provider: entry.name,
      providerSlug: known?.slug ?? "openai",
      amount: entry.amount,
      color: entry.color,
    }
  })

  const metrics = data?.overview
    ? [
        {
          label: "Monthly subscriptions",
          value: inr(data.overview.monthlySubscriptions),
          meta: "Fixed recurring spend",
          icon: Layers,
        },
        {
          label: "Annual run-rate",
          value: inr(data.overview.annualSubscriptions),
          meta: "Projected 12-month baseline",
          icon: TrendingUp,
        },
        {
          label: "API spend",
          value: usd(data.overview.apiSpent),
          meta: "Metered developer consumption",
          icon: Activity,
        },
        {
          label: "Prepaid balance",
          value: usd(data.overview.apiBalance),
          meta: "Available across accounts",
          icon: Wallet,
        },
      ]
    : []

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Analytics"
        description="Spend trends, portfolio composition and optimization signals across your AI stack."
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-ink-3">Currency</span>
            <div className="segmented" role="group" aria-label="Display currency">
              <button
                onClick={() => setCurrency("INR")}
                className={cn(
                  "segmented-item",
                  currency === "INR" && "segmented-item-active"
                )}
                aria-pressed={currency === "INR"}
              >
                INR ₹
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={cn(
                  "segmented-item",
                  currency === "USD" && "segmented-item-active"
                )}
                aria-pressed={currency === "USD"}
              >
                USD $
              </button>
            </div>
          </div>
        }
      />

      {loading || !data?.overview ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="panel px-4 py-3.5">
              <div className="skeleton h-2.5 w-24" />
              <div className="skeleton mt-3 h-6 w-28" />
              <div className="skeleton mt-2 h-2.5 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, meta, icon: Icon }) => (
            <div key={label} className="panel px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="metric-label">{label}</p>
                <Icon className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.8} />
              </div>
              <p className="metric-value">{value}</p>
              <p className="metric-meta">{meta}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <SpendingChartsSkeleton />
      ) : data ? (
        <SpendingCharts
          monthlySpending={data.spendingTrends}
          providerSpending={providerSpending}
        />
      ) : null}

      {!loading && data?.insights && (
        <SmartIntelligenceCards insights={data.insights} />
      )}

      {!loading && data?.modelComparison && (
        <ModelComparisonTable models={data.modelComparison} />
      )}
    </div>
  )
}
