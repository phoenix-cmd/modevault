"use client"

/* eslint-disable react-hooks/set-state-in-effect -- modal fields reset when opened */

import { useEffect, useState } from "react"
import { Gauge, X } from "lucide-react"
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
  const [usedMessages, setUsedMessages] = useState(0)
  const [usedRequests, setUsedRequests] = useState(0)
  const [usedTokens, setUsedTokens] = useState(0)
  const [usedCredits, setUsedCredits] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!subscription || !isOpen) return
    setUsedMessages(subscription.usedMessages || 0)
    setUsedRequests(subscription.usedRequests || 0)
    setUsedTokens(subscription.usedTokens || 0)
    setUsedCredits(subscription.usedCredits || 0)
    setError(null)
  }, [subscription, isOpen])

  if (!isOpen || !subscription) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, number> = {}
      if (subscription.quotaMessages !== null)
        payload.usedMessages = Number(usedMessages)
      if (subscription.quotaRequests !== null)
        payload.usedRequests = Number(usedRequests)
      if (subscription.quotaTokens !== null)
        payload.usedTokens = Number(usedTokens)
      if (subscription.quotaCredits !== null)
        payload.usedCredits = Number(usedCredits)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update usage")
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    {
      key: "messages",
      label: "Messages used",
      quota: subscription.quotaMessages,
      value: usedMessages,
      setValue: setUsedMessages,
      step: undefined,
    },
    {
      key: "requests",
      label: "Requests used",
      quota: subscription.quotaRequests,
      value: usedRequests,
      setValue: setUsedRequests,
      step: undefined,
    },
    {
      key: "tokens",
      label: "Tokens consumed",
      quota: subscription.quotaTokens,
      value: usedTokens,
      setValue: setUsedTokens,
      step: undefined,
    },
    {
      key: "credits",
      label: "Credits used ($)",
      quota: subscription.quotaCredits,
      value: usedCredits,
      setValue: setUsedCredits,
      step: "any",
    },
  ]

  const hasQuota = fields.some((field) => field.quota !== null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-modal-title"
        className="glass-panel relative w-full max-w-md rounded-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" strokeWidth={1.8} />
            <div>
              <h2
                id="usage-modal-title"
                className="text-[14px] font-semibold text-ink"
              >
                Record usage
              </h2>
              <p className="text-[11.5px] text-ink-3">
                {subscription.providerName} · {subscription.planName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {error && (
              <div className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}

            <p className="help-text">
              Consumption entered here updates dashboards and quota signals
              immediately.
            </p>

            {hasQuota ? (
              fields
                .filter((field) => field.quota !== null)
                .map((field) => (
                  <div key={field.key}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <label className="font-medium text-ink-2">
                        {field.label}
                      </label>
                      <span className="text-ink-3 tnum">
                        Quota: {field.quota?.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step={field.step}
                      value={field.value}
                      onChange={(e) =>
                        field.setValue(Number(e.target.value))
                      }
                      className="field tnum"
                    />
                  </div>
                ))
            ) : (
              <div>
                <label className="label">Messages / units used</label>
                <input
                  type="number"
                  min="0"
                  value={usedMessages}
                  onChange={(e) => setUsedMessages(Number(e.target.value))}
                  className="field tnum"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Updating…" : "Update usage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
