"use client"

/* eslint-disable react-hooks/set-state-in-effect -- session state is hydrated from the API on mount */

import { useEffect, useState } from "react"
import { Download, Plus, Receipt, X } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type { BillingRecordData, BillingSummaryData } from "@/lib/types"

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
  const [records, setRecords] = useState<BillingRecordData[]>([])
  const [summary, setSummary] = useState<BillingSummaryData | null>(null)
  const [filterType, setFilterType] = useState<string>("all")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [amount, setAmount] = useState(1700)
  const [type, setType] = useState("subscription_payment")
  const [desc, setDesc] = useState("Manual renewal entry")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0])
  }, [])

  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [recRes, sumRes] = await Promise.all([
        fetch("/api/billing"),
        fetch("/api/billing/summary"),
      ])
      const [recJson, sumJson] = await Promise.all([
        recRes.json(),
        sumRes.json(),
      ])
      if (recJson.data) setRecords(recJson.data)
      if (sumJson.data) setSummary(sumJson.data)
    } catch (err) {
      console.error("Failed to load billing:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type,
          description: desc,
          billingDate: date,
          currency: "INR",
        }),
      })
      if (res.ok) {
        setIsModalOpen(false)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = records.filter((r) => {
    if (filterType === "all") return true
    return r.type === filterType
  })

  const metrics = summary
    ? [
        {
          label: "Billed this month",
          value: formatCurrency(summary.totalSpentCurrentMonth, "INR"),
          meta: "Current calendar month",
        },
        {
          label: "Year to date",
          value: formatCurrency(summary.totalSpentCurrentYear, "INR"),
          meta: "January 1 — present",
        },
        {
          label: "All-time recorded",
          value: formatCurrency(summary.totalSpentAllTime, "INR"),
          meta: "Subscriptions and top-ups",
        },
      ]
    : []

  const typeBadge = (recordType: string) => (
    <span
      className={cn(
        "badge",
        TYPE_STYLE[recordType] || "bg-surface-2 text-ink-3"
      )}
    >
      {TYPE_LABEL[recordType] || recordType}
    </span>
  )

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Billing"
        description="Consolidated expense history, payment records and recurring subscription receipts."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Record payment
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel px-4 py-3.5">
              <div className="skeleton h-2.5 w-24" />
              <div className="skeleton mt-3 h-6 w-28" />
              <div className="skeleton mt-2 h-2.5 w-32" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map(({ label, value, meta }) => (
            <div key={label} className="panel px-4 py-3.5">
              <p className="metric-label">{label}</p>
              <p className="metric-value">{value}</p>
              <p className="metric-meta">{meta}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="panel-title">Transactions</h2>
            <p className="panel-subtitle">
              {filtered.length} payment record{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="select select-sm w-auto"
            aria-label="Filter transaction type"
          >
            <option value="all">All transaction types</option>
            <option value="subscription_payment">Subscription charges</option>
            <option value="api_topup">API credit top-ups</option>
            <option value="refund">Refunds</option>
          </select>
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
              >
                <div className="skeleton h-3.5 w-20" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-40" />
                  <div className="skeleton h-2.5 w-24" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-medium text-ink">
              No transactions found
            </p>
            <p className="mt-1 text-[12px] text-ink-3">
              Record a payment or change the filter to see history.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Billing date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap text-ink-2 tnum">
                        {formatDate(item.billingDate)}
                      </td>
                      <td>
                        <p className="text-[13px] font-medium text-ink">
                          {item.description || "Recurring charge"}
                        </p>
                        {item.subscription && (
                          <p className="text-[11px] text-ink-3">
                            {item.subscription.provider?.name}
                          </p>
                        )}
                      </td>
                      <td>{typeBadge(item.type)}</td>
                      <td className="text-right text-[13px] font-medium text-ink tnum">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() =>
                            alert(
                              `Invoice receipt for: ${item.description || "Charge"}\nAmount: ${item.currency} ${item.amount}`
                            )
                          }
                          className="btn-ghost btn-sm"
                        >
                          <Download className="h-3 w-3" strokeWidth={2} />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="row-divide md:hidden">
              {filtered.map((item) => (
                <div key={item.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {item.description || "Recurring charge"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-3">
                        {formatDate(item.billingDate)}
                        {item.subscription
                          ? ` · ${item.subscription.provider?.name}`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-medium text-ink tnum">
                      {formatCurrency(item.amount, item.currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {typeBadge(item.type)}
                    <button
                      onClick={() =>
                        alert(
                          `Invoice receipt for: ${item.description || "Charge"}\nAmount: ${item.currency} ${item.amount}`
                        )
                      }
                      className="btn-ghost btn-sm"
                    >
                      <Download className="h-3 w-3" strokeWidth={2} />
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
            className="glass-panel relative w-full max-w-md rounded-xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-accent" strokeWidth={1.8} />
                <div>
                  <h2
                    id="record-payment-title"
                    className="text-[14px] font-semibold text-ink"
                  >
                    Record payment
                  </h2>
                  <p className="text-[11.5px] text-ink-3">
                    Add an invoice or manual charge
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="icon-btn"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="space-y-4 px-5 py-4">
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="field tnum"
                    />
                  </div>
                  <div>
                    <label className="label">Billing date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="select"
                  >
                    <option value="subscription_payment">
                      Subscription payment
                    </option>
                    <option value="api_topup">API credit top-up</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "Saving…" : "Save record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
