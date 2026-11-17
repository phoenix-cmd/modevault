"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"

interface DeleteDialogProps {
  subscriptionId: string | null
  subscriptionName?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteDialog({
  subscriptionId,
  subscriptionName = "this subscription",
  isOpen,
  onClose,
  onSuccess,
}: DeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !subscriptionId) return null

  const handleDelete = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to cancel subscription")
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to delete subscription")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              Cancel Subscription
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Are you sure you want to cancel or remove {subscriptionName}? This will archive the record and exclude it from active cost projections.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Keep Subscription
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  )
}
