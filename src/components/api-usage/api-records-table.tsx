"use client"

import { useState } from "react"
import { Search, Database, ArrowUpDown } from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"

interface ApiRecord {
  id: string
  date: string
  model: string | null
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
  cost: number
  currency: string
  requestCount: number
  dataSource: string
  apiAccount?: {
    provider: {
      name: string
      slug: string
    }
  }
}

interface ApiRecordsTableProps {
  records: ApiRecord[]
}

export function ApiRecordsTable({ records }: ApiRecordsTableProps) {
  const [search, setSearch] = useState("")

  const filtered = records.filter((r) => {
    const model = (r.model || "").toLowerCase()
    const prov = (r.apiAccount?.provider?.name || "").toLowerCase()
    return model.includes(search.toLowerCase()) || prov.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-zinc-100">
          Raw Consumption Logs
        </h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by model or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-violet-500/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06] glass">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] uppercase tracking-wider text-[11px] text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Provider & Model</th>
              <th className="px-5 py-3 font-medium text-right">Input Tokens</th>
              <th className="px-5 py-3 font-medium text-right">Output Tokens</th>
              <th className="px-5 py-3 font-medium text-right">Cached</th>
              <th className="px-5 py-3 font-medium text-right">Total Tokens</th>
              <th className="px-5 py-3 font-medium text-right">Cost</th>
              <th className="px-5 py-3 font-medium text-right">Requests</th>
              <th className="px-5 py-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filtered.slice(0, 50).map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2.5 text-zinc-400 font-mono text-[11px]">
                  {formatDate(r.date)}
                </td>
                <td className="px-5 py-2.5">
                  <div className="font-semibold text-zinc-200 font-mono">
                    {r.model}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {r.apiAccount?.provider?.name || "Provider"}
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-zinc-400">
                  {formatNumber(r.inputTokens)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-zinc-400">
                  {formatNumber(r.outputTokens)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-zinc-500">
                  {r.cachedTokens > 0 ? formatNumber(r.cachedTokens) : "—"}
                </td>
                <td className="px-5 py-2.5 text-right font-mono font-medium text-zinc-100">
                  {formatNumber(r.totalTokens)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono font-semibold text-emerald-400">
                  ${r.cost.toFixed(4)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-zinc-400">
                  {r.requestCount}
                </td>
                <td className="px-5 py-2.5">
                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] capitalize text-zinc-400">
                    {r.dataSource.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
