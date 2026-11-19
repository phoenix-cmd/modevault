"use client"

import { useEffect, useState, type ComponentProps } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
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
        },
        {
          label: "Annual run-rate",
          value: inr(data.overview.annualSubscriptions),
          meta: "Projected 12-month baseline",
        },
        {
          label: "API spend",
          value: usd(data.overview.apiSpent),
          meta: "Metered developer consumption",
        },
        {
          label: "Prepaid balance",
          value: usd(data.overview.apiBalance),
          meta: "Available across accounts",
        },
      ]
    : []

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Analysis"
        title="Analytics"
        description="Spend trends, portfolio composition and optimization signals across your AI stack."
        action={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
              Currency
            </span>
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
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand items={metrics} columns={4} />
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
