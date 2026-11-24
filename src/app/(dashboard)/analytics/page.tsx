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
  baseCurrency?: "INR" | "USD"
  spendingTrends: SpendingDataPoint[]
  providerBreakdown: Array<{
    name: string
    amount: number
    color: string
    count: number
  }>
  exchangeRateUsdToInr?: number
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
          const d = json.data as AnalyticsData
          setData(d)
          if (d.baseCurrency === "USD" || d.baseCurrency === "INR") {
            setCurrency(d.baseCurrency)
          }
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  const rate = data?.exchangeRateUsdToInr || 84.5 // From ExchangeRate table
  const inr = (amount: number) =>
    currency === "INR"
      ? formatCurrency(amount, "INR")
      : formatCurrency(amount / rate, "USD")
  const usd = (amount: number) =>
    currency === "INR"
      ? formatCurrency(amount * rate, "INR")
      : formatCurrency(amount, "USD")

  const scaleInr = (val: number) => (currency === "INR" ? val : Math.round(val / rate))

  const convertedTrends: SpendingDataPoint[] = (data?.spendingTrends ?? []).map((pt) => ({
    month: pt.month,
    subscriptions: scaleInr(pt.subscriptions),
    api: scaleInr(pt.api),
    total: scaleInr(pt.total),
  }))

  const providerSpending: ProviderSpendingData[] = (
    data?.providerBreakdown ?? []
  ).map((entry) => {
    const known = Object.values(PROVIDERS).find(
      (provider) => provider.name === entry.name
    )
    return {
      provider: entry.name,
      providerSlug: known?.slug ?? "openai",
      amount: scaleInr(entry.amount),
      color: entry.color,
    }
  })

  const convertInrText = (text?: string) => {
    if (!text || currency === "INR") return text
    return text.replace(/₹([0-9,]+)/g, (_, digits) => {
      const raw = Number(String(digits).replace(/,/g, ""))
      if (!Number.isFinite(raw)) return `₹${digits}`
      return `$${Math.round(raw / rate)}`
    })
  }

  const convertedInsights = (data?.insights ?? []).map((ins) => ({
    ...ins,
    description: convertInrText(ins.description) || ins.description,
    impact: convertInrText(ins.impact),
  }))

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
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Analysis"
        title="Analytics"
        description="Spend trends, portfolio composition, optimization signals, and model pricing references across your AI stack."
        action={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">Currency</span>
            <div className="segmented" role="group" aria-label="Display currency">
              <button
                onClick={() => setCurrency("INR")}
                className={cn("segmented-item", currency === "INR" && "segmented-item-active")}
                aria-pressed={currency === "INR"}
              >
                INR ₹
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={cn("segmented-item", currency === "USD" && "segmented-item-active")}
                aria-pressed={currency === "USD"}
              >
                USD $
              </button>
            </div>
          </div>
        }
      />

      {loading || !data?.overview ? <StatBandSkeleton columns={4} /> : <StatBand items={metrics} columns={4} />}

      {loading ? (
        <SpendingChartsSkeleton />
      ) : data ? (
        <SpendingCharts
          monthlySpending={convertedTrends}
          providerSpending={providerSpending}
          currency={currency}
        />
      ) : null}

      {!loading && data?.insights && <SmartIntelligenceCards insights={convertedInsights} />}

      {!loading && data?.modelComparison && <ModelComparisonTable models={data.modelComparison} />}
    </div>
  )
}
