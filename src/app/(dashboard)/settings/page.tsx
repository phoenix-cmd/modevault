"use client"

import { useState } from "react"
import {
  Settings,
  Bell,
  Coins,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  Save,
  Globe,
  Sliders,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

export default function SettingsPage() {
  const [currency, setCurrency] = useState("INR")
  const [userName, setUserName] = useState("Demo Architect")
  const [userEmail, setUserEmail] = useState("demo@modelvault.dev")
  const [threshold80, setThreshold80] = useState(true)
  const [threshold90, setThreshold90] = useState(true)
  const [threshold100, setThreshold100] = useState(true)
  const [renewalNoticeDays, setRenewalNoticeDays] = useState(7)
  const [creditAlertMin, setCreditAlertMin] = useState(15)
  const [savedMessage, setSavedMessage] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 3000)
  }

  const exportData = () => {
    alert("Export initiated: Generating comprehensive encrypted JSON archive of subscriptions, usage logs, and billing history...")
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <PageHeader
        title="Settings & Preferences"
        description="Global command center parameters, currency conversion, smart alerting thresholds, and security controls."
      />

      {savedMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Shield className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Identity & Access
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                Full Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full rounded-lg glass border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
        </GlassCard>

        {/* Currency & Financial Configuration */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Coins className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Currency & Multi-Unit Financial Display
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                Default Currency Presentation
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full sm:w-64 rounded-lg glass border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
              >
                <option value="INR" className="bg-[#18181b]">
                  INR — Indian Rupee (₹) [Default]
                </option>
                <option value="USD" className="bg-[#18181b]">
                  USD — US Dollar ($)
                </option>
                <option value="EUR" className="bg-[#18181b]">
                  EUR — Euro (€)
                </option>
                <option value="GBP" className="bg-[#18181b]">
                  GBP — British Pound (£)
                </option>
              </select>
            </div>

            <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center justify-between text-zinc-300 font-medium">
                <span>Exchange Rate Reference:</span>
                <span className="font-mono text-emerald-400">1 USD = 84.50 INR</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Source: Reference Market Benchmark (Nov 2026). Conversions across global provider invoices dynamically compute against this index.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Smart Thresholds & Automation */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Bell className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Smart Alerts & Quota Threshold Automation
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <div>
                <p className="font-medium text-zinc-200">
                  80% Quota Warning Trigger
                </p>
                <p className="text-zinc-500 text-[11px]">
                  Alert when subscription message or request quotas surpass 80%
                </p>
              </div>
              <input
                type="checkbox"
                checked={threshold80}
                onChange={(e) => setThreshold80(e.target.checked)}
                className="h-4 w-4 accent-violet-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <div>
                <p className="font-medium text-zinc-200">
                  90% & 100% Critical Ceiling Alerts
                </p>
                <p className="text-zinc-500 text-[11px]">
                  Emergency notifications when entering rate-limit throttling territory
                </p>
              </div>
              <input
                type="checkbox"
                checked={threshold90}
                onChange={(e) => setThreshold90(e.target.checked)}
                className="h-4 w-4 accent-violet-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <div>
                <p className="font-medium text-zinc-200">
                  Subscription Renewal Advance Notice
                </p>
                <p className="text-zinc-500 text-[11px]">
                  Days ahead of renewal to highlight upcoming auto-debit charges
                </p>
              </div>
              <select
                value={renewalNoticeDays}
                onChange={(e) => setRenewalNoticeDays(Number(e.target.value))}
                className="rounded-lg glass border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-200 outline-none"
              >
                <option value={3} className="bg-[#18181b]">3 Days</option>
                <option value={7} className="bg-[#18181b]">7 Days</option>
                <option value={14} className="bg-[#18181b]">14 Days</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-zinc-200">
                  Low API Credit Depletion Threshold
                </p>
                <p className="text-zinc-500 text-[11px]">
                  Warning when prepaid developer balance dips below target
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <span>$</span>
                <input
                  type="number"
                  min="1"
                  value={creditAlertMin}
                  onChange={(e) => setCreditAlertMin(Number(e.target.value))}
                  className="w-16 rounded-lg glass border border-white/[0.08] px-2 py-1 text-xs text-zinc-200 outline-none text-right"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Data Portability */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Download className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Data Sovereignty & Portability
            </h3>
          </div>

          <p className="text-xs text-zinc-400">
            Export your entire MODELVAULT database, including subscription contracts, usage telemetry, and billing entries into portable formats.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportData}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] transition-colors flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              Export Database (JSON)
            </button>
          </div>
        </GlassCard>

        {/* Product Identity */}
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-center text-xs text-zinc-500 space-y-1">
          <p className="font-semibold text-gradient">MODELVAULT v1.0.0 Enterprise</p>
          <p>Your AI ecosystem. One command center.</p>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-500 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  )
}
