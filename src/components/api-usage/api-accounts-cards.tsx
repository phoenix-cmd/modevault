"use client"

import { Key } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency } from "@/lib/utils"
import type { ApiAccountData } from "@/lib/types"

interface ApiAccountsCardsProps {
  accounts: ApiAccountData[]
  onAddLog: (accountId: string) => void
}

export function ApiAccountsCards({ accounts, onAddLog }: ApiAccountsCardsProps) {
  if (accounts.length === 0) {
    return (
      <section className="panel px-5 py-10 text-center">
        <p className="text-[13px] font-medium text-ink">No developer accounts</p>
        <p className="mt-1 text-[12px] text-ink-3">
          Developer accounts appear here once created in the dashboard data.
        </p>
      </section>
    )
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Developer accounts</h2>
          <p className="panel-subtitle">
            Prepaid balances and credit consumption per account
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Status</th>
              <th className="text-right">Prepaid balance</th>
              <th className="text-right">Total spent</th>
              <th className="text-right">Rate limit</th>
              <th>Last sync</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <ProviderIcon slug={acc.providerSlug} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {acc.accountName || acc.providerName}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-ink-3">
                        <Key className="h-2.5 w-2.5" strokeWidth={2} />
                        <span className="tnum">
                          ••••{acc.apiKeyLastFour || "key"}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusBadge status={acc.integrationStatus} />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono text-[12px] font-medium text-ink tabular-nums">
                      {formatCurrency(acc.prepaidBalance, acc.currency)}
                    </span>
                    {acc.prepaidBalance < 20 && (
                      <span className="badge bg-warning-soft text-warning">
                        Low
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right font-mono text-[11.5px] text-ink-2 tabular-nums">
                  {formatCurrency(acc.totalSpent, acc.currency)}
                </td>
                <td className="text-right font-mono text-[11.5px] text-ink-2 tabular-nums">
                  {acc.rateLimit ? `${acc.rateLimit} RPM` : "Default"}
                </td>
                <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-3">
                  {acc.lastSyncAt
                    ? new Date(acc.lastSyncAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Manual"}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => onAddLog(acc.id)}
                    className="btn-ghost btn-sm"
                  >
                    Log usage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="row-divide md:hidden">
        {accounts.map((acc) => (
          <div key={acc.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <ProviderIcon slug={acc.providerSlug} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {acc.accountName || acc.providerName}
                  </p>
                  <p className="text-[11px] text-ink-3 tnum">
                    ••••{acc.apiKeyLastFour || "key"}
                  </p>
                </div>
              </div>
              <StatusBadge status={acc.integrationStatus} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="metric-label">Prepaid balance</p>
                <p className="mt-1 font-mono text-[12px] font-medium text-ink tabular-nums">
                  {formatCurrency(acc.prepaidBalance, acc.currency)}
                </p>
              </div>
              <div>
                <p className="metric-label">Total spent</p>
                <p className="mt-1 font-mono text-[12px] font-medium text-ink tabular-nums">
                  {formatCurrency(acc.totalSpent, acc.currency)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-ink-3">
                {acc.rateLimit ? `${acc.rateLimit} RPM` : "Default rate limit"}
              </span>
              <button
                onClick={() => onAddLog(acc.id)}
                className="btn-ghost btn-sm"
              >
                Log usage
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
