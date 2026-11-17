"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Gauge,
  Clock,
  ExternalLink,
} from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { UsageBar } from "@/components/ui/usage-bar"
import { GlassCard } from "@/components/ui/glass-card"
import { cn, formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils"
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

  // Primary metric calculation
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
    <GlassCard className="relative flex flex-col justify-between overflow-visible transition-all duration-300 hover:border-violet-500/30">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProviderIcon
              slug={sub.providerSlug}
              name={sub.providerName}
              size="md"
            />
            <div>
              <h3 className="font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                {sub.providerName}
              </h3>
              <p className="text-xs text-zinc-400">{sub.planName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={sub.status} pulse={sub.status === "active"} />

            {/* Action menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl glass-elevated border border-white/[0.08] p-1 shadow-2xl">
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onRecordUsage(sub)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-violet-500/20 hover:text-violet-200 transition-colors"
                    >
                      <Gauge className="h-3.5 w-3.5" />
                      Record Usage
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onEdit(sub)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Subscription
                    </button>
                    <div className="my-1 border-t border-white/[0.06]" />
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onDelete(sub.id)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel / Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Price & Billing Cycle */}
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-zinc-100">
            {formatCurrency(sub.price, sub.currency)}
          </span>
          <span className="text-xs text-zinc-500">
            / {sub.billingCycle}
          </span>
        </div>

        {/* Quota Progress */}
        <div className="mt-5">
          <UsageBar used={used} quota={quota} unit={unit} />
        </div>
      </div>

      {/* Card Footer: Metadata */}
      <div className="mt-6 border-t border-white/[0.04] pt-4 space-y-2 text-xs text-zinc-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            Next Renewal
          </span>
          <span className="font-medium text-zinc-300">
            {sub.renewalDate ? formatRelativeDate(sub.renewalDate) : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Source</span>
          <span className="capitalize text-zinc-400 font-mono text-[11px]">
            {sub.dataSource.replace("_", " ")}
          </span>
        </div>
      </div>
    </GlassCard>
  )
}
