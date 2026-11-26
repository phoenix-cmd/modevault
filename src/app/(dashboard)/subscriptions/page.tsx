"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import {
  Layers,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react"
import { SubscriptionCard } from "@/components/subscriptions/subscription-card"
import { SubscriptionList } from "@/components/subscriptions/subscription-list"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { UsageModal } from "@/components/subscriptions/usage-modal"
import { DeleteDialog } from "@/components/subscriptions/delete-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { EmptyState } from "@/components/ui/empty-state"
import { PROVIDER_LIST } from "@/lib/providers"
import { formatCurrency, getMonthlyEquivalent } from "@/lib/utils"
import type { RawSubscription, SubscriptionData } from "@/lib/types"

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionData | null>(null)

  const [isUsageOpen, setIsUsageOpen] = useState(false)
  const [usageSub, setUsageSub] = useState<SubscriptionData | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [syncingRenewals, setSyncingRenewals] = useState(false)
  const [syncSummary, setSyncSummary] = useState<string | null>(null)
  const [baseCurrency, setBaseCurrency] = useState<string>("USD")
  const [ratesMap, setRatesMap] = useState<{ USD_INR: number; EUR_USD: number; GBP_USD: number }>({
    USD_INR: 84.5,
    EUR_USD: 1.08,
    GBP_USD: 1.27,
  })
  const [fxMeta, setFxMeta] = useState<{
    isFallback: boolean
    source: string
    fetchedAt: string | null
  }>({
    isFallback: true,
    source: "estimated_fallback",
    fetchedAt: null,
  })

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const [res, settingsRes, fxRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/settings").catch(() => null),
        fetch("/api/exchange-rates").catch(() => null),
      ])
      const json = await res.json()
      const settingsJson = settingsRes ? await settingsRes.json().catch(() => null) : null
      const fxJson = fxRes ? await fxRes.json().catch(() => null) : null
      const resolvedUserCurrency = String(settingsJson?.data?.currency || "USD").toUpperCase()
      setBaseCurrency(resolvedUserCurrency)
      if (fxJson?.ratesMap) {
        setRatesMap(fxJson.ratesMap)
      } else if (Array.isArray(fxJson?.data)) {
        const next = { USD_INR: 84.5, EUR_USD: 1.08, GBP_USD: 1.27 }
        for (const row of fxJson.data as Array<{ fromCurrency: string; toCurrency: string; rate: number }>) {
          if (row.fromCurrency === "USD" && row.toCurrency === "INR" && row.rate > 0) next.USD_INR = row.rate
          if (row.fromCurrency === "EUR" && row.toCurrency === "USD" && row.rate > 0) next.EUR_USD = row.rate
          if (row.fromCurrency === "GBP" && row.toCurrency === "USD" && row.rate > 0) next.GBP_USD = row.rate
        }
        setRatesMap(next)
      }
      if (fxJson) {
        setFxMeta({
          isFallback: fxJson.isFallback !== false,
          source: fxJson.source || "estimated_fallback",
          fetchedAt: fxJson.fetchedAt || null,
        })
      }
      if (json.data) {
        const mapped: SubscriptionData[] = json.data.map((s: RawSubscription) => ({
          id: s.id,
          userId: s.userId,
          providerId: s.providerId,
          providerSlug: s.provider?.slug || "openai",
          providerName: s.provider?.name || "Provider",
          planName: s.customPlanName || s.plan?.name || "Standard Plan",
          type: s.type || "consumer",
          status: s.status || "active",
          billingCycle: s.billingCycle || "monthly",
          price: s.price,
          currency: s.currency || resolvedUserCurrency,
          startDate: s.startDate,
          renewalDate: s.renewalDate,
          expiryDate: s.expiryDate,
          quotaMessages: s.quotaMessages,
          quotaTokens: s.quotaTokens,
          quotaRequests: s.quotaRequests,
          quotaCredits: s.quotaCredits,
          usedMessages: s.usedMessages || 0,
          usedTokens: s.usedTokens || 0,
          usedRequests: s.usedRequests || 0,
          usedCredits: s.usedCredits || 0,
          quotaResetDate: s.quotaResetDate,
          quotaResetPeriod: s.quotaResetPeriod,
          dataSource: s.dataSource || "manual",
          notes: s.notes,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
        setSubscriptions(mapped)
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const handleSyncRenewals = async () => {
    setSyncingRenewals(true)
    setSyncSummary(null)
    try {
      const res = await fetch("/api/subscriptions/sync", { method: "POST" })
      const json = await res.json()
      if (res.ok && json.data) {
        const { renewalsProcessed, quotasReset, alertsEmitted } = json.data
        setSyncSummary(
          `Processed ${renewalsProcessed} renewal(s), reset ${quotasReset} quota counter(s), emitted ${alertsEmitted} alert(s).`
        )
        setTimeout(() => setSyncSummary(null), 5000)
        await fetchSubscriptions()
      }
    } finally {
      setSyncingRenewals(false)
    }
  }

  const filtered = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.notes && sub.notes.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    const matchesProvider =
      providerFilter === "all" || sub.providerSlug === providerFilter
    const matchesType = typeFilter === "all" || sub.type === typeFilter

    return matchesSearch && matchesStatus && matchesProvider && matchesType
  })

  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null)

  useEffect(() => {
    setNowTimestamp(Date.now())
  }, [])

  const convertToBase = (amount: number, fromCurrency: string) => {
    const from = (fromCurrency || baseCurrency || "USD").toUpperCase()
    const to = (baseCurrency || "USD").toUpperCase()
    if (from === to) return amount
    let usd = amount
    if (from === "INR") usd = amount / ratesMap.USD_INR
    else if (from === "EUR") usd = amount * ratesMap.EUR_USD
    else if (from === "GBP") usd = amount * ratesMap.GBP_USD
    if (to === "USD") return usd
    if (to === "INR") return usd * ratesMap.USD_INR
    if (to === "EUR") return usd / ratesMap.EUR_USD
    if (to === "GBP") return usd / ratesMap.GBP_USD
    return usd
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active")
  const hasCrossCurrencySubs = activeSubs.some(
    (s) => (s.currency || baseCurrency).toUpperCase() !== baseCurrency.toUpperCase()
  )
  const totalMonthlySpend = activeSubs.reduce(
    (acc, s) => acc + convertToBase(getMonthlyEquivalent(s.price, s.billingCycle), s.currency),
    0
  )
  const expiringSoonCount = nowTimestamp
    ? activeSubs.filter((s) => {
        if (!s.renewalDate) return false
        const diff = new Date(s.renewalDate).getTime() - nowTimestamp
        return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000
      }).length
    : 0

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    providerFilter !== "all" ||
    typeFilter !== "all"

  const deletingSub = deletingId
    ? subscriptions.find((s) => s.id === deletingId)
    : null

  const openCreate = () => {
    setEditingSub(null)
    setIsFormOpen(true)
  }

  const fxProvenanceLabel = !hasCrossCurrencySubs
    ? `Native ${baseCurrency} billing`
    : fxMeta.isFallback
      ? `Estimated (${baseCurrency} · fallback FX)`
      : `Normalized (${baseCurrency} · live FX${fxMeta.fetchedAt ? ` ${new Date(fxMeta.fetchedAt).toLocaleDateString()}` : ""})`

  const metrics = [
    {
      label: "Active subscriptions",
      value: String(activeSubs.length),
      meta: `${subscriptions.length} tracked in total`,
    },
    {
      label: "Monthly committed",
      value: `${hasCrossCurrencySubs && fxMeta.isFallback ? "~" : ""}${formatCurrency(totalMonthlySpend, baseCurrency)}`,
      meta: fxProvenanceLabel,
    },
    {
      label: "Renewing in 14 days",
      value: String(expiringSoonCount),
      meta: expiringSoonCount > 0 ? "Review before renewal" : "Nothing due soon",
      accent: expiringSoonCount > 0,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Portfolio"
        title="Subscriptions"
        description="Every AI plan and developer account in one portfolio, with live quota, renewal, and spend tracking."
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleSyncRenewals} disabled={syncingRenewals} className="btn-secondary btn-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${syncingRenewals ? "animate-spin" : ""}`} strokeWidth={1.8} />
              {syncingRenewals ? "Syncing…" : "Sync renewals"}
            </button>
            <button onClick={openCreate} className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Add subscription
            </button>
          </div>
        }
      />

      {syncSummary && (
        <div className="border border-success/25 bg-success-soft/40 px-4 py-2.5 text-[12px] text-success">
          {syncSummary}
        </div>
      )}

      {loading ? <StatBandSkeleton columns={3} /> : <StatBand items={metrics} columns={3} />}

      <section className="border-t border-line pt-5">
        <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Subscription register</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Filter, review, and manage tracked plans, quotas, and renewals.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search provider, plan or notes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field field-sm pl-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select select-sm w-full sm:w-auto" aria-label="Filter by status">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="trial">Trial</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="select select-sm w-full sm:w-auto" aria-label="Filter by provider">
                <option value="all">All providers</option>
                {PROVIDER_LIST.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select select-sm w-full sm:w-auto" aria-label="Filter by category">
                <option value="all">All categories</option>
                <option value="consumer">Consumer</option>
                <option value="api">API account</option>
              </select>

              <div className="segmented justify-self-end" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode("list")}
                  className={`segmented-item ${viewMode === "list" ? "segmented-item-active" : ""}`}
                  aria-pressed={viewMode === "list"}
                >
                  <List className="h-3.5 w-3.5" strokeWidth={1.8} />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`segmented-item ${viewMode === "grid" ? "segmented-item-active" : ""}`}
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.8} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="border-b border-line">
            <div className="flex items-center gap-6 border-b border-line bg-surface-2/40 px-2 py-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-2.5 w-16" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton h-7 w-7 rounded-[6px]" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-2.5 w-20" />
                </div>
                <div className="skeleton hidden h-3.5 w-16 sm:block" />
                <div className="skeleton h-5 w-14 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Layers}
              title="No subscriptions found"
              description={
                hasActiveFilters
                  ? "No AI services match your current filters. Try clearing them or searching for another provider."
                  : "Start monitoring your AI stack by adding your first subscription or API account."
              }
              actionLabel="Add subscription"
              onAction={openCreate}
            />
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onEdit={(s) => {
                  setEditingSub(s)
                  setIsFormOpen(true)
                }}
                onDelete={(id) => {
                  setDeletingId(id)
                  setIsDeleteOpen(true)
                }}
                onRecordUsage={(s) => {
                  setUsageSub(s)
                  setIsUsageOpen(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-1">
            <SubscriptionList
              subscriptions={filtered}
              onEdit={(s) => {
                setEditingSub(s)
                setIsFormOpen(true)
              }}
              onDelete={(id) => {
                setDeletingId(id)
                setIsDeleteOpen(true)
              }}
              onRecordUsage={(s) => {
                setUsageSub(s)
                setIsUsageOpen(true)
              }}
            />
          </div>
        )}
      </section>

      <SubscriptionForm
        subscription={editingSub}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSub(null)
        }}
        onSuccess={fetchSubscriptions}
      />

      <UsageModal
        subscription={usageSub}
        isOpen={isUsageOpen}
        onClose={() => {
          setIsUsageOpen(false)
          setUsageSub(null)
        }}
        onSuccess={fetchSubscriptions}
      />

      <DeleteDialog
        subscriptionId={deletingId}
        subscriptionName={deletingSub ? `${deletingSub.providerName} ${deletingSub.planName}` : undefined}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setDeletingId(null)
        }}
        onSuccess={fetchSubscriptions}
      />
    </div>
  )
}
