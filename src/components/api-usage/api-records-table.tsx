"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import type { ApiUsageRecordData } from "@/lib/types"

interface ApiRecordsTableProps {
  records: ApiUsageRecordData[]
}

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

function formatCost(cost: number, currency: string | undefined) {
  const c = (currency || "USD").toUpperCase()
  const symbol = c === "INR" ? "₹" : c === "EUR" ? "€" : c === "GBP" ? "£" : "$"
  return `${symbol}${cost.toFixed(4)}`
}

export function ApiRecordsTable({ records }: ApiRecordsTableProps) {
  const [search, setSearch] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [range, setRange] = useState("30")
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // Resolve the current time after hydration so prerendering stays stable.
    const frame = requestAnimationFrame(() => setNow(Date.now()))
    return () => cancelAnimationFrame(frame)
  }, [])

  const providers = useMemo(() => {
    const map = new Map<string, string>()
    records.forEach((record) => {
      const provider = record.apiAccount?.provider
      if (provider?.slug) map.set(provider.slug, provider.name)
    })
    return Array.from(map.entries())
  }, [records])

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    const cutoff =
      range === "all" || now === null
        ? null
        : now - Number(range) * 24 * 60 * 60 * 1000

    return records.filter((record) => {
      const model = (record.model || "").toLowerCase()
      const providerName = (
        record.apiAccount?.provider?.name || ""
      ).toLowerCase()
      const providerSlug = record.apiAccount?.provider?.slug || ""

      const matchesSearch =
        model.includes(query) || providerName.includes(query)
      const matchesProvider =
        providerFilter === "all" || providerSlug === providerFilter
      const matchesRange =
        cutoff === null || new Date(record.date).getTime() >= cutoff

      return matchesSearch && matchesProvider && matchesRange
    })
  }, [records, search, providerFilter, range, now])

  const visible = filtered.slice(0, 50)

  return (
    <section className="border-t border-line pt-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Usage log</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            {filtered.length} record{filtered.length === 1 ? "" : "s"} in range
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={2} />
            <input
              type="text"
              placeholder="Filter by model or provider…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field field-sm w-full pl-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="select select-sm w-full sm:w-auto" aria-label="Filter by provider">
              <option value="all">All providers</option>
              {providers.map(([slug, name]) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>

            <select value={range} onChange={(e) => setRange(e.target.value)} className="select select-sm w-full sm:w-auto" aria-label="Filter by date range">
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border-b border-line py-12">
          <p className="text-[13px] font-medium text-ink">No records found</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Try widening the date range or clearing filters.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Provider / model</th>
                  <th className="hidden text-right xl:table-cell">Input</th>
                  <th className="hidden text-right xl:table-cell">Output</th>
                  <th className="hidden text-right xl:table-cell">Cached</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Requests</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-3 tabular-nums">{formatDate(record.date)}</td>
                    <td>
                      <p className="font-mono text-[11.5px] text-ink">{record.model || "—"}</p>
                      <p className="text-[10.5px] text-ink-3">{record.apiAccount?.provider?.name || "Provider"}</p>
                    </td>
                    <td className="hidden text-right font-mono text-[11px] text-ink-2 tabular-nums xl:table-cell">{formatNumber(record.inputTokens)}</td>
                    <td className="hidden text-right font-mono text-[11px] text-ink-2 tabular-nums xl:table-cell">{formatNumber(record.outputTokens)}</td>
                    <td className="hidden text-right font-mono text-[11px] text-ink-3 tabular-nums xl:table-cell">{record.cachedTokens > 0 ? formatNumber(record.cachedTokens) : "—"}</td>
                    <td className="text-right font-mono text-[11px] font-medium text-ink tabular-nums">{formatNumber(record.totalTokens)}</td>
                    <td className="text-right font-mono text-[11px] text-ink tabular-nums">{formatCost(record.cost, record.currency)}</td>
                    <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">{record.requestCount}</td>
                    <td><span className="badge bg-surface-2 text-ink-3">{record.dataSource.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line md:hidden">
            {visible.map((record) => (
              <div key={record.id} className="border-b border-line py-3.5 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12px] text-ink">{record.model || "—"}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {record.apiAccount?.provider?.name || "Provider"} · {formatDate(record.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-mono text-[12px] font-medium text-ink tabular-nums">
                      {formatCost(record.cost, record.currency)}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 tabular-nums">
                      {formatNumber(record.totalTokens)} tok
                    </span>
                  </div>
                </div>

                <details className="mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 select-none">
                    <span>Token breakdown &amp; source</span>
                    <span className="badge bg-surface-2 text-ink-3">{record.dataSource.replace("_", " ")}</span>
                  </summary>
                  <div className="mt-2 grid grid-cols-4 gap-2 border-t border-line/70 pt-2 font-mono text-[10.5px] text-ink-3 tabular-nums">
                    <div>
                      <span className="block text-[9px] uppercase">In</span>
                      <span className="text-ink-2">{formatNumber(record.inputTokens)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase">Out</span>
                      <span className="text-ink-2">{formatNumber(record.outputTokens)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase">Cached</span>
                      <span className="text-ink-2">{record.cachedTokens > 0 ? formatNumber(record.cachedTokens) : "—"}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] uppercase">Req</span>
                      <span className="text-ink-2">{record.requestCount}</span>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>

          {filtered.length > visible.length && (
            <div className="border-b border-line py-2.5 text-center text-[11px] text-ink-3">
              Showing {visible.length} of {filtered.length} records — refine filters to narrow results.
            </div>
          )}
        </>
      )}
    </section>
  )
}
