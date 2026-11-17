"use client"

import { Wallet, Activity, Key, ShieldCheck, AlertCircle } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { ApiAccountData } from "@/lib/types"

interface ApiAccountsCardsProps {
  accounts: ApiAccountData[]
  onAddLog: (accountId: string) => void
}

export function ApiAccountsCards({ accounts, onAddLog }: ApiAccountsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {accounts.map((acc) => (
        <GlassCard
          key={acc.id}
          className="relative flex flex-col justify-between p-5 hover:border-violet-500/30 transition-all duration-300"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ProviderIcon
                  slug={acc.providerSlug}
                  name={acc.providerName}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">
                    {acc.accountName || acc.providerName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Key className="h-3 w-3 text-zinc-500" />
                    <span className="text-[11px] font-mono text-zinc-500">
                      ••••{acc.apiKeyLastFour || "key"}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={acc.integrationStatus} />
            </div>

            {/* Prepaid Balance */}
            <div className="mt-5 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Prepaid Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-zinc-100">
                  {formatCurrency(acc.prepaidBalance, acc.currency)}
                </span>
                {acc.prepaidBalance < 20 && (
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Low Balance
                  </span>
                )}
              </div>
            </div>

            {/* Rate Limits & Total Spent */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.04] pt-3 text-xs">
              <div>
                <p className="text-[11px] text-zinc-500">Total Spent</p>
                <p className="font-semibold text-zinc-300">
                  {formatCurrency(acc.totalSpent, acc.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">Rate Limit</p>
                <p className="font-mono text-zinc-300">
                  {acc.rateLimit ? `${acc.rateLimit} RPM` : "Default Tier"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">
              {acc.lastSyncAt ? `Synced ${acc.lastSyncAt.split("T")[0]}` : "Manual logging"}
            </span>
            <button
              onClick={() => onAddLog(acc.id)}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Log Usage
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
