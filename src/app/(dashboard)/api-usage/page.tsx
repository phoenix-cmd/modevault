"use client"

import { useEffect, useState } from "react"
import { Activity, Plus, Terminal, RefreshCw, Layers } from "lucide-react"
import { ApiAccountsCards } from "@/components/api-usage/api-accounts-cards"
import { ApiTokenChart } from "@/components/api-usage/api-token-chart"
import { ApiRecordsTable } from "@/components/api-usage/api-records-table"
import { AddApiRecordModal } from "@/components/api-usage/add-api-record-modal"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { formatNumber, formatCurrency } from "@/lib/utils"
import type { ApiAccountData } from "@/lib/types"

export default function ApiUsagePage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ApiAccountData[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState<{
    totalTokens: number
    totalCost: number
    totalRequests: number
    totalCachedTokens: number
    byModel: any[]
    dailyTrend: any[]
    byProvider: any[]
  } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [accRes, recRes, sumRes] = await Promise.all([
        fetch("/api/api-accounts"),
        fetch("/api/api-usage?limit=100"),
        fetch("/api/api-usage/summary"),
      ])

      const [accJson, recJson, sumJson] = await Promise.all([
        accRes.json(),
        recRes.json(),
        sumRes.json(),
      ])

      if (accJson.data) {
        const mappedAcc: ApiAccountData[] = accJson.data.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          providerId: a.providerId,
          providerSlug: a.provider?.slug || "openai",
          providerName: a.provider?.name || "Provider",
          accountName: a.accountName,
          apiKeyLastFour: a.apiKeyLastFour,
          prepaidBalance: a.prepaidBalance || 0,
          totalSpent: a.totalSpent || 0,
          currency: a.currency || "USD",
          rateLimit: a.rateLimit,
          rateLimitTokens: a.rateLimitTokens,
          integrationStatus: a.integrationStatus || "manual",
          lastSyncAt: a.lastSyncAt,
          lastSyncStatus: a.lastSyncStatus,
          lastSyncError: a.lastSyncError,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }))
        setAccounts(mappedAcc)
      }

      if (recJson.data) setRecords(recJson.data)
      if (sumJson.data) setSummary(sumJson.data)
    } catch (err) {
      console.error("Failed to fetch API usage:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="API Usage & Developer Metrics"
        description="Monitor token throughput, prepaid credit reserves, request latency, and per-model unit economics."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedAccountId(null)
                setModalOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Log API Usage
            </button>
          </div>
        }
      />

      {/* Aggregate Developer Stats Strip */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Total Tokens Consumed</p>
            <p className="text-xl font-bold font-mono text-zinc-100">
              {formatNumber(summary.totalTokens)}
            </p>
            <p className="text-[11px] text-zinc-500">
              Cached: {formatNumber(summary.totalCachedTokens)}
            </p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Total API Incurred Spend</p>
            <p className="text-xl font-bold font-mono text-emerald-400">
              ${summary.totalCost.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-500">
              ~₹{(summary.totalCost * 84.5).toFixed(0)} at current rates
            </p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">API Requests Recorded</p>
            <p className="text-xl font-bold font-mono text-zinc-100">
              {formatNumber(summary.totalRequests)}
            </p>
            <p className="text-[11px] text-zinc-500">Across 30 days</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Active API Accounts</p>
            <p className="text-xl font-bold font-mono text-zinc-100">
              {accounts.length}
            </p>
            <p className="text-[11px] text-zinc-500">
              OpenAI, Anthropic, Gemini, OpenRouter
            </p>
          </GlassCard>
        </div>
      )}

      {/* API Accounts Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Tracked Developer Accounts & Balances
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <ApiAccountsCards
            accounts={accounts}
            onAddLog={(id) => {
              setSelectedAccountId(id)
              setModalOpen(true)
            }}
          />
        )}
      </div>

      {/* Token Graphs & Model Cost Distribution */}
      {summary && (
        <ApiTokenChart
          dailyTrend={summary.dailyTrend}
          byModel={summary.byModel}
        />
      )}

      {/* Raw Usage Table */}
      <ApiRecordsTable records={records} />

      {/* Log Modal */}
      <AddApiRecordModal
        apiAccounts={accounts}
        selectedAccountId={selectedAccountId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedAccountId(null)
        }}
        onSuccess={fetchData}
      />
    </div>
  )
}
