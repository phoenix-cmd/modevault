"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import { Plus, RefreshCw, X } from "lucide-react"
import { ApiAccountsCards } from "@/components/api-usage/api-accounts-cards"
import { ApiTokenChart } from "@/components/api-usage/api-token-chart"
import { ApiRecordsTable } from "@/components/api-usage/api-records-table"
import { AddApiRecordModal } from "@/components/api-usage/add-api-record-modal"
import { ReplenishmentPanel } from "@/components/api-usage/replenishment-panel"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { useModalA11y } from "@/lib/use-modal-a11y"
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
  const [providers, setProviders] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [records, setRecords] = useState<ApiUsageRecordData[]>([])
  const [summary, setSummary] = useState<ApiUsageSummaryData | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ApiAccountData | null>(null)
  const accountDialogRef = useModalA11y(accountModalOpen, () => setAccountModalOpen(false))
  const [newProviderId, setNewProviderId] = useState("")
  const [newAccountName, setNewAccountName] = useState("")
  const [newKeyLastFour, setNewKeyLastFour] = useState("")
  const [newBalance, setNewBalance] = useState("50")
  const [newCurrency, setNewCurrency] = useState("USD")
  const [newRateLimit, setNewRateLimit] = useState("")
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [accRes, recRes, sumRes, provRes] = await Promise.all([
        fetch("/api/api-accounts"),
        fetch("/api/api-usage?limit=100"),
        fetch("/api/api-usage/summary"),
        fetch("/api/providers"),
      ])

      const [accJson, recJson, sumJson, provJson] = await Promise.all([
        accRes.json(),
        recRes.json(),
        sumRes.json(),
        provRes.json().catch(() => ({ data: [] })),
      ])

      if (Array.isArray(provJson?.data)) {
        setProviders(provJson.data)
        if (provJson.data.length > 0) {
          setNewProviderId((cur) => cur || provJson.data[0].id)
        }
      }

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
          dataSource: a.dataSource || null,
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

  const openEditAccount = (acc: ApiAccountData) => {
    setEditingAccount(acc)
    setNewProviderId(acc.providerId)
    setNewAccountName(acc.accountName || "")
    setNewKeyLastFour(acc.apiKeyLastFour || "")
    setNewBalance(String(acc.prepaidBalance ?? 0))
    setNewCurrency(acc.currency || "USD")
    setNewRateLimit(acc.rateLimit ? String(acc.rateLimit) : "")
    setAccountError(null)
    setAccountModalOpen(true)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProviderId && !editingAccount) return
    setCreatingAccount(true)
    setAccountError(null)
    try {
      const url = editingAccount
        ? `/api/api-accounts/${encodeURIComponent(editingAccount.id)}`
        : "/api/api-accounts"
      const method = editingAccount ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!editingAccount && { providerId: newProviderId }),
          accountName: newAccountName.trim() || null,
          apiKeyLastFour: newKeyLastFour.trim() || null,
          prepaidBalance: Number(newBalance) || 0,
          currency: newCurrency,
          rateLimit: newRateLimit ? Number.parseInt(newRateLimit, 10) : null,
          ...(!editingAccount && { integrationStatus: "manual" }),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save API account")
      setAccountModalOpen(false)
      setEditingAccount(null)
      setNewAccountName("")
      setNewKeyLastFour("")
      setNewBalance("50")
      setNewRateLimit("")
      await fetchData()
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to save API account")
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const res = await fetch(`/api/api-accounts/${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      })
      if (res.ok) await fetchData()
    } catch (err) {
      console.error("Failed to delete API account:", err)
    }
  }

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
          meta: `Recorded across API usage logs`,
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
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="btn-secondary btn-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button
              onClick={() => {
                setEditingAccount(null)
                setNewAccountName("")
                setNewKeyLastFour("")
                setNewBalance("50")
                setNewRateLimit("")
                setAccountError(null)
                setAccountModalOpen(true)
              }}
              className="btn-secondary btn-sm"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add API account
            </button>
            <button
              onClick={() => {
                setSelectedAccountId(null)
                setModalOpen(true)
              }}
              disabled={accounts.length === 0}
              className="btn-primary btn-sm"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Log usage
            </button>
          </div>
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
          onCreateAccount={() => {
            setEditingAccount(null)
            setAccountModalOpen(true)
          }}
          onEditAccount={openEditAccount}
          onDeleteAccount={handleDeleteAccount}
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

      <ReplenishmentPanel accounts={accounts} onUpdated={fetchData} />

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

      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={accountDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-api-account-title"
            className="panel max-h-[90dvh] w-full max-w-md overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Developer billing</p>
                <h2 id="add-api-account-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  {editingAccount ? "Edit / Top up API account" : "Add API account"}
                </h2>
              </div>
              <button onClick={() => setAccountModalOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount}>
              <div className="space-y-4 px-5 py-4">
                {accountError && (
                  <div className="border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                    {accountError}
                  </div>
                )}

                <div>
                  <label className="label">Provider</label>
                  <select
                    value={newProviderId}
                    onChange={(e) => setNewProviderId(e.target.value)}
                    className="select"
                    required
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Account label</label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="e.g. Production OpenAI Org"
                    className="field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Prepaid balance</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="field tnum"
                    />
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} className="select">
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Key last 4 (optional)</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={newKeyLastFour}
                      onChange={(e) => setNewKeyLastFour(e.target.value)}
                      placeholder="4a9f"
                      className="field font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">Rate limit (RPM)</label>
                    <input
                      type="number"
                      min="0"
                      value={newRateLimit}
                      onChange={(e) => setNewRateLimit(e.target.value)}
                      placeholder="5000"
                      className="field tnum"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
                <button type="button" onClick={() => setAccountModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={creatingAccount || (!newProviderId && !editingAccount)} className="btn-primary">
                  {creatingAccount ? "Saving…" : editingAccount ? "Save changes" : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
