"use client"

import { useEffect, useState } from "react"
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Layers,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react"
import { SubscriptionCard } from "@/components/subscriptions/subscription-card"
import { SubscriptionList } from "@/components/subscriptions/subscription-list"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { UsageModal } from "@/components/subscriptions/usage-modal"
import { DeleteDialog } from "@/components/subscriptions/delete-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { GlassCard } from "@/components/ui/glass-card"
import { PROVIDER_LIST } from "@/lib/providers"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { SubscriptionData, SubscriptionStatus } from "@/lib/types"

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/subscriptions")
      const json = await res.json()
      if (json.data) {
        const mapped: SubscriptionData[] = json.data.map((s: any) => ({
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
          currency: s.currency || "INR",
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

  // Filtered subscriptions
  const filtered = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.notes && sub.notes.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus =
      statusFilter === "all" || sub.status === statusFilter

    const matchesProvider =
      providerFilter === "all" || sub.providerSlug === providerFilter

    const matchesType =
      typeFilter === "all" || sub.type === typeFilter

    return matchesSearch && matchesStatus && matchesProvider && matchesType
  })

  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null)

  useEffect(() => {
    setNowTimestamp(Date.now())
  }, [])

  // Quick stats
  const activeSubs = subscriptions.filter((s) => s.status === "active")
  const totalMonthlySpend = activeSubs.reduce((acc, s) => {
    return acc + (s.billingCycle === "yearly" ? s.price / 12 : s.price)
  }, 0)
  const expiringSoonCount = nowTimestamp
    ? activeSubs.filter((s) => {
        if (!s.renewalDate) return false
        const diff = new Date(s.renewalDate).getTime() - nowTimestamp
        return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000
      }).length
    : 0

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="My Subscriptions"
        description="Comprehensive portfolio of active consumer plans and developer accounts with live usage."
        action={
          <button
            onClick={() => {
              setEditingSub(null)
              setIsFormOpen(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Subscription
          </button>
        }
      />

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Active Subscriptions</p>
            <p className="text-xl font-bold text-zinc-100">{activeSubs.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <Layers className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Monthly Committed Spend</p>
            <p className="text-xl font-bold text-zinc-100">
              {formatCurrency(totalMonthlySpend, "INR")}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Renewals in 14 Days</p>
            <p className="text-xl font-bold text-zinc-100">{expiringSoonCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </GlassCard>
      </div>

      {/* Filter and View Bar */}
      <div className="glass rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 border border-white/[0.06]">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search provider, plan or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-violet-500/40"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500/40"
          >
            <option value="all" className="bg-[#18181b]">All Statuses</option>
            <option value="active" className="bg-[#18181b]">Active</option>
            <option value="paused" className="bg-[#18181b]">Paused</option>
            <option value="trial" className="bg-[#18181b]">Trial</option>
            <option value="cancelled" className="bg-[#18181b]">Cancelled</option>
          </select>

          {/* Provider */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500/40"
          >
            <option value="all" className="bg-[#18181b]">All Providers</option>
            {PROVIDER_LIST.map((p) => (
              <option key={p.slug} value={p.slug} className="bg-[#18181b]">
                {p.name}
              </option>
            ))}
          </select>

          {/* Category */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500/40"
          >
            <option value="all" className="bg-[#18181b]">All Categories</option>
            <option value="consumer" className="bg-[#18181b]">Consumer Subscriptions</option>
            <option value="api" className="bg-[#18181b]">Developer API Accounts</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-violet-600/30 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-violet-600/30 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No subscriptions found"
          description={
            searchQuery || statusFilter !== "all"
              ? "No AI services match your selected filters. Try clearing filters or searching for another provider."
              : "Start monitoring your AI stack by connecting your first subscription or API account."
          }
          actionLabel="Add Subscription"
          onAction={() => {
            setEditingSub(null)
            setIsFormOpen(true)
          }}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      )}

      {/* Modals */}
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
