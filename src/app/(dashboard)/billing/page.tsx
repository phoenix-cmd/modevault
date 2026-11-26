"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import { Check, Download, Plus, Receipt, Trash2, X } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type { BillingRecordData, BillingSummaryData } from "@/lib/types"
import { useModalA11y } from "@/lib/use-modal-a11y"

type BillingRow = BillingRecordData & {
  status?: string
  paymentMethod?: string | null
  notes?: string | null
  subscription?: (NonNullable<BillingRecordData["subscription"]> & { planName?: string }) | null
}

const TYPE_LABEL: Record<string, string> = {
  subscription_payment: "Subscription",
  api_topup: "API top-up",
  refund: "Refund",
}

const TYPE_STYLE: Record<string, string> = {
  subscription_payment: "bg-accent-soft text-accent",
  api_topup: "bg-success-soft text-success",
  refund: "bg-warning-soft text-warning",
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<BillingRow[]>([])
  const [summary, setSummary] = useState<
    (BillingSummaryData & { recent?: BillingRow[] }) | null
  >(null)
  const [subscriptions, setSubscriptions] = useState<
    Array<{ id: string; planName: string; providerName: string }>
  >([])
  const [modalOpen, setModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState("all")

  const modalRef = useModalA11y(modalOpen, () => setModalOpen(false))

  // Form
  const [subId, setSubId] = useState("")
  const [amount, setAmount] = useState(20)
  const [currency, setCurrency] = useState("USD")
  const [type, setType] = useState("subscription_payment")
  const [status, setStatus] = useState("paid")
  const [method, setMethod] = useState("Credit Card")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState<string>("")

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0])
    setCurrentYear(String(new Date().getFullYear()))
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [summaryRes, recordsRes, subsRes] = await Promise.all([
        fetch("/api/billing/summary"),
        fetch("/api/billing?limit=100"),
        fetch("/api/subscriptions"),
      ])
      const [summaryJson, recordsJson, subsJson] = await Promise.all([
        summaryRes.json(),
        recordsRes.json(),
        subsRes.json(),
      ])

      if (summaryJson.data) setSummary(summaryJson.data)
      if (recordsJson.data) setRecords(recordsJson.data)

      const subs = (subsJson.data || []).map(
        (s: {
          id: string
          planName?: string
          customPlanName?: string | null
          plan?: { name?: string | null } | null
          provider?: { name: string }
          providerName?: string
        }) => ({
          id: s.id,
          planName: s.planName || s.customPlanName || s.plan?.name || "Standard Plan",
          providerName: s.provider?.name || s.providerName || "Provider",
        })
      )
      setSubscriptions(subs)
      if (subs.length > 0) setSubId((prev) => prev || subs[0].id)
    } catch (err) {
      console.error("Failed to fetch billing", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subId || null,
          amount,
          currency,
          type,
          status,
          paymentMethod: method,
          billingDate: date,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add record")
      }
      setModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch("/api/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "paid" }),
      })
      if (res.ok) await fetchData()
    } catch (err) {
      console.error("Failed to update billing status", err)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/billing?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (res.ok) await fetchData()
    } catch (err) {
      console.error("Failed to delete billing record", err)
    }
  }

  const handleExport = () => {
    const escapeCsv = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const rows = [
      ["Date", "Provider", "Plan", "Type", "Amount", "Currency", "Status", "Method"],
      ...records.map((r) => [
        r.billingDate,
        r.subscription?.provider?.name || "",
        r.subscription?.planName || (r.subscription as { customPlanName?: string } | null)?.customPlanName || "",
        r.type,
        r.amount.toString(),
        r.currency,
        r.status,
        r.paymentMethod || "",
      ]),
    ]
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `billing-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered =
    typeFilter === "all" ? records : records.filter((r) => r.type === typeFilter)

  const metrics = [
    {
      label: "Spent this month",
      value: formatCurrency(summary?.totalSpentCurrentMonth || 0, "USD"),
      meta: "Across all services",
      accent: true,
    },
    {
      label: "Year to date",
      value: formatCurrency(summary?.totalSpentCurrentYear || 0, "USD"),
      meta: `${currentYear || "Year"} total`,
    },
    {
      label: "All time",
      value: formatCurrency(summary?.totalSpentAllTime || 0, "USD"),
      meta: "Recorded payments",
    },
    {
      label: "Transactions",
      value: String(records.length),
      meta: `${filtered.length} shown`,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Finance · Ledger"
        title="Billing"
        description="Payment history, subscription invoices, and developer credit top-ups across your AI accounts."
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary btn-sm">
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Export CSV
            </button>
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Add record
            </button>
          </div>
        }
      />

      {loading || !summary ? <StatBandSkeleton columns={4} /> : <StatBand items={metrics} columns={4} />}

      <section className="border-t border-line pt-5">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Transactions</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">All recorded payments and refunds.</p>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select select-sm w-full sm:w-auto"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="subscription_payment">Subscription payments</option>
            <option value="api_topup">API top-ups</option>
            <option value="refund">Refunds</option>
          </select>
        </div>

        {loading ? (
          <div className="border-b border-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton h-3.5 w-20" />
                <div className="skeleton h-3.5 w-32" />
                <div className="skeleton h-4 w-16" />
                <div className="ml-auto skeleton h-3.5 w-14" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-b border-line py-12">
            <p className="text-[13px] font-medium text-ink">No billing records</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {typeFilter === "all"
                ? "Payments and top-ups will appear here as they are recorded."
                : "No records match the selected filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <caption className="sr-only">Billing ledger of subscription payments, top-ups, and refunds</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className="hidden lg:table-cell">Method</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => {
                    const resolvedPlanName =
                      record.subscription?.planName ||
                      (record.subscription as { customPlanName?: string } | null)?.customPlanName ||
                      "Standard Plan"
                    return (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-3 tabular-nums">
                          {formatDate(record.billingDate)}
                        </td>
                        <td>
                          <p className="text-[12.5px] font-medium text-ink">
                            {record.subscription
                              ? `${record.subscription.provider?.name || ""} — ${resolvedPlanName}`
                              : record.type === "api_topup"
                                ? "API credit top-up"
                                : "Payment"}
                          </p>
                          {record.notes && <p className="text-[10.5px] text-ink-3">{record.notes}</p>}
                        </td>
                        <td>
                          <span className={cn("badge", TYPE_STYLE[record.type] || "bg-surface-2 text-ink-3")}>
                            {TYPE_LABEL[record.type] || record.type}
                          </span>
                        </td>
                        <td className="hidden text-[12px] text-ink-2 lg:table-cell">{record.paymentMethod || "—"}</td>
                        <td>
                          <span
                            className={cn(
                              "badge",
                              record.status === "paid"
                                ? "bg-success-soft text-success"
                                : record.status === "failed"
                                  ? "bg-danger-soft text-danger"
                                  : "bg-surface-2 text-ink-3"
                            )}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="text-right font-mono text-[12px] font-medium text-ink tabular-nums">
                          {formatCurrency(record.amount, record.currency)}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {record.status !== "paid" && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(record.id)}
                                className="btn-ghost btn-sm text-success"
                                title="Mark as paid"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Mark paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(record.id)}
                              className="icon-btn hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                              title="Delete transaction"
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line md:hidden">
              {filtered.map((record) => (
                <div key={record.id} className="border-b border-line py-3.5 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {record.subscription
                          ? `${record.subscription.provider?.name || ""} — ${record.subscription.planName}`
                          : record.type === "api_topup"
                            ? "API credit top-up"
                            : "Payment"}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-ink-3">
                        {formatDate(record.billingDate)}
                        {record.paymentMethod ? ` · ${record.paymentMethod}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] font-medium text-ink tabular-nums">
                      {formatCurrency(record.amount, record.currency)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className={cn("badge", TYPE_STYLE[record.type] || "bg-surface-2 text-ink-3")}>
                      {TYPE_LABEL[record.type] || record.type}
                    </span>
                    <span
                      className={cn(
                        "badge",
                        record.status === "paid"
                          ? "bg-success-soft text-success"
                          : record.status === "failed"
                            ? "bg-danger-soft text-danger"
                            : "bg-surface-2 text-ink-3"
                      )}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-modal-title"
            className="panel relative max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Ledger</p>
                <h2 id="billing-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  Add billing record
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Manually record a payment, top-up, or refund.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-5 py-4">
                {error && (
                  <div className="border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{error}</div>
                )}

                <div>
                  <label className="label">Linked subscription (optional)</label>
                  <select value={subId} onChange={(e) => setSubId(e.target.value)} className="select">
                    <option value="">None — standalone record</option>
                    {subscriptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.providerName} — {s.planName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Amount</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="field tnum"
                    />
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select">
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className="select">
                      <option value="subscription_payment">Subscription payment</option>
                      <option value="api_topup">API top-up</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Payment method</label>
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      placeholder="Credit Card, UPI…"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  <Receipt className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {submitting ? "Saving…" : "Add record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
