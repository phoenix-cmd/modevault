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
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
}) {
  return (
    <div className="panel-header items-start">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-2">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [currency, setCurrency] = useState("INR")
  const [userName, setUserName] = useState("Demo Architect")
  const [userEmail, setUserEmail] = useState("demo@modelvault.dev")
  const [threshold80, setThreshold80] = useState(true)
  const [threshold90, setThreshold90] = useState(true)
  const [renewalNoticeDays, setRenewalNoticeDays] = useState(7)
  const [creditAlertMin, setCreditAlertMin] = useState(15)
  const [savedMessage, setSavedMessage] = useState(false)
  const [exportNotice, setExportNotice] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 3000)
  }

  const exportData = () => {
    setExportNotice(true)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-16">
      <PageHeader
        eyebrow="Workspace · Preferences"
        title="Settings"
        description="Currency, alert thresholds, identity, and data portability for your workspace."
        action={
          <button type="submit" form="settings-form" className="btn-primary">
            <Save className="h-3.5 w-3.5" strokeWidth={2} />
            Save preferences
          </button>
        }
      />

      {savedMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-success/25 bg-success-soft px-3.5 py-2.5 text-[12px] text-success animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Settings saved successfully.</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedMessage(false)}
            className="text-success/70 transition-colors hover:text-success"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <form id="settings-form" onSubmit={handleSave} className="space-y-4">
        <section className="panel">
          <SectionHeader
            icon={Shield}
            title="Identity & access"
            description="Displayed on exports, audit logs and notifications."
          />
          <div className="panel-body grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full-name" className="label">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="field"
              />
            </div>
          </div>
        </section>

        <section className="panel">
          <SectionHeader
            icon={Coins}
            title="Currency"
            description="Applied to spend totals, invoices and analytics."
          />
          <div className="panel-body space-y-3">
            <div className="sm:max-w-xs">
              <label htmlFor="currency" className="label">
                Default currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="select"
              >
                {CURRENCIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                    {item.hint ? ` [${item.hint}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/50 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink-2">
                  Exchange rate reference
                </span>
                <span className="tnum rounded-md bg-surface px-2 py-0.5 font-mono text-[12px] text-ink">
                  1 USD = 84.50 INR
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                Benchmark dated Nov 2026. Conversions across provider invoices
                are computed against this index.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <SectionHeader
            icon={Bell}
            title="Smart alerts"
            description="Quota and spend notifications across all providers."
          />
          <div className="row-divide px-4 sm:px-5">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  80% quota warning
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                  Alert when message or request quotas surpass 80%.
                </p>
              </div>
              <Toggle
                checked={threshold80}
                onChange={setThreshold80}
                label="80% quota warning"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  90% and 100% critical alerts
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                  Emergency notices before rate-limit throttling begins.
                </p>
              </div>
              <Toggle
                checked={threshold90}
                onChange={setThreshold90}
                label="90% and 100% critical alerts"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  Renewal advance notice
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                  Days ahead of an auto-debit charge to send a reminder.
                </p>
              </div>
              <select
                value={renewalNoticeDays}
                onChange={(e) => setRenewalNoticeDays(Number(e.target.value))}
                aria-label="Renewal advance notice"
                className="select select-sm w-24 shrink-0"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  Low credit threshold
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                  Warning when prepaid developer balance falls below this value.
                </p>
              </div>
              <div className="relative w-24 shrink-0">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-3">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  value={creditAlertMin}
                  onChange={(e) => setCreditAlertMin(Number(e.target.value))}
                  aria-label="Low credit threshold in dollars"
                  className="field select-sm pl-6 text-right tnum"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <SectionHeader
            icon={Download}
            title="Data portability"
            description="Take your subscription, usage and billing data with you."
          />
          <div className="panel-body space-y-3">
            <p className="text-[12px] leading-relaxed text-ink-2">
              Export the entire MODELVAULT database — subscription contracts,
              usage telemetry and billing entries — as a single JSON archive.
            </p>
            <button
              type="button"
              onClick={exportData}
              className="btn-secondary"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Export database (JSON)
            </button>

            {exportNotice && (
              <div className="flex items-start justify-between gap-3 border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[11.5px] leading-relaxed text-warning animate-fade-in">
                <span>
                  <span className="font-medium">
                    No export endpoint is wired in this build.
                  </span>{" "}
                  Nothing was generated or downloaded. The archive generator
                  still needs to be implemented server-side.
                </span>
                <button
                  type="button"
                  onClick={() => setExportNotice(false)}
                  className="shrink-0 text-warning/70 transition-colors hover:text-warning"
                  aria-label="Dismiss export notice"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2 border-t border-line pt-4 text-[11.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium text-ink-2">MODELVAULT</span> v1.0.0 ·
            Enterprise
          </p>
          <p>Your AI ecosystem. One command center.</p>
        </div>
      </form>
    </div>
  )
}
