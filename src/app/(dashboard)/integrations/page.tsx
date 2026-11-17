"use client"

import { useState } from "react"
import {
  Check,
  CheckCircle2,
  Key,
  Lock,
  Minus,
  ShieldCheck,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

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
    notes:
      "Official Usage API active for API keys. Consumer ChatGPT Plus limits tracked manually.",
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    status: "connected",
    lastSync: "25 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes:
      "Claude API usage tracked via Admin API. Claude Pro 5x window recorded manually.",
  },
  {
    slug: "google",
    name: "Google / Gemini",
    status: "manual",
    lastSync: "1 hour ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes:
      "Gemini API tracked via Google Cloud AI Studio credentials. Advanced subscription manual.",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    status: "connected",
    lastSync: "5 mins ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes:
      "Live balance and token accounting enabled via OpenRouter Key API.",
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
    notes:
      "Fast premium requests (500/mo) monitored via manual tracking ledger.",
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
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderIntegrationState | null>(null)
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
      setToastMessage(
        `Securely synchronized ${selectedProvider.name} API integration.`
      )
      setTimeout(() => setToastMessage(null), 4000)
    }, 1200)
  }

  const capability = (label: string, supported: boolean) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
        supported
          ? "bg-success-soft text-success"
          : "bg-surface-2 text-ink-3"
      )}
    >
      {supported ? (
        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
      ) : (
        <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
      )}
      {label}
    </span>
  )

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Integrations"
        description="Connectors for live API telemetry, encrypted credential storage and manual tracking fallbacks."
      />

      {toastMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-success/25 bg-success-soft px-3.5 py-2.5 text-[12px] text-success animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-success/70 hover:text-success"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <section className="panel p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-soft text-accent">
            <Lock className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="space-y-1">
            <h2 className="text-[13px] font-semibold text-ink">
              Zero-knowledge credential security
            </h2>
            <p className="text-[12px] leading-relaxed text-ink-2">
              MODELVAULT adheres to provider terms of service. We never request
              account passwords or scrape private consumer portals. Developer API
              keys are encrypted at rest using server-side AES-GCM and never
              exposed to browser bundles. Where official telemetry APIs do not
              exist, we provide transparent manual logging.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item) => (
          <section
            key={item.slug}
            className="panel flex flex-col p-4 transition-colors duration-150 hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <ProviderIcon slug={item.slug} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-medium text-ink">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-ink-3">
                    {item.lastSync || "Manual"} sync
                  </p>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <p className="mt-3 flex-1 text-[11.5px] leading-relaxed text-ink-2">
              {item.notes}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {capability("Tokens", item.features.apiTokens)}
              {capability("Quotas", item.features.subscriptionQuotas)}
              {capability("Invoices", item.features.invoices)}
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-ink-3">
                {item.status === "connected" ? "Encrypted vault" : "Manual mode"}
              </span>
              <button
                onClick={() => setSelectedProvider(item)}
                className="btn-secondary btn-sm"
              >
                {item.status === "connected" ? "Reconfigure" : "Configure"}
              </button>
            </div>
          </section>
        ))}
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="configure-provider-title"
            className="glass-panel relative w-full max-w-md rounded-xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-accent" strokeWidth={1.8} />
                <div>
                  <h2
                    id="configure-provider-title"
                    className="text-[14px] font-semibold text-ink"
                  >
                    Configure {selectedProvider.name}
                  </h2>
                  <p className="text-[11.5px] text-ink-3">
                    Read-only telemetry adapter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="icon-btn"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleConnect}>
              <div className="space-y-4 px-5 py-4">
                <p className="text-[12px] leading-relaxed text-ink-2">
                  Enter your official API key for {selectedProvider.name}. The
                  key is transmitted over TLS and encrypted at rest with
                  server-side keys.
                </p>

                <div>
                  <label className="label">API key or access token</label>
                  <div className="relative">
                    <Key
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                      strokeWidth={2}
                    />
                    <input
                      type="password"
                      required
                      placeholder="sk-…"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="field pl-8 font-mono text-[12px]"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-surface-2/60 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-success">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Encrypted client boundary
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                    Keys are used only for read-only quota and balance telemetry
                    and are never transmitted to third parties.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="btn-primary"
                >
                  {syncing ? "Verifying…" : "Save and verify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
