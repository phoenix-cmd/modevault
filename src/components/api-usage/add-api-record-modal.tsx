"use client"

/* eslint-disable react-hooks/set-state-in-effect -- modal fields reset when opened */

import { useState, useEffect } from "react"
import { Terminal, X } from "lucide-react"
import { useModalA11y } from "@/lib/use-modal-a11y"

interface AddApiRecordModalProps {
  apiAccounts: Array<{
    id: string
    providerName: string
    accountName: string | null
  }>
  selectedAccountId?: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddApiRecordModal({
  apiAccounts,
  selectedAccountId,
  isOpen,
  onClose,
  onSuccess,
}: AddApiRecordModalProps) {
  const [accountId, setAccountId] = useState(
    selectedAccountId || apiAccounts[0]?.id || ""
  )
  const [model, setModel] = useState("gpt-4o")
  const [inputTokens, setInputTokens] = useState(15000)
  const [outputTokens, setOutputTokens] = useState(4000)
  const [cachedTokens, setCachedTokens] = useState(0)
  const [cost, setCost] = useState(0.065)
  const [requests, setRequests] = useState(25)
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setAccountId(selectedAccountId || apiAccounts[0]?.id || "")
    setDate(new Date().toISOString().split("T")[0])
    setError(null)
  }, [isOpen, selectedAccountId, apiAccounts])

  const dialogRef = useModalA11y(isOpen, onClose)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/api-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiAccountId: accountId,
          model,
          inputTokens: Number(inputTokens),
          outputTokens: Number(outputTokens),
          cachedTokens: Number(cachedTokens),
          totalTokens: Number(inputTokens) + Number(outputTokens),
          cost: Number(cost),
          requestCount: Number(requests),
          date,
          dataSource: "manual",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to log API usage")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-record-modal-title"
        className="panel relative max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Developer usage</p>
            <h2 id="api-record-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
              Log API usage
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Record tokens, cost, and request volume for an account.</p>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {error && (
              <div className="border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{error}</div>
            )}

            <div>
              <label className="label">API account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="select">
                {apiAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName || account.providerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Model identifier</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-sonnet"
                  className="field font-mono text-[12px]"
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className="label">Input</label>
                <input type="number" min="0" value={inputTokens} onChange={(e) => setInputTokens(Number(e.target.value))} className="field tnum" />
              </div>
              <div>
                <label className="label">Output</label>
                <input type="number" min="0" value={outputTokens} onChange={(e) => setOutputTokens(Number(e.target.value))} className="field tnum" />
              </div>
              <div>
                <label className="label">Cached</label>
                <input type="number" min="0" value={cachedTokens} onChange={(e) => setCachedTokens(Number(e.target.value))} className="field tnum" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Total cost (USD)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="field tnum"
                />
              </div>
              <div>
                <label className="label">Request count</label>
                <input type="number" min="1" value={requests} onChange={(e) => setRequests(Number(e.target.value))} className="field tnum" />
              </div>
            </div>

            <p className="text-[11.5px] leading-relaxed text-ink-3">Total tokens are computed as input plus output tokens when saved.</p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Terminal className="h-3.5 w-3.5" strokeWidth={1.8} />
              {submitting ? "Saving…" : "Add record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
