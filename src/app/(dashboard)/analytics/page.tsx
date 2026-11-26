"use client"

import { useEffect, useState, type ComponentProps } from "react"
import Link from "next/link"
import { RefreshCw, AlertTriangle, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { TrustBadge } from "@/components/ui/trust-badge"
import {
  SpendingCharts,
  SpendingChartsSkeleton,
} from "@/components/dashboard/spending-charts"
import { SmartIntelligenceCards } from "@/components/analytics/smart-intelligence-cards"
import { ModelComparisonTable } from "@/components/analytics/model-comparison-table"
import { PROVIDERS } from "@/lib/providers"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import type { ProviderSpendingData, SpendingDataPoint } from "@/lib/types"

interface AccountSnapshotItem {
  id: string
  accountName: string
  providerSlug: string
  providerName: string
  currency: string
  prepaidBalance: number
  totalSpent: number
  integrationStatus: string
  syncedAt: string | null
  syncStatus: string
  errorMessage: string | null
  dataSource: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  requests: number
  capability?: {
    canSyncUsage: boolean
    canSyncCredits: boolean
    billingUrl: string | null
    capabilitiesNote: string
  }
}

interface SubscriptionDrilldownItem {
  id: string
  providerSlug: string
  providerName: string
  planName: string
  type: string
  status: string
  price: number
  currency: string
  billingCycle: string
  dataSource: string
  syncedAt: string
  quotaMessages: number | null
  usedMessages: number
  quotaRequests: number | null
  usedRequests: number
  quotaTokens: number | null
  usedTokens: number
  quotaCredits: number | null
  usedCredits: number
}

interface ModelBreakdownItem {
  model: string
  providerName: string
  providerSlug: string
  tokens: number
  cost: number
  requests: number
  dataSource: string
}

interface AnalyticsData {
  baseCurrency?: string
  spendingTrends: SpendingDataPoint[]
  providerBreakdown: Array<{
    name: string
    amount: number
    color: string
    count: number
  }>
  exchangeRateUsdToInr?: number
  exchangeRates?: { USD_INR: number; EUR_USD: number; GBP_USD: number }
  fxMeta?: {
    isFallback: boolean
    source: string
    fetchedAt: string | null
  }
  overview: {
    monthlySubscriptions: number
    annualSubscriptions: number
    apiSpent: number
    apiBalance: number
  }
  insights: ComponentProps<typeof SmartIntelligenceCards>["insights"]
  modelComparison: ComponentProps<typeof ModelComparisonTable>["models"]
  accountSnapshots?: AccountSnapshotItem[]
  subscriptionDrilldown?: SubscriptionDrilldownItem[]
  modelBreakdown?: ModelBreakdownItem[]
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncBanner, setSyncBanner] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [currency, setCurrency] = useState("USD")

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/analytics")
      const json = await res.json()
      if (json.data) {
        const d = json.data as AnalyticsData
        setData(d)
        if (d.baseCurrency) {
          setCurrency(d.baseCurrency.toUpperCase())
        }
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const handleSyncNow = async () => {
    setSyncing(true)
    setSyncBanner(null)
    try {
      const res = await fetch("/api/usage-sync", { method: "POST" })
      const json = await res.json()
      if (res.ok && json.data) {
        const s = json.data
        setSyncBanner(
          `Checked ${s.accountsChecked} account(s): ${s.liveUpdatedCount} live synced, ${s.unsupportedCount} manual/unsupported, ${s.errorCount} sync error(s).`
        )
        await loadAnalytics()
      }
    } finally {
      setSyncing(false)
    }
  }

  const usdInr = data?.exchangeRates?.USD_INR || data?.exchangeRateUsdToInr || 84.5
  const eurUsd = data?.exchangeRates?.EUR_USD || 1.08
  const gbpUsd = data?.exchangeRates?.GBP_USD || 1.27

  const convertInrToTarget = (amountInr: number) => {
    if (currency === "INR") return amountInr
    const usdVal = amountInr / usdInr
    if (currency === "USD") return usdVal
    if (currency === "EUR") return usdVal / eurUsd
    if (currency === "GBP") return usdVal / gbpUsd
    return usdVal
  }

  const convertUsdToTarget = (amountUsd: number) => {
    if (currency === "USD") return amountUsd
    if (currency === "INR") return amountUsd * usdInr
    if (currency === "EUR") return amountUsd / eurUsd
    if (currency === "GBP") return amountUsd / gbpUsd
    return amountUsd
  }

  const inr = (amount: number) => formatCurrency(convertInrToTarget(amount), currency)
  const usd = (amount: number) => formatCurrency(convertUsdToTarget(amount), currency)
  const scaleInr = (val: number) => Math.round(convertInrToTarget(val))

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
      return formatCurrency(Math.round(convertInrToTarget(raw)), currency)
    })
  }

  const convertedInsights = (data?.insights ?? []).map((ins) => ({
    ...ins,
    description: convertInrText(ins.description) || ins.description,
    impact: convertInrText(ins.impact),
  }))

  const fxIsFallback = data?.fxMeta?.isFallback !== false
  const fxProvenanceText = fxIsFallback
    ? "Estimated fallback FX rate"
    : `Live FX (${data?.fxMeta?.fetchedAt ? new Date(data.fxMeta.fetchedAt).toLocaleDateString() : "synced"})`

  const metrics = data?.overview
    ? [
        {
          label: "Monthly subscriptions",
          value: `${currency !== "INR" && fxIsFallback ? "~" : ""}${inr(data.overview.monthlySubscriptions)}`,
          meta: `Fixed recurring spend · ${fxProvenanceText}`,
        },
        {
          label: "Annual run-rate",
          value: `${currency !== "INR" && fxIsFallback ? "~" : ""}${inr(data.overview.annualSubscriptions)}`,
          meta: `Projected 12-month baseline · ${currency}`,
        },
        {
          label: "API spend",
          value: `${currency !== "USD" && fxIsFallback ? "~" : ""}${usd(data.overview.apiSpent)}`,
          meta: `Tracked developer consumption · ${currency}`,
        },
        {
          label: "Prepaid balance",
          value: `${currency !== "USD" && fxIsFallback ? "~" : ""}${usd(data.overview.apiBalance)}`,
          meta: "Available across accounts",
        },
      ]
    : []

  const accounts = data?.accountSnapshots ?? []
  const subs = data?.subscriptionDrilldown ?? []
  const modelsUsed = data?.modelBreakdown ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Provenance & Analysis"
        title="Usage & Analytics"
        description="Live provider usage snapshots where official APIs exist, honest manual/unsupported provenance labels elsewhere, per-model spend, and currency-normalized trends."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="btn-secondary btn-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing providers…" : "Sync live usage"}
            </button>
            <div className="segmented" role="group" aria-label="Display currency">
              {[
                { code: "USD", label: "USD $" },
                { code: "EUR", label: "EUR €" },
                { code: "GBP", label: "GBP £" },
                { code: "INR", label: "INR ₹" },
              ].map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={cn("segmented-item", currency === c.code && "segmented-item-active")}
                  aria-pressed={currency === c.code}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {syncBanner && (
        <div className="border border-line bg-surface-2/40 px-4 py-2.5 text-[12px] text-ink-2">
          {syncBanner}
        </div>
      )}

      {loading || !data?.overview ? <StatBandSkeleton columns={4} /> : <StatBand items={metrics} columns={4} />}

      {/* Provider Accounts: Source Provenance, Freshness, Credits & Errors */}
      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
              Provider usage &amp; credit provenance
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Every figure carries an explicit source badge and sync freshness. Live balances are never overwritten by fallback guesses.
            </p>
          </div>
          <Link href="/api-usage" className="btn-ghost btn-sm">
            Import manually / Manage balances
          </Link>
        </div>

        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <caption className="sr-only">Developer API account balances, usage sync provenance, and total spend</caption>
            <thead>
              <tr>
                <th>Account / Provider</th>
                <th>Provenance &amp; Freshness</th>
                <th className="text-right">Credits Remaining</th>
                <th className="text-right">Total Spend</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[12.5px] text-ink-3">
                    No developer API accounts configured yet.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <ProviderIcon slug={acc.providerSlug} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">{acc.accountName}</p>
                          <p className="text-[11px] text-ink-3">
                            {acc.capability?.canSyncCredits || acc.capability?.canSyncUsage
                              ? "Official usage/credit sync supported (with compatible key)"
                              : "Manual tracking only — no public usage API"}
                          </p>
                          {acc.errorMessage && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-warning">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[360px]">{acc.errorMessage}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <TrustBadge source={acc.dataSource} syncedAt={acc.syncedAt} showFreshness />
                    </td>
                    <td className="text-right font-mono text-[12px] tabular-nums text-ink">
                      {formatCurrency(acc.prepaidBalance, acc.currency)}
                    </td>
                    <td className="text-right font-mono text-[12px] tabular-nums text-ink-2">
                      {formatCurrency(acc.totalSpent, acc.currency)}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {acc.syncStatus === "error" || acc.integrationStatus !== "connected" ? (
                          <Link href="/integrations" className="btn-secondary btn-sm">
                            Reconnect
                          </Link>
                        ) : null}
                        <Link href="/api-usage" className="btn-ghost btn-sm">
                          Import manually
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-Model Consumption Breakdown */}
      {modelsUsed.length > 0 && (
        <section className="border-t border-line pt-5">
          <div className="pb-4">
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
              Per-model consumption breakdown
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Attributed tokens and spend across Studio executions and recorded API logs.
            </p>
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="data-table">
              <caption className="sr-only">Per-model request, token, and USD spend breakdown</caption>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Source</th>
                  <th className="text-right">Requests</th>
                  <th className="text-right">Tokens</th>
                  <th className="text-right">Spend (USD)</th>
                </tr>
              </thead>
              <tbody>
                {modelsUsed.map((m) => (
                  <tr key={`${m.providerSlug}:${m.model}`}>
                    <td className="font-mono text-[12px] text-ink">{m.model}</td>
                    <td className="text-[12px] text-ink-2">{m.providerName}</td>
                    <td><TrustBadge source={m.dataSource} /></td>
                    <td className="text-right font-mono text-[12px] tabular-nums">{formatNumber(m.requests)}</td>
                    <td className="text-right font-mono text-[12px] tabular-nums">{formatNumber(m.tokens)}</td>
                    <td className="text-right font-mono text-[12px] tabular-nums text-ink">${m.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Per-Subscription Drilldown */}
      {subs.length > 0 && (
        <section className="border-t border-line pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                Subscription quota drill-down
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                Distinguishes automated API quota sync from consumer seats tracked manually.
              </p>
            </div>
            <Link href="/subscriptions" className="btn-ghost btn-sm">
              Manage subscriptions
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="data-table">
              <caption className="sr-only">Subscription plan quota utilization, provenance, and recurring cost</caption>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Provenance</th>
                  <th>Recorded Utilization</th>
                  <th className="text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const quotaLabel = s.quotaMessages
                    ? `${s.usedMessages} / ${s.quotaMessages} msgs`
                    : s.quotaRequests
                      ? `${s.usedRequests} / ${s.quotaRequests} reqs`
                      : s.quotaTokens
                        ? `${formatNumber(s.usedTokens)} / ${formatNumber(s.quotaTokens)} tokens`
                        : s.quotaCredits
                          ? `${s.usedCredits} / ${s.quotaCredits} credits`
                          : "Unmetered / Manual"
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon slug={s.providerSlug} size="sm" />
                          <div>
                            <p className="text-[13px] font-medium text-ink">{s.providerName} · {s.planName}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">{s.type} · {s.status}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <TrustBadge source={s.dataSource} syncedAt={s.syncedAt} showFreshness={s.dataSource === "live_api_sync" || s.dataSource === "api_sync"} />
                      </td>
                      <td className="font-mono text-[11.5px] text-ink-2">{quotaLabel}</td>
                      <td className="text-right font-mono text-[12px] tabular-nums text-ink">
                        {formatCurrency(s.price, s.currency)}/{s.billingCycle === "yearly" ? "yr" : "mo"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
