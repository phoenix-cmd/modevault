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
  const symbol = (currency || "USD") === "INR" ? "₹" : "$"
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
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="panel-title">Usage log</h2>
          <p className="panel-subtitle">
            {filtered.length} record{filtered.length === 1 ? "" : "s"} in range
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:flex-none">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Filter by model or provider…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field field-sm pl-8 sm:w-56"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="select select-sm w-auto"
            aria-label="Filter by provider"
          >
            <option value="all">All providers</option>
            {providers.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="select select-sm w-auto"
            aria-label="Filter by date range"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[13px] font-medium text-ink">No records found</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Try widening the date range or clearing filters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Provider / model</th>
                  <th className="text-right">Input</th>
                  <th className="text-right">Output</th>
                  <th className="text-right">Cached</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Requests</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-3 tabular-nums">
                      {formatDate(record.date)}
                    </td>
                    <td>
                      <p className="font-mono text-[11.5px] text-ink">
                        {record.model || "—"}
                      </p>
                      <p className="text-[10.5px] text-ink-3">
                        {record.apiAccount?.provider?.name || "Provider"}
                      </p>
                    </td>
                    <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">
                      {formatNumber(record.inputTokens)}
                    </td>
                    <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">
                      {formatNumber(record.outputTokens)}
                    </td>
                    <td className="text-right font-mono text-[11px] text-ink-3 tabular-nums">
                      {record.cachedTokens > 0
                        ? formatNumber(record.cachedTokens)
                        : "—"}
                    </td>
                    <td className="text-right font-mono text-[11px] font-medium text-ink tabular-nums">
                      {formatNumber(record.totalTokens)}
                    </td>
                    <td className="text-right font-mono text-[11px] text-ink tabular-nums">
                      {formatCost(record.cost, record.currency)}
                    </td>
                    <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">
                      {record.requestCount}
                    </td>
                    <td>
                      <span className="badge bg-surface-2 text-ink-3">
                        {record.dataSource.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="row-divide md:hidden">
            {visible.map((record) => (
              <div key={record.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11.5px] text-ink">
                      {record.model || "—"}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-ink-3">
                      {record.apiAccount?.provider?.name || "Provider"} ·{" "}
                      {formatDate(record.date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11.5px] font-medium text-ink tabular-nums">
                    {formatCost(record.cost, record.currency)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-3 tabular-nums">
                  <span>
                    Total <span className="text-ink-2">{formatNumber(record.totalTokens)}</span>
                  </span>
                  <span>
                    In <span className="text-ink-2">{formatNumber(record.inputTokens)}</span>
                  </span>
                  <span>
                    Out <span className="text-ink-2">{formatNumber(record.outputTokens)}</span>
                  </span>
                  <span>
                    Req <span className="text-ink-2">{record.requestCount}</span>
                  </span>
                  <span className="badge ml-auto bg-surface-2 text-ink-3">
                    {record.dataSource.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length > visible.length && (
            <div className="border-t border-line px-4 py-2.5 text-center text-[11px] text-ink-3">
              Showing {visible.length} of {filtered.length} records — refine
              filters to narrow results.
            </div>
          )}
        </>
      )}
    </section>
  )
}
