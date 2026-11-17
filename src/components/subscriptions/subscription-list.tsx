"use client"

import {
  MoreVertical,
  Edit2,
  Trash2,
  Gauge,
  ArrowUpDown,
} from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { UsageBar } from "@/components/ui/usage-bar"
import { cn, formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"
import type { SubscriptionData } from "@/lib/types"

interface SubscriptionListProps {
  subscriptions: SubscriptionData[]
  onEdit: (sub: SubscriptionData) => void
  onDelete: (id: string) => void
  onRecordUsage: (sub: SubscriptionData) => void
}

export function SubscriptionList({
  subscriptions,
  onEdit,
  onDelete,
  onRecordUsage,
}: SubscriptionListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] glass">
      <table className="w-full text-left text-sm text-zinc-300">
        <thead className="border-b border-white/[0.06] bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-6 py-4 font-medium">Provider & Plan</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Price</th>
            <th className="px-6 py-4 font-medium min-w-[200px]">Quota Utilization</th>
            <th className="px-6 py-4 font-medium">Next Renewal</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {subscriptions.map((sub) => {
            let used = 0
            let quota: number | null = null
            let unit = "units"

            if (sub.quotaMessages) {
              used = sub.usedMessages
              quota = sub.quotaMessages
              unit = "msgs"
            } else if (sub.quotaRequests) {
              used = sub.usedRequests
              quota = sub.quotaRequests
              unit = "reqs"
            } else if (sub.quotaTokens) {
              used = sub.usedTokens
              quota = sub.quotaTokens
              unit = "tokens"
            } else if (sub.quotaCredits) {
              used = sub.usedCredits
              quota = sub.quotaCredits
              unit = "credits"
            }

            return (
              <tr
                key={sub.id}
                className="group transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ProviderIcon
                      slug={sub.providerSlug}
                      name={sub.providerName}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium text-zinc-100">
                        {sub.providerName}
                      </div>
                      <div className="text-xs text-zinc-500">{sub.planName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={sub.status} pulse={sub.status === "active"} />
                </td>
                <td className="px-6 py-4 font-medium text-zinc-100">
                  {formatCurrency(sub.price, sub.currency)}
                  <span className="text-xs font-normal text-zinc-500">
                    {" "}/ {sub.billingCycle}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <UsageBar used={used} quota={quota} unit={unit} />
                </td>
                <td className="px-6 py-4 text-xs text-zinc-400">
                  <div>
                    {sub.renewalDate ? formatRelativeDate(sub.renewalDate) : "—"}
                  </div>
                  {sub.renewalDate && (
                    <div className="text-[11px] text-zinc-600">
                      {formatDate(sub.renewalDate)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onRecordUsage(sub)}
                      title="Record Usage"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-violet-500/20 hover:text-violet-300 transition-colors"
                    >
                      <Gauge className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(sub)}
                      title="Edit"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(sub.id)}
                      title="Delete"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
