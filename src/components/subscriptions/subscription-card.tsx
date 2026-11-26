"use client"

import { useState } from "react"
import { Edit2, Gauge, MoreVertical, Trash2 } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { UsageBar } from "@/components/ui/usage-bar"
import {
  formatCurrency,
  formatRelativeDate,
  getMonthlyEquivalent,
  getPrimaryUsage,
} from "@/lib/utils"
import type { SubscriptionData } from "@/lib/types"

interface SubscriptionCardProps {
  subscription: SubscriptionData
  onEdit: (sub: SubscriptionData) => void
  onDelete: (id: string) => void
  onRecordUsage: (sub: SubscriptionData) => void
}

export function SubscriptionCard({
  subscription: sub,
  onEdit,
  onDelete,
  onRecordUsage,
}: SubscriptionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const usage = getPrimaryUsage(sub)
  const monthly = getMonthlyEquivalent(sub.price, sub.billingCycle)

  return (
    <div className="relative flex flex-col border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProviderIcon slug={sub.providerSlug} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">
              {sub.providerName}
            </p>
            <p className="truncate text-[11.5px] text-ink-3">{sub.planName}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={sub.status} pulse={sub.status === "active"} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="icon-btn"
              aria-label="Subscription actions"
              aria-expanded={menuOpen}
              aria-controls={`sub-actions-menu-${sub.id}`}
            >
              <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>

            <div id={`sub-actions-menu-${sub.id}`}>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="glass-panel absolute right-0 top-full z-30 mt-1 w-48 rounded-[2px] p-1 shadow-float">
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onRecordUsage(sub)
                      }}
                      className="flex min-h-[40px] w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Gauge className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Record usage
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onEdit(sub)
                      }}
                      className="flex min-h-[40px] w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Edit subscription
                    </button>
                    <div className="my-1 border-t border-line" />
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onDelete(sub.id)
                      }}
                      className="flex min-h-[40px] w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-[12px] text-danger transition-colors hover:bg-danger-soft"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-medium tracking-[-0.045em] text-ink tabular-nums">
          {formatCurrency(monthly, sub.currency)}
        </span>
        <span className="font-mono text-[10px] text-ink-3">
          /mo
          {sub.billingCycle !== "monthly" &&
            ` · billed ${sub.billingCycle}`}
        </span>
      </div>

      <div className="mt-5">
        {usage ? (
          <UsageBar
            used={usage.used}
            quota={usage.quota}
            unit={usage.unit}
          />
        ) : (
          <p className="font-mono text-[10.5px] text-ink-3">
            No usage quota configured
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-line pt-3">
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-3">
            Next renewal
          </span>
          <span className="text-[11.5px] font-medium text-ink-2">
            {sub.renewalDate ? formatRelativeDate(sub.renewalDate) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-3">
            Source
          </span>
          <span className="text-[11.5px] capitalize text-ink-2">
            {sub.dataSource.replace("_", " ")}
          </span>
        </div>
      </div>
    </div>
  )
}
