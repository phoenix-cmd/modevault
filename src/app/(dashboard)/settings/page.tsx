"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  CheckCircle2,
  Coins,
  Download,
  Save,
  Shield,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { useModalA11y } from "@/lib/use-modal-a11y"

const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee (₹)", hint: "Default" },
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
]

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-end focus-visible:outline-none"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ${
          checked ? "bg-accent" : "bg-surface-3"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow-sm transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </span>
    </button>
  )
}

export default function SettingsPage() {
  const [currency, setCurrency] = useState("INR")
  const [quotaAlerts, setQuotaAlerts] = useState(true)
  const [renewalAlerts, setRenewalAlerts] = useState(true)
  const [billingAlerts, setBillingAlerts] = useState(true)
  const [syncAlerts, setSyncAlerts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteDialogRef = useModalA11y(deleteOpen, () => setDeleteOpen(false))

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          if (json.data.email) setAccountEmail(json.data.email)
          if (json.data.currency) setCurrency(json.data.currency)
          if (typeof json.data.quotaAlerts === "boolean") setQuotaAlerts(json.data.quotaAlerts)
          if (typeof json.data.renewalAlerts === "boolean") setRenewalAlerts(json.data.renewalAlerts)
          if (typeof json.data.billingAlerts === "boolean") setBillingAlerts(json.data.billingAlerts)
          if (typeof json.data.syncAlerts === "boolean") setSyncAlerts(json.data.syncAlerts)
        }
      })
      .catch(() => {})
  }, [])

  const saveSettings = async (patch: Record<string, unknown>, message = "Settings saved") => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      notify(message)
    } catch {
      notify("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    saveSettings({
      currency,
      quotaAlerts,
      renewalAlerts,
      billingAlerts,
      syncAlerts,
    })
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/settings/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "modelvault-export.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      notify("CSV export downloaded")
    } catch {
      notify("Failed to export CSV")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Account · Preferences"
        title="Settings"
        description="Workspace defaults, notification policies, and account configuration persisted to your MODELVAULT profile."
      />

      {toast && (
        <div
          className="fixed inset-x-4 top-16 z-50 flex items-center justify-between gap-2 border border-line-strong bg-surface px-3.5 py-2.5 shadow-float animate-fade-in-up sm:inset-x-auto sm:right-4 sm:top-20"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} />
          <span className="text-[12.5px] font-medium text-ink">{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-ink-3 transition-colors hover:text-ink"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">General</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Currency and display preferences.</p>
        </div>

        <div className="border-t border-line pt-4">
          <div>
            <label htmlFor="currency" className="label inline-flex items-center gap-1.5">
              <Coins className="h-3 w-3" strokeWidth={1.8} />
              Base currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => {
                const next = e.target.value
                setCurrency(next)
                saveSettings({ currency: next }, "Currency preference saved")
              }}
              className="select mt-1 sm:max-w-xs"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                  {c.hint ? ` — ${c.hint}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
              Totals and comparisons are converted to this currency for display. Original billing values are preserved.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="inline-flex items-center gap-2 font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            <Bell className="h-4 w-4 text-accent" strokeWidth={1.8} />
            Notifications
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Choose which events generate alerts.</p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Quota warnings</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Alert when a subscription approaches 80% of its quota limit.
              </p>
            </div>
            <Toggle checked={quotaAlerts} onChange={setQuotaAlerts} label="Quota warnings" />
          </div>

          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Renewal reminders</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Notify 7 days before a subscription renewal or expiry date.
              </p>
            </div>
            <Toggle checked={renewalAlerts} onChange={setRenewalAlerts} label="Renewal reminders" />
          </div>

          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Billing alerts</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Notify when monthly spend exceeds your configured threshold.
              </p>
            </div>
            <Toggle checked={billingAlerts} onChange={setBillingAlerts} label="Billing alerts" />
          </div>

          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Sync events</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Report when a provider integration sync fails or requires attention.
              </p>
            </div>
            <Toggle checked={syncAlerts} onChange={setSyncAlerts} label="Sync events" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
            <Save className="h-3.5 w-3.5" strokeWidth={2} />
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="inline-flex items-center gap-2 font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            <Shield className="h-4 w-4 text-accent" strokeWidth={1.8} />
            Data &amp; account
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Export, access, and destructive actions.</p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Export data</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Download subscriptions, usage logs, and billing records as CSV.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="btn-secondary btn-sm shrink-0 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>

          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-danger">Delete account</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                Permanently remove your account and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => {
                setDeleteError(null)
                setConfirmText("")
                setDeleteOpen(true)
              }}
              className="btn-danger btn-sm shrink-0 self-start sm:self-auto"
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="panel max-h-[90dvh] w-full max-w-md overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-danger">Permanent action</p>
                <h2 id="delete-account-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  Delete account
                </h2>
              </div>
              <button onClick={() => setDeleteOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setDeletingAccount(true)
                setDeleteError(null)
                try {
                  const res = await fetch("/api/settings", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmText }),
                  })
                  const json = await res.json()
                  if (!res.ok) throw new Error(json.error || "Failed to delete account")
                  window.location.href = "/login"
                } catch (err) {
                  setDeleteError(err instanceof Error ? err.message : "Failed to delete account")
                } finally {
                  setDeletingAccount(false)
                }
              }}
              className="space-y-4 p-5"
            >
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                This permanently deletes your profile, sessions, encrypted integrations, subscriptions, and billing history. Type <span className="font-mono font-semibold text-ink">DELETE</span>{accountEmail ? ` or ${accountEmail}` : ""} to confirm.
              </p>
              {deleteError && (
                <div className="border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                  {deleteError}
                </div>
              )}
              <input
                type="text"
                required
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="field font-mono"
              />
              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setDeleteOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={deletingAccount || !confirmText.trim()} className="btn-danger">
                  {deletingAccount ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        MODELVAULT · account &amp; notification preferences persisted to database
      </p>
    </div>
  )
}
