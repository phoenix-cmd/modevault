"use client"

import { useState, useEffect } from "react"
import { X, Sparkles } from "lucide-react"
import { PROVIDER_LIST } from "@/lib/providers"
import type { SubscriptionData, ProviderSlug, SubscriptionStatus, BillingCycle } from "@/lib/types"

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
        startDate: subscription.startDate ? subscription.startDate.split("T")[0] : "",
        renewalDate: subscription.renewalDate ? subscription.renewalDate.split("T")[0] : "",
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
      const payload: any = {
        providerId: `prov_${formData.providerSlug}`,
        customPlanName: formData.planName,
        type: formData.type,
        status: formData.status,
        billingCycle: formData.billingCycle,
        price: Number(formData.price),
        currency: formData.currency,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        renewalDate: formData.renewalDate ? new Date(formData.renewalDate).toISOString() : null,
        quotaResetPeriod: formData.quotaResetPeriod,
        dataSource: formData.dataSource,
        notes: formData.notes || null,
        quotaMessages: formData.quotaType === "messages" ? Number(formData.quotaLimit) : null,
        quotaRequests: formData.quotaType === "requests" ? Number(formData.quotaLimit) : null,
        quotaTokens: formData.quotaType === "tokens" ? Number(formData.quotaLimit) : null,
        quotaCredits: formData.quotaType === "credits" ? Number(formData.quotaLimit) : null,
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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              {isEditing ? "Edit Subscription" : "Add AI Subscription"}
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-sm">
          {/* Provider & Plan Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                AI Provider
              </label>
              <select
                value={formData.providerSlug}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              >
                {PROVIDER_LIST.map((p) => (
                  <option key={p.slug} value={p.slug} className="bg-[#18181b]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Plan Name
              </label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, planName: e.target.value }))
                }
                placeholder="e.g. Pro, Plus, Ultra"
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Subscription Category
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              >
                <option value="consumer" className="bg-[#18181b]">
                  Consumer Subscription
                </option>
                <option value="api" className="bg-[#18181b]">
                  Developer API Account
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as SubscriptionStatus,
                  }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              >
                <option value="active" className="bg-[#18181b]">Active</option>
                <option value="paused" className="bg-[#18181b]">Paused</option>
                <option value="trial" className="bg-[#18181b]">Trial</option>
                <option value="expired" className="bg-[#18181b]">Expired</option>
                <option value="cancelled" className="bg-[#18181b]">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Price, Currency & Billing Cycle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Price
              </label>
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
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, currency: e.target.value }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              >
                <option value="INR" className="bg-[#18181b]">INR (₹)</option>
                <option value="USD" className="bg-[#18181b]">USD ($)</option>
                <option value="EUR" className="bg-[#18181b]">EUR (€)</option>
                <option value="GBP" className="bg-[#18181b]">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Cycle
              </label>
              <select
                value={formData.billingCycle}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billingCycle: e.target.value as BillingCycle,
                  }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              >
                <option value="monthly" className="bg-[#18181b]">Monthly</option>
                <option value="yearly" className="bg-[#18181b]">Yearly</option>
                <option value="custom" className="bg-[#18181b]">Custom</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Renewal Date
              </label>
              <input
                type="date"
                value={formData.renewalDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))
                }
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Quota Limit Configuration */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300">
              Usage Quota & Reset Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Quota Metric
                </label>
                <select
                  value={formData.quotaType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quotaType: e.target.value }))
                  }
                  className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
                >
                  <option value="messages" className="bg-[#18181b]">Messages</option>
                  <option value="requests" className="bg-[#18181b]">Requests</option>
                  <option value="tokens" className="bg-[#18181b]">Tokens</option>
                  <option value="credits" className="bg-[#18181b]">Credits ($)</option>
                  <option value="none" className="bg-[#18181b]">Unmetered / None</option>
                </select>
              </div>

              {formData.quotaType !== "none" && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Quota Amount
                  </label>
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
                    className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Reset Period
                </label>
                <select
                  value={formData.quotaResetPeriod}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quotaResetPeriod: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg glass border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
                >
                  <option value="daily" className="bg-[#18181b]">Daily</option>
                  <option value="weekly" className="bg-[#18181b]">Weekly</option>
                  <option value="monthly" className="bg-[#18181b]">Monthly</option>
                  <option value="billing_cycle" className="bg-[#18181b]">Billing Cycle</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Notes & Tier Details
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g. Shared team seat, 5x Claude multiplier, includes 200 Fast requests"
              className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50 text-xs"
            />
          </div>

          {/* Submit Actions */}
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
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
