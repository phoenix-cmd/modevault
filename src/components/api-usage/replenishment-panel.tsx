"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Plus, ShieldCheck, ExternalLink, AlertTriangle, CheckCircle2, X } from "lucide-react"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { TrustBadge } from "@/components/ui/trust-badge"
import { getProviderCapability } from "@/lib/providers/capabilities"
import { formatCurrency } from "@/lib/utils"
import type { ApiAccountData } from "@/lib/types"

interface ReplenishmentRuleRow {
  id: string
  apiAccountId: string | null
  providerSlug: string
  enabled: boolean
  thresholdAmount: number
  topUpAmount: number
  currency: string
  maxMonthlySpend: number
  cooldownMinutes: number
  paymentMethodRef: string | null
  autoPayAuthorized: boolean
  lastTriggeredAt: string | null
  apiAccount?: { accountName: string | null; provider: { name: string; slug: string } } | null
}

interface ReplenishmentEventRow {
  id: string
  apiAccountId: string | null
  providerSlug: string
  triggerReason: string
  mode: string
  status: string
  requestedAmount: number
  creditedAmount: number | null
  currency: string
  balanceBefore: number | null
  balanceAfter: number | null
  paymentProviderRef: string | null
  checkoutUrl: string | null
  failureReason: string | null
  createdAt: string
}

export function ReplenishmentPanel({
  accounts,
  onUpdated,
}: {
  accounts: ApiAccountData[]
  onUpdated: () => void
}) {
  const [rules, setRules] = useState<ReplenishmentRuleRow[]>([])
  const [events, setEvents] = useState<ReplenishmentEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [thresholdAmount, setThresholdAmount] = useState("10")
  const [topUpAmount, setTopUpAmount] = useState("25")
  const [maxMonthlySpend, setMaxMonthlySpend] = useState("100")
  const [cooldownMinutes, setCooldownMinutes] = useState("60")
  const [paymentMethodRef, setPaymentMethodRef] = useState("")
  const [autoPayAuthorized, setAutoPayAuthorized] = useState(false)

  const [receiptModalEvent, setReceiptModalEvent] = useState<ReplenishmentEventRow | null>(null)
  const [receiptAmount, setReceiptAmount] = useState("25")
  const [receiptRef, setReceiptRef] = useState("")

  const loadAll = async () => {
    try {
      setLoading(true)
      const [rulesRes, eventsRes] = await Promise.all([
        fetch("/api/replenishment/rules"),
        fetch("/api/replenishment/events"),
      ])
      const [rulesJson, eventsJson] = await Promise.all([
        rulesRes.json().catch(() => ({ data: [] })),
        eventsRes.json().catch(() => ({ data: [] })),
      ])
      if (Array.isArray(rulesJson?.data)) setRules(rulesJson.data)
      if (Array.isArray(eventsJson?.data)) setEvents(eventsJson.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/replenishment/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiAccountId: accountId,
          enabled: true,
          thresholdAmount: Number(thresholdAmount),
          topUpAmount: Number(topUpAmount),
          maxMonthlySpend: Number(maxMonthlySpend),
          cooldownMinutes: Number(cooldownMinutes),
          paymentMethodRef: paymentMethodRef.trim() || null,
          autoPayAuthorized,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save rule")
      setRuleModalOpen(false)
      setMessage("Replenishment rule & guardrails saved.")
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluate = async (apiAccountId: string) => {
    setEvaluatingId(apiAccountId)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/replenishment/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          apiAccountId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to evaluate replenishment")
      const ev = json.data?.event
      if (ev) {
        setMessage(
          ev.status === "manual_required"
            ? `Manual top-up required for ${ev.providerSlug}: ${ev.failureReason || "Complete payment on provider billing portal."}`
            : `Replenishment check recorded (${ev.status}).`
        )
      } else {
        setMessage(json.data?.reason || "Account balance is healthy above threshold.")
      }
      await loadAll()
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed")
    } finally {
      setEvaluatingId(null)
    }
  }

  const handleRecordManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiptModalEvent?.apiAccountId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/replenishment/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_topup",
          apiAccountId: receiptModalEvent.apiAccountId,
          eventId: receiptModalEvent.id,
          amount: Number(receiptAmount),
          currency: receiptModalEvent.currency,
          receiptRef: receiptRef.trim() || "manual_receipt",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to record manual receipt")
      setReceiptModalEvent(null)
      setReceiptRef("")
      setMessage(`Recorded manual top-up of ${receiptAmount} ${receiptModalEvent.currency}.`)
      await loadAll()
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record receipt")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6 border-t border-line pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Credit replenishment &amp; guardrails
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            Automated low-balance checks with monthly spend caps, signed webhook confirmation, or honest manual top-up alerts when providers lack recharge APIs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setRuleModalOpen(true)
          }}
          disabled={accounts.length === 0}
          className="btn-secondary btn-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Configure replenishment rule
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between gap-2 border border-info/30 bg-info-soft/40 px-4 py-2.5 text-[12px] text-ink">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-info shrink-0" />
            {message}
          </span>
          <button type="button" onClick={() => setMessage(null)} className="icon-btn" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="border border-danger/30 bg-danger-soft/40 px-4 py-2.5 text-[12px] text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border-t border-line">
        <table className="data-table">
          <caption className="sr-only">Configured low-balance credit replenishment rules and monthly caps</caption>
          <thead>
            <tr>
              <th>Account</th>
              <th>Trigger &amp; Top-up</th>
              <th>Monthly Cap</th>
              <th>Authorization</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[12px] text-ink-3">Loading replenishment rules…</td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[12px] text-ink-3">
                  No replenishment rules configured yet. Add a rule to monitor low prepaid balances.
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <ProviderIcon slug={r.providerSlug} size="sm" />
                      <div>
                        <p className="text-[12.5px] font-medium text-ink">
                          {r.apiAccount?.accountName || r.apiAccount?.provider?.name || r.providerSlug}
                        </p>
                        <p className="font-mono text-[10px] text-ink-3">Cooldown {r.cooldownMinutes}m</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-[11.5px] text-ink-2">
                    When &lt; {formatCurrency(r.thresholdAmount, r.currency)} → add {formatCurrency(r.topUpAmount, r.currency)}
                  </td>
                  <td className="font-mono text-[11.5px] text-ink-2">
                    {formatCurrency(r.maxMonthlySpend, r.currency)} / mo
                  </td>
                  <td>
                    {r.autoPayAuthorized && r.paymentMethodRef ? (
                      <span className="badge bg-success-soft text-success">
                        <ShieldCheck className="h-3 w-3" />
                        Auto-pay authorized ({r.paymentMethodRef})
                      </span>
                    ) : (
                      <span className="badge bg-info-soft text-info">Manual alert only</span>
                    )}
                  </td>
                  <td className="text-right">
                    {r.apiAccountId && (
                      <button
                        type="button"
                        onClick={() => handleEvaluate(r.apiAccountId!)}
                        disabled={evaluatingId === r.apiAccountId}
                        className="btn-secondary btn-sm"
                      >
                        <RefreshCw className={`h-3 w-3 ${evaluatingId === r.apiAccountId ? "animate-spin" : ""}`} />
                        Check balance
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {events.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            Replenishment audit log ({events.length})
          </p>
          <div className="overflow-x-auto border-t border-line">
            <table className="data-table">
              <caption className="sr-only">Replenishment evaluation and manual or webhook top-up audit log</caption>
              <thead>
                <tr>
                  <th>Provider &amp; Mode</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Notes / Reference</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const cap = getProviderCapability(ev.providerSlug)
                  const billingUrl = ev.checkoutUrl || cap.billingUrl
                  return (
                    <tr key={ev.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <ProviderIcon slug={ev.providerSlug} size="sm" />
                          <div>
                            <TrustBadge source={ev.mode === "manual_topup" ? "manual_topup" : ev.mode === "manual_alert" ? "manual" : "live_api_sync"} />
                            <p className="mt-1 font-mono text-[10px] text-ink-3">
                              {new Date(ev.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="text-right font-mono text-[12px] tabular-nums text-ink">
                        {formatCurrency(ev.creditedAmount ?? ev.requestedAmount, ev.currency)}
                      </td>
                      <td className="max-w-[320px] text-[11.5px] text-ink-2">
                        {ev.paymentProviderRef ? `Ref: ${ev.paymentProviderRef}` : null}
                        {ev.failureReason && (
                          <span className="flex items-start gap-1 text-warning">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{ev.failureReason}</span>
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {billingUrl && ev.status === "manual_required" && (
                            <a
                              href={billingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost btn-sm"
                            >
                              Portal
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {(ev.status === "manual_required" || ev.status === "awaiting_webhook") && ev.apiAccountId && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptModalEvent(ev)
                                setReceiptAmount(String(ev.requestedAmount))
                              }}
                              className="btn-secondary btn-sm"
                            >
                              Record receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px]">
          <div role="dialog" aria-modal="true" className="panel w-full max-w-md shadow-float">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-[15px] font-medium text-ink">Configure replenishment rule</h3>
              <button type="button" onClick={() => setRuleModalOpen(false)} className="icon-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRule} className="space-y-4 p-5">
              <div>
                <label className="label">Target API account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="select" required>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName || a.providerName} ({formatCurrency(a.prepaidBalance, a.currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Trigger when below</label>
                  <input type="number" step="any" min="0" value={thresholdAmount} onChange={(e) => setThresholdAmount(e.target.value)} className="field tnum" required />
                </div>
                <div>
                  <label className="label">Top-up amount</label>
                  <input type="number" step="any" min="1" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="field tnum" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monthly spend cap</label>
                  <input type="number" step="any" min="1" value={maxMonthlySpend} onChange={(e) => setMaxMonthlySpend(e.target.value)} className="field tnum" required />
                </div>
                <div>
                  <label className="label">Cooldown (minutes)</label>
                  <input type="number" min="1" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(e.target.value)} className="field tnum" required />
                </div>
              </div>
              <div>
                <label className="label">Payment method reference (optional)</label>
                <input type="text" value={paymentMethodRef} onChange={(e) => setPaymentMethodRef(e.target.value)} placeholder="pm_card_visa_4242" className="field font-mono" />
              </div>
              <label className="flex items-start gap-2.5 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  checked={autoPayAuthorized}
                  onChange={(e) => setAutoPayAuthorized(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I authorize pending auto-replenishment requests up to {maxMonthlySpend}/month (confirmed only upon signed payment webhook).
                </span>
              </label>
              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setRuleModalOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Saving…" : "Save rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px]">
          <div role="dialog" aria-modal="true" className="panel w-full max-w-md shadow-float">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-[15px] font-medium text-ink">Record manual top-up receipt</h3>
              <button type="button" onClick={() => setReceiptModalEvent(null)} className="icon-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRecordManualReceipt} className="space-y-4 p-5">
              <div>
                <label className="label">Credited amount ({receiptModalEvent.currency})</label>
                <input type="number" step="any" min="0.01" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} className="field tnum" required />
              </div>
              <div>
                <label className="label">Invoice / receipt reference</label>
                <input type="text" value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} placeholder="inv_2026_11_openrouter" className="field font-mono" />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setReceiptModalEvent(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Recording…" : "Confirm manual top-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
