"use client"

import { useState } from "react"
import { X, Gauge, RefreshCw } from "lucide-react"
import type { SubscriptionData } from "@/lib/types"

interface UsageModalProps {
  subscription: SubscriptionData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UsageModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: UsageModalProps) {
  if (!isOpen || !subscription) return null

  const [usedMessages, setUsedMessages] = useState(subscription.usedMessages || 0)
  const [usedRequests, setUsedRequests] = useState(subscription.usedRequests || 0)
  const [usedTokens, setUsedTokens] = useState(subscription.usedTokens || 0)
  const [usedCredits, setUsedCredits] = useState(subscription.usedCredits || 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: any = {}
      if (subscription.quotaMessages !== null) payload.usedMessages = Number(usedMessages)
      if (subscription.quotaRequests !== null) payload.usedRequests = Number(usedRequests)
      if (subscription.quotaTokens !== null) payload.usedTokens = Number(usedTokens)
      if (subscription.quotaCredits !== null) payload.usedCredits = Number(usedCredits)

      // Also support updating default if no quota was specified
      if (Object.keys(payload).length === 0) {
        payload.usedMessages = Number(usedMessages)
      }

      const res = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update usage")
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update usage")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-violet-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Record Usage — {subscription.providerName}
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
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
          <p className="text-xs text-zinc-400">
            Update current consumption for {subscription.planName}. Metrics entered here immediately sync with your command center dashboards.
          </p>

          {subscription.quotaMessages !== null && (
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1.5">
                <span>Messages Used</span>
                <span className="text-zinc-500">
                  Quota: {subscription.quotaMessages.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={usedMessages}
                onChange={(e) => setUsedMessages(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {subscription.quotaRequests !== null && (
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1.5">
                <span>Requests Used</span>
                <span className="text-zinc-500">
                  Quota: {subscription.quotaRequests.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={usedRequests}
                onChange={(e) => setUsedRequests(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {subscription.quotaTokens !== null && (
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1.5">
                <span>Tokens Consumed</span>
                <span className="text-zinc-500">
                  Quota: {subscription.quotaTokens.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={usedTokens}
                onChange={(e) => setUsedTokens(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {subscription.quotaCredits !== null && (
            <div>
              <div className="flex justify-between text-xs text-zinc-300 mb-1.5">
                <span>Credits Used ($)</span>
                <span className="text-zinc-500">
                  Quota: ${subscription.quotaCredits.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                value={usedCredits}
                onChange={(e) => setUsedCredits(Number(e.target.value))}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {subscription.quotaMessages === null &&
            subscription.quotaRequests === null &&
            subscription.quotaTokens === null &&
            subscription.quotaCredits === null && (
              <div>
                <label className="block text-xs text-zinc-300 mb-1.5">
                  Messages / Units Used
                </label>
                <input
                  type="number"
                  min="0"
                  value={usedMessages}
                  onChange={(e) => setUsedMessages(Number(e.target.value))}
                  className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
                />
              </div>
            )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Usage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
