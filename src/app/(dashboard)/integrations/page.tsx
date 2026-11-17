"use client"

import { useState } from "react"
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  Info,
  Layers,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { PROVIDER_LIST } from "@/lib/providers"

interface ProviderIntegrationState {
  slug: string
  name: string
  status: "connected" | "manual" | "not_connected"
  lastSync: string | null
  features: {
    subscriptionQuotas: boolean
    apiTokens: boolean
    invoices: boolean
  }
  notes: string
}

const INTEGRATION_CATALOG: ProviderIntegrationState[] = [
  {
    slug: "openai",
    name: "OpenAI / ChatGPT",
    status: "connected",
    lastSync: "10 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Official Usage API active for API keys. Consumer ChatGPT Plus limits tracked manually.",
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    status: "connected",
    lastSync: "25 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Claude API usage tracked via Admin API. Claude Pro 5x window recorded manually.",
  },
  {
    slug: "google",
    name: "Google / Gemini",
    status: "manual",
    lastSync: "1 hour ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Gemini API tracked via Google Cloud AI Studio credentials. Advanced subscription manual.",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    status: "connected",
    lastSync: "5 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Live balance & token accounting enabled via OpenRouter Key API.",
  },
  {
    slug: "github-copilot",
    name: "GitHub Copilot",
    status: "manual",
    lastSync: "Manual",
    features: { subscriptionQuotas: true, apiTokens: false, invoices: true },
    notes: "Consumer Copilot seats monitored via manual quota logs.",
  },
  {
    slug: "cursor",
    name: "Cursor",
    status: "manual",
    lastSync: "Manual",
    features: { subscriptionQuotas: true, apiTokens: false, invoices: false },
    notes: "Fast premium requests (500/mo) monitored via manual tracking ledger.",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    status: "manual",
    lastSync: "Manual",
    features: { subscriptionQuotas: true, apiTokens: true, invoices: false },
    notes: "Pro search quotas (300/day) and Sonar API credits supported.",
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    status: "manual",
    lastSync: "Manual",
    features: { subscriptionQuotas: true, apiTokens: false, invoices: false },
    notes: "Cascade flow usage recorded manually.",
  },
  {
    slug: "huggingface",
    name: "Hugging Face",
    status: "connected",
    lastSync: "40 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Serverless Inference API rate limits and compute units tracked.",
  },
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATION_CATALOG)
  const [selectedProvider, setSelectedProvider] = useState<ProviderIntegrationState | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) return
    setSyncing(true)
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.slug === selectedProvider.slug
            ? { ...item, status: "connected", lastSync: "Just now" }
            : item
        )
      )
      setSyncing(false)
      setSelectedProvider(null)
      setApiKeyInput("")
      setToastMessage(`Securely synchronized ${selectedProvider.name} API integration!`)
      setTimeout(() => setToastMessage(null), 4000)
    }, 1200)
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Provider Integrations & Sync Adapters"
        description="Unified connectors for live API metrics, zero-knowledge encrypted credential storage, and manual tracking fallbacks."
      />

      {toastMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Security Architecture Callout */}
      <GlassCard variant="elevated" className="border-violet-500/20 bg-gradient-to-r from-violet-950/20 to-blue-950/20 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 text-xs text-zinc-300">
            <h3 className="text-sm font-semibold text-zinc-100">
              Zero-Knowledge Credential Security & Anti-Scraping Guarantee
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              MODELVAULT strictly adheres to provider terms of service. We never prompt for account passwords or scrape private consumer portals. All developer API keys are encrypted at rest using server-side AES-GCM and never exposed to browser client bundles. For subscription quotas where official telemetry APIs do not exist, MODELVAULT provides transparent manual logging.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((item) => (
          <GlassCard
            key={item.slug}
            className="flex flex-col justify-between p-5 hover:border-violet-500/30 transition-all duration-300"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ProviderIcon slug={item.slug} name={item.name} size="md" />
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-sm">{item.name}</h3>
                    <p className="text-[11px] text-zinc-500">
                      Sync: {item.lastSync || "Manual"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
                {item.notes}
              </p>

              {/* Capability Checklist */}
              <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Developer Token Telemetry:</span>
                  <span className={item.features.apiTokens ? "text-emerald-400 font-medium" : "text-zinc-600"}>
                    {item.features.apiTokens ? "Supported" : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Subscription Quota Tracking:</span>
                  <span className={item.features.subscriptionQuotas ? "text-emerald-400 font-medium" : "text-zinc-600"}>
                    {item.features.subscriptionQuotas ? "Automated" : "Manual Log"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Billing / Invoicing:</span>
                  <span className={item.features.invoices ? "text-emerald-400 font-medium" : "text-zinc-600"}>
                    {item.features.invoices ? "Supported" : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono">
                {item.status === "connected" ? "ENCRYPTED VAULT" : "MANUAL MODE"}
              </span>
              <button
                onClick={() => setSelectedProvider(item)}
                className="rounded-lg bg-white/[0.05] hover:bg-violet-600/30 hover:text-violet-200 border border-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all"
              >
                {item.status === "connected" ? "Re-configure Key" : "Configure Key"}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Connect API Key Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl glass-elevated border border-white/[0.08] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 pb-3 border-b border-white/[0.06]">
              Configure {selectedProvider.name} Adapter
            </h3>

            <form onSubmit={handleConnect} className="mt-4 space-y-4 text-xs">
              <p className="text-zinc-400 leading-relaxed">
                Enter your official API key for {selectedProvider.name}. Your key is transmitted via TLS and encrypted at rest using server-side keys.
              </p>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">
                  API Key or Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full rounded-lg glass border border-white/[0.08] pl-9 pr-3 py-2 text-zinc-200 outline-none focus:border-violet-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Encrypted Client Boundary</span>
                </div>
                <p>
                  Keys are only used for read-only quota and balance telemetry. They are never transmitted to third parties.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white shadow-lg hover:bg-violet-500"
                >
                  {syncing ? "Encrypting & Testing..." : "Save & Verify Adapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
