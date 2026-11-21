"use client"

import { useState } from "react"
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
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-line ${
        checked ? "bg-accent" : "bg-surface-3"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [currency, setCurrency] = useState("INR")
  const [quotaAlerts, setQuotaAlerts] = useState(true)
  const [renewalAlerts, setRenewalAlerts] = useState(true)
  const [billingAlerts, setBillingAlerts] = useState(true)
  const [syncAlerts, setSyncAlerts] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  const handleSave = () => {
    notify("Settings saved")
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Account · Preferences"
        title="Settings"
        description="Workspace defaults, notification policies, and account configuration. Changes here apply to your local workspace preferences."
      />

      {toast && (
        <div
          className="fixed right-4 top-20 z-50 flex items-center gap-2 border border-line-strong bg-surface px-3.5 py-2.5 shadow-float animate-fade-in-up"
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
                setCurrency(e.target.value)
                notify("Currency preference saved")
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
          <button onClick={handleSave} className="btn-primary btn-sm">
            <Save className="h-3.5 w-3.5" strokeWidth={2} />
            Save preferences
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
              onClick={() => notify("Export started — CSV will download shortly")}
              className="btn-secondary btn-sm shrink-0 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Export CSV
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
              onClick={() => notify("Account deletion requires confirmation via support")}
              className="btn-danger btn-sm shrink-0 self-start sm:self-auto"
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        MODELVAULT · workspace preferences stored locally in this browser session context
      </p>
    </div>
  )
}
