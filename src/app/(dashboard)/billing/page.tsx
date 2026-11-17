"use client"

import { useEffect, useState } from "react"
import {
  Receipt,
  Download,
  Filter,
  Plus,
  ExternalLink,
  CreditCard,
  Wallet,
  ArrowUpRight,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [filterType, setFilterType] = useState<string>("all")

  // New billing record modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [amount, setAmount] = useState(1700)
  const [type, setType] = useState("subscription_payment")
  const [desc, setDesc] = useState("Manual renewal entry")
  const [date, setDate] = useState("")

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0])
  }, [])
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Billing & Expenses"
        description="Consolidated expense auditing, payment logs, tax invoices, and recurring subscription receipts."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Record Payment / Invoice
          </button>
        }
      />

      {/* Financial Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Billed This Month</p>
            <p className="text-2xl font-bold text-zinc-100">
              {formatCurrency(summary.totalSpentCurrentMonth, "INR")}
            </p>
            <p className="text-[11px] text-zinc-500">Current calendar month</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">Year-to-Date Spend (2026)</p>
            <p className="text-2xl font-bold text-zinc-100">
              {formatCurrency(summary.totalSpentCurrentYear, "INR")}
            </p>
            <p className="text-[11px] text-zinc-500">Jan 1 — Present</p>
          </GlassCard>

          <GlassCard variant="subtle" className="p-4 space-y-1">
            <p className="text-xs text-zinc-500 font-medium">All-Time Recorded AI Capital</p>
            <p className="text-2xl font-bold text-violet-300">
              {formatCurrency(summary.totalSpentAllTime, "INR")}
            </p>
            <p className="text-[11px] text-zinc-500">All subscriptions & top-ups</p>
          </GlassCard>
        </div>
      )}

      {/* Filter Strip */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          Payment Transactions
        </h3>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500/40"
          >
            <option value="all" className="bg-[#18181b]">All Transaction Types</option>
            <option value="subscription_payment" className="bg-[#18181b]">
              Subscription Charges
            </option>
            <option value="api_topup" className="bg-[#18181b]">
              API Credit Top-ups
            </option>
            <option value="refund" className="bg-[#18181b]">Refunds</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] glass">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] uppercase tracking-wider text-[11px] text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-medium">Billing Date</th>
              <th className="px-5 py-3.5 font-medium">Description</th>
              <th className="px-5 py-3.5 font-medium">Type</th>
              <th className="px-5 py-3.5 font-medium text-right">Amount</th>
              <th className="px-5 py-3.5 font-medium text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 font-mono text-zinc-400">
                  {formatDate(item.billingDate)}
                </td>
                <td className="px-5 py-3 font-medium text-zinc-200">
                  {item.description || "Recurring charge"}
                  {item.subscription && (
                    <span className="ml-2 text-[10px] text-zinc-500">
                      ({item.subscription.provider?.name})
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                      item.type === "subscription_payment"
                        ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    }`}
                  >
                    {item.type === "subscription_payment" ? "Subscription" : "API Top-up"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-100">
                  {formatCurrency(item.amount, item.currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() =>
                      alert(`Invoice receipt for: ${item.description || "Charge"}\nAmount: ${item.currency} ${item.amount}`)
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-violet-300 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 pb-3 border-b border-white/[0.06]">
              Record Payment or Invoice
            </h3>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Billing Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none"
                >
                  <option value="subscription_payment" className="bg-[#18181b]">
                    Subscription Payment
                  </option>
                  <option value="api_topup" className="bg-[#18181b]">
                    API Credit Top-up
                  </option>
                  <option value="refund" className="bg-[#18181b]">Refund</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-white shadow-lg hover:bg-violet-500"
                >
                  {submitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
