"use client"

import { useState, useEffect } from "react"
import { X, Terminal, UploadCloud } from "lucide-react"

interface AddApiRecordModalProps {
  apiAccounts: Array<{ id: string; providerName: string; accountName: string | null }>
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
    setDate(new Date().toISOString().split("T")[0])
  }, [isOpen])

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
    } catch (err: any) {
      setError(err.message || "Failed to save record")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-violet-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Log API Usage Record
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              API Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
            >
              {apiAccounts.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#18181b]">
                  {a.accountName || a.providerName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Model Identifier
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Input Tokens
              </label>
              <input
                type="number"
                min="0"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Output Tokens
              </label>
              <input
                type="number"
                min="0"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Cached Tokens
              </label>
              <input
                type="number"
                min="0"
                value={cachedTokens}
                onChange={(e) => setCachedTokens(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Total Cost ($ USD)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                Request Count
              </label>
              <input
                type="number"
                min="1"
                value={requests}
                onChange={(e) => setRequests(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-5 py-2 font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
