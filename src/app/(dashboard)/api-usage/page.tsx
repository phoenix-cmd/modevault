"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { ApiAccountsCards } from "@/components/api-usage/api-accounts-cards"
import { ApiTokenChart } from "@/components/api-usage/api-token-chart"
import { ApiRecordsTable } from "@/components/api-usage/api-records-table"
import { AddApiRecordModal } from "@/components/api-usage/add-api-record-modal"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { formatNumber } from "@/lib/utils"
import type {
  ApiAccountData,
  ApiUsageRecordData,
  ApiUsageSummaryData,
  RawApiAccount,
} from "@/lib/types"

export default function ApiUsagePage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ApiAccountData[]>([])
  const [records, setRecords] = useState<ApiUsageRecordData[]>([])
  const [summary, setSummary] = useState<ApiUsageSummaryData | null>(null)

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
        const mappedAcc: ApiAccountData[] = accJson.data.map((a: RawApiAccount) => ({
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

  const metrics = summary
    ? [
        {
          label: "Total tokens",
          value: formatNumber(summary.totalTokens),
          meta: `Cached ${formatNumber(summary.totalCachedTokens)}`,
        },
        {
          label: "API spend",
          value: `$${summary.totalCost.toFixed(2)}`,
          meta: `~₹${(summary.totalCost * 84.5).toFixed(0)} at current rates`,
        },
        {
          label: "Requests",
          value: formatNumber(summary.totalRequests),
          meta: "Across recorded usage",
        },
        {
          label: "Developer accounts",
          value: String(accounts.length),
          meta: "Connected and manual",
        },
      ]
    : []

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Developer APIs"
        title="Usage"
        description="Token throughput, prepaid credit reserves, and per-model unit economics across your developer API accounts."
        action={
          <>
            <button onClick={fetchData} disabled={loading} className="btn-secondary btn-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button
              onClick={() => {
                setSelectedAccountId(null)
                setModalOpen(true)
              }}
              className="btn-primary btn-sm"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Log usage
            </button>
          </>
        }
      />

      {loading || !summary ? <StatBandSkeleton columns={4} /> : <StatBand items={metrics} columns={4} />}

      {loading ? (
        <section className="border-t border-line pt-5">
          <div className="space-y-2 pb-4">
            <div className="skeleton h-3.5 w-40" />
            <div className="skeleton h-2.5 w-64" />
          </div>
          <div className="border-t border-line">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton h-7 w-7 rounded-[6px]" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-2.5 w-20" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <ApiAccountsCards
          accounts={accounts}
          onAddLog={(id) => {
            setSelectedAccountId(id)
            setModalOpen(true)
          }}
        />
      )}

      {loading ? (
        <section className="grid gap-8 border-t border-line pt-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="skeleton mb-4 h-3.5 w-36" />
            <div className="skeleton h-[236px] w-full" />
          </div>
          <div>
            <div className="skeleton mb-4 h-3.5 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-1 w-full" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        summary && <ApiTokenChart dailyTrend={summary.dailyTrend} byModel={summary.byModel} />
      )}

      <ApiRecordsTable records={records} />

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
