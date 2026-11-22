"use client"

/* eslint-disable react-hooks/set-state-in-effect -- form fields reset when the modal opens */

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { PROVIDER_LIST } from "@/lib/providers"
import { useModalA11y } from "@/lib/use-modal-a11y"
import type {
  SubscriptionData,
  ProviderSlug,
  SubscriptionStatus,
  BillingCycle,
} from "@/lib/types"

interface SubscriptionFormProps {
  subscription?: SubscriptionData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SubscriptionForm({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionFormProps) {
  const isEditing = Boolean(subscription)

  const dialogRef = useModalA11y(isOpen, onClose)

  const [formData, setFormData] = useState({
    providerSlug: "openai" as ProviderSlug,
    planName: "ChatGPT Plus",
    type: "consumer",
    status: "active" as SubscriptionStatus,
    billingCycle: "monthly" as BillingCycle,
    price: 1700,
    currency: "INR",
    startDate: "",
    renewalDate: "",
    quotaType: "messages",
    quotaLimit: 80,
    quotaResetPeriod: "monthly",
    dataSource: "manual",
    notes: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (subscription) {
      let qType = "none"
      let qVal = 0
      if (subscription.quotaMessages) {
        qType = "messages"
        qVal = subscription.quotaMessages
      } else if (subscription.quotaRequests) {
        qType = "requests"
        qVal = subscription.quotaRequests
      } else if (subscription.quotaTokens) {
        qType = "tokens"
        qVal = subscription.quotaTokens
      } else if (subscription.quotaCredits) {
        qType = "credits"
        qVal = subscription.quotaCredits
      }

      setFormData({
        providerSlug: subscription.providerSlug,
        planName: subscription.planName,
        type: subscription.type,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        price: subscription.price,
        currency: subscription.currency,
        startDate: subscription.startDate
          ? subscription.startDate.split("T")[0]
          : "",
        renewalDate: subscription.renewalDate
          ? subscription.renewalDate.split("T")[0]
          : "",
        quotaType: qType,
        quotaLimit: qVal,
        quotaResetPeriod: subscription.quotaResetPeriod || "monthly",
        dataSource: subscription.dataSource,
        notes: subscription.notes || "",
      })
    } else {
      setFormData({
        providerSlug: "openai",
        planName: "ChatGPT Plus",
        type: "consumer",
        status: "active",
        billingCycle: "monthly",
        price: 1700,
        currency: "INR",
        startDate: new Date().toISOString().split("T")[0],
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        quotaType: "messages",
        quotaLimit: 80,
        quotaResetPeriod: "monthly",
        dataSource: "manual",
        notes: "",
      })
    }
  }, [subscription, isOpen])

  if (!isOpen) return null

  const handleProviderChange = (slug: string) => {
    const prov = PROVIDER_LIST.find((p) => p.slug === slug)
    const defaultPlan = prov?.plans[0]?.name || "Custom Plan"
    setFormData((prev) => ({
      ...prev,
      providerSlug: slug as ProviderSlug,
      planName: defaultPlan,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, string | number | null> = {
        providerId: `prov_${formData.providerSlug}`,
        customPlanName: formData.planName,
        type: formData.type,
        status: formData.status,
        billingCycle: formData.billingCycle,
        price: Number(formData.price),
        currency: formData.currency,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : new Date().toISOString(),
        renewalDate: formData.renewalDate
          ? new Date(formData.renewalDate).toISOString()
          : null,
        quotaResetPeriod: formData.quotaResetPeriod,
        dataSource: formData.dataSource,
        notes: formData.notes || null,
        quotaMessages:
          formData.quotaType === "messages" ? Number(formData.quotaLimit) : null,
        quotaRequests:
          formData.quotaType === "requests" ? Number(formData.quotaLimit) : null,
        quotaTokens:
          formData.quotaType === "tokens" ? Number(formData.quotaLimit) : null,
        quotaCredits:
          formData.quotaType === "credits" ? Number(formData.quotaLimit) : null,
      }

      const url = isEditing
        ? `/api/subscriptions/${subscription?.id}`
        : "/api/subscriptions"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save subscription")
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const sectionLabel =
    "mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-form-title"
        className="panel relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto shadow-float"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Portfolio</p>
            <h2
              id="subscription-form-title"
              className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink"
            >
              {isEditing ? "Edit subscription" : "Add subscription"}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {isEditing ? "Update plan, billing, and quota details." : "Track a new AI plan or developer account."}
            </p>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-4">
            {error && (
              <div className="border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                {error}
              </div>
            )}

            <div>
              <p className={sectionLabel}>Plan</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Provider</label>
                  <select
                    value={formData.providerSlug}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="select"
                  >
                    {PROVIDER_LIST.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Plan name</label>
                  <input
                    type="text"
                    required
                    value={formData.planName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        planName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Pro, Plus, Ultra"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="select"
                  >
                    <option value="consumer">Consumer subscription</option>
                    <option value="api">Developer API account</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as SubscriptionStatus,
                      }))
                    }
                    className="select"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className={sectionLabel}>Billing</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="field tnum"
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    className="select"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        billingCycle: e.target.value as BillingCycle,
                      }))
                    }
                    className="select"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="label">Start date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="label">Renewal date</label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        renewalDate: e.target.value,
                      }))
                    }
                    className="field"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className={sectionLabel}>Usage quota</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Metric</label>
                  <select
                    value={formData.quotaType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quotaType: e.target.value,
                      }))
                    }
                    className="select"
                  >
                    <option value="messages">Messages</option>
                    <option value="requests">Requests</option>
                    <option value="tokens">Tokens</option>
                    <option value="credits">Credits ($)</option>
                    <option value="none">Unmetered / none</option>
                  </select>
                </div>

                {formData.quotaType !== "none" && (
                  <div>
                    <label className="label">Quota amount</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quotaLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quotaLimit: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="field tnum"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Reset period</label>
                  <select
                    value={formData.quotaResetPeriod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quotaResetPeriod: e.target.value,
                      }))
                    }
                    className="select"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="billing_cycle">Billing cycle</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <label className="label">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="e.g. Shared team seat, includes 200 fast requests"
                className="field h-auto resize-none py-2"
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3.5">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving…" : isEditing ? "Save changes" : "Create subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
