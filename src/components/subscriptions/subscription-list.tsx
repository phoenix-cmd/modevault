"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit2,
  Gauge,
  Trash2,
} from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDate,
  getMonthlyEquivalent,
  getPrimaryUsage,
  getUsagePercentage,
} from "@/lib/utils"
import type { SubscriptionData } from "@/lib/types"

type SortKey = "provider" | "monthly" | "renewal" | "usage"
type SortDir = "asc" | "desc"

interface SubscriptionListProps {
  subscriptions: SubscriptionData[]
  onEdit: (sub: SubscriptionData) => void
  onDelete: (id: string) => void
  onRecordUsage: (sub: SubscriptionData) => void
}

function usagePercent(sub: SubscriptionData) {
  const usage = getPrimaryUsage(sub)
  return usage ? getUsagePercentage(usage.used, usage.quota) : 0
}

function sortValue(sub: SubscriptionData, key: SortKey) {
  switch (key) {
    case "provider":
      return sub.providerName.toLowerCase()
    case "monthly":
      return getMonthlyEquivalent(sub.price, sub.billingCycle)
    case "renewal":
      return sub.renewalDate
        ? new Date(sub.renewalDate).getTime()
        : Number.MAX_SAFE_INTEGER
    case "usage":
      return usagePercent(sub)
  }
}

function UsageRemaining({
  subscription,
  fullWidth,
}: {
  subscription: SubscriptionData
  fullWidth?: boolean
}) {
  const usage = getPrimaryUsage(subscription)

  if (!usage) {
    return <span className="text-[11.5px] text-ink-3">Unmetered</span>
  }

  const usedPct = getUsagePercentage(usage.used, usage.quota)
  const remaining = Math.max(100 - usedPct, 0)

  return (
    <div className={fullWidth ? "w-full" : "w-[150px]"}>
      <div className="flex items-center justify-between gap-2 font-mono text-[10.5px]">
        <span
          className={cn(
            "font-medium tabular-nums",
            remaining <= 10
              ? "text-danger"
              : remaining <= 25
                ? "text-warning"
                : "text-ink-2"
          )}
        >
          {remaining}% left
        </span>
        <span className="tabular-nums text-ink-3">
          {formatNumber(usage.used)} / {formatNumber(usage.quota)}
        </span>
      </div>
      <div className="mt-2 h-px w-full bg-surface-3">
        <div
          className={cn(
            "h-px",
            remaining <= 10
              ? "bg-danger"
              : remaining <= 25
                ? "bg-warning"
                : "bg-success"
          )}
          style={{ width: `${remaining}%` }}
        />
      </div>
    </div>
  )
}

function SortHeader({
  label,
  column,
  align = "left",
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  column: SortKey
  align?: "left" | "right"
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === column
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={align === "right" ? "text-right" : undefined}>
      <button
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors hover:text-ink",
          active && "text-ink-2"
        )}
      >
        {label}
        <Icon className="h-3 w-3" strokeWidth={2} />
      </button>
    </th>
  )
}

function Actions({
  subscription,
  onEdit,
  onDelete,
  onRecordUsage,
}: {
  subscription: SubscriptionData
  onEdit: (sub: SubscriptionData) => void
  onDelete: (id: string) => void
  onRecordUsage: (sub: SubscriptionData) => void
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        onClick={() => onRecordUsage(subscription)}
        title="Record usage"
        aria-label={`Record usage for ${subscription.planName}`}
        className="icon-btn"
      >
        <Gauge className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onEdit(subscription)}
        title="Edit subscription"
        aria-label={`Edit ${subscription.planName}`}
        className="icon-btn"
      >
        <Edit2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onDelete(subscription.id)}
        title="Delete subscription"
        aria-label={`Delete ${subscription.planName}`}
        className="icon-btn hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  )
}

export function SubscriptionList({
  subscriptions,
  onEdit,
  onDelete,
  onRecordUsage,
}: SubscriptionListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("provider")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const sorted = useMemo(() => {
    const list = [...subscriptions]
    list.sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      const diff =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv)
      return sortDir === "asc" ? diff : -diff
    })
    return list
  }, [subscriptions, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto border-t border-line md:block">
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader label="Provider" column="provider" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>Plan</th>
              <th className="hidden lg:table-cell">Billing</th>
              <SortHeader label="Monthly eq." column="monthly" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Usage remaining" column="usage" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="hidden xl:table-cell">
                <button
                  onClick={() => toggleSort("renewal")}
                  className={cn(
                    "inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors hover:text-ink",
                    sortKey === "renewal" && "text-ink-2"
                  )}
                >
                  Next renewal
                  <ArrowUpDown className="h-3 w-3" strokeWidth={2} />
                </button>
              </th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sub) => {
              const monthly = getMonthlyEquivalent(sub.price, sub.billingCycle)
              return (
                <tr key={sub.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <ProviderIcon slug={sub.providerSlug} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{sub.providerName}</p>
                        <p className="text-[11px] capitalize text-ink-3">{sub.type} · {sub.dataSource.replace("_", " ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[180px]"><p className="truncate text-ink-2">{sub.planName}</p></td>
                  <td className="hidden whitespace-nowrap capitalize text-ink-2 lg:table-cell">{sub.billingCycle}</td>
                  <td className="whitespace-nowrap text-right">
                    <p className="font-mono text-[12px] text-ink tabular-nums">{formatCurrency(monthly, sub.currency)}</p>
                    {sub.billingCycle !== "monthly" && (
                      <p className="font-mono text-[10px] text-ink-3 tabular-nums">
                        {formatCurrency(sub.price, sub.currency)} / {sub.billingCycle === "yearly" ? "yr" : "cycle"}
                      </p>
                    )}
                  </td>
                  <td><UsageRemaining subscription={sub} /></td>
                  <td className="hidden whitespace-nowrap xl:table-cell">
                    {sub.renewalDate ? (
                      <>
                        <p className="text-ink-2">{formatRelativeDate(sub.renewalDate)}</p>
                        <p className="text-[11px] text-ink-3">{formatDate(sub.renewalDate)}</p>
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td><StatusBadge status={sub.status} pulse={sub.status === "active"} /></td>
                  <td><Actions subscription={sub} onEdit={onEdit} onDelete={onDelete} onRecordUsage={onRecordUsage} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line md:hidden">
        {sorted.map((sub) => {
          const monthly = getMonthlyEquivalent(sub.price, sub.billingCycle)
          return (
            <div key={sub.id} className="border-b border-line py-3.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProviderIcon slug={sub.providerSlug} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{sub.providerName}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{sub.planName}</p>
                  </div>
                </div>
                <StatusBadge status={sub.status} />
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[13px] font-medium text-ink tabular-nums">
                    {formatCurrency(monthly, sub.currency)}<span className="text-[10px] font-normal text-ink-3">/mo</span>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {sub.renewalDate ? `Renews ${formatRelativeDate(sub.renewalDate)}` : "No renewal set"}
                  </p>
                </div>
                <Actions subscription={sub} onEdit={onEdit} onDelete={onDelete} onRecordUsage={onRecordUsage} />
              </div>

              <div className="mt-3"><UsageRemaining subscription={sub} fullWidth /></div>

              <details className="mt-2.5">
                <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 select-none">
                  Billing &amp; source details
                </summary>
                <div className="mt-2 space-y-1 border-t border-line/70 pt-2 font-mono text-[10.5px] text-ink-3">
                  <div className="flex justify-between gap-3">
                    <span>Cycle</span>
                    <span className="capitalize text-ink-2">
                      {sub.billingCycle} ({formatCurrency(sub.price, sub.currency)})
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Renewal date</span>
                    <span className="text-ink-2">{sub.renewalDate ? formatDate(sub.renewalDate) : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Source / Category</span>
                    <span className="capitalize text-ink-2">
                      {sub.dataSource.replace("_", " ")} · {sub.type}
                    </span>
                  </div>
                  {sub.notes && <p className="pt-1 font-sans text-[11.5px] text-ink-2">{sub.notes}</p>}
                </div>
              </details>
            </div>
          )
        })}
      </div>
    </>
  )
}
