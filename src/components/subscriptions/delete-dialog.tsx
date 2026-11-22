"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { useModalA11y } from "@/lib/use-modal-a11y"

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

  const dialogRef = useModalA11y(isOpen, onClose)

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
        throw new Error(data.error || "Failed to delete subscription")
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete subscription"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="panel relative max-h-[90dvh] w-full max-w-sm overflow-y-auto shadow-float"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-danger/20 bg-danger-soft text-danger">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Portfolio</p>
              <h3
                id="delete-dialog-title"
                className="mt-1 font-display text-[15px] font-medium tracking-[-0.02em] text-ink"
              >
                Delete subscription
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
                Are you sure you want to remove {subscriptionName}? This archives the record and excludes it from active cost projections.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn -mr-0.5 -mt-0.5" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <button type="button" onClick={onClose} className="btn-ghost">Keep subscription</button>
          <button type="button" disabled={submitting} onClick={handleDelete} className="btn-danger">
            {submitting ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
      </div>
    </div>
  )
}
