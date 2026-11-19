"use client"

import { useEffect, useState } from "react"
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
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import { useModalA11y } from "@/lib/use-modal-a11y"

interface ProviderIntegrationState {
  slug: string
  name: string
  status: "connected" | "manual" | "not_connected"
  lastSync: string | null
  keyPreview?: string | null
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)

  const dialogRef = useModalA11y(Boolean(selectedProvider), () =>
    setSelectedProvider(null)
  )

  useEffect(() => {
    let active = true
    fetch("/api/integrations")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const records: Array<{
          providerSlug: string
          status: "connected" | "manual" | "not_connected"
          features: {
            subscriptionQuotas?: boolean
            apiTokens?: boolean
            invoices?: boolean
          } | null
          notes: string | null
          keyPreview: string | null
          lastSyncAt: string | null
        }> = json?.data || []
        if (records.length > 0) {
          setIntegrations((prev) =>
            prev.map((item) => {
              const record = records.find((r) => r.providerSlug === item.slug)
              if (!record) return item
              return {
                ...item,
                status: record.status,
                lastSync: record.lastSyncAt
                  ? new Date(record.lastSyncAt).toLocaleString()
                  : item.lastSync,
                notes: record.notes || item.notes,
                keyPreview: record.keyPreview,
                features: {
                  subscriptionQuotas:
                    record.features?.subscriptionQuotas ??
                    item.features.subscriptionQuotas,
                  apiTokens: record.features?.apiTokens ?? item.features.apiTokens,
                  invoices: record.features?.invoices ?? item.features.invoices,
                },
              }
            })
          )
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingIntegrations(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) return
    setSyncing(true)
    setErrorMessage(null)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: selectedProvider.slug,
          apiKey: apiKeyInput.trim() || undefined,
          status: apiKeyInput.trim() ? "connected" : "manual",
          features: selectedProvider.features,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save integration")

      setIntegrations((prev) =>
        prev.map((item) =>
          item.slug === selectedProvider.slug
            ? {
                ...item,
                status: apiKeyInput.trim() ? "connected" : "manual",
                lastSync: json.data?.lastSyncAt
                  ? new Date(json.data.lastSyncAt).toLocaleString()
                  : item.lastSync,
                keyPreview: json.data?.keyPreview ?? item.keyPreview,
              }
            : item
        )
      )
      setSelectedProvider(null)
      setApiKeyInput("")
      setToastMessage(
        apiKeyInput.trim()
          ? `${selectedProvider.name} connected. Key encrypted at rest.`
          : `${selectedProvider.name} saved in manual tracking mode.`
      )
      setTimeout(() => setToastMessage(null), 4000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save integration")
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!selectedProvider) return
    setSyncing(true)
    setErrorMessage(null)
    try {
      const res = await fetch(
        `/api/integrations?providerSlug=${encodeURIComponent(selectedProvider.slug)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Failed to disconnect")
      }
      setIntegrations((prev) =>
        prev.map((item) =>
          item.slug === selectedProvider.slug
            ? { ...item, status: "manual", keyPreview: null, lastSync: "Manual" }
            : item
        )
      )
      setSelectedProvider(null)
      setApiKeyInput("")
      setToastMessage(`${selectedProvider.name} credential removed.`)
      setTimeout(() => setToastMessage(null), 4000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to disconnect")
    } finally {
      setSyncing(false)
    }
  }

  const capability = (label: string, supported: boolean) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em]",
        supported
          ? "border-success/25 bg-success-soft text-success"
          : "border-line bg-surface-2 text-ink-3"
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
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Workspace · Connectors"
        title="Integrations"
        description="Connectors for live API telemetry, encrypted credential storage, and manual tracking fallbacks."
      />

      {loadingIntegrations ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            {
              label: "Connected",
              value: String(
                integrations.filter((item) => item.status === "connected").length
              ),
              meta: "Live official telemetry",
              accent: true,
            },
            {
              label: "Manual",
              value: String(
                integrations.filter((item) => item.status === "manual").length
              ),
              meta: "Tracked by hand",
            },
            {
              label: "Not connected",
              value: String(
                integrations.filter(
                  (item) => item.status === "not_connected"
                ).length
              ),
              meta: "Available to configure",
            },
            {
              label: "Token capable",
              value: String(
                integrations.filter((item) => item.features.apiTokens).length
              ),
              meta: "Report API usage",
            },
          ]}
        />
      )}

      {toastMessage && (
        <div className="flex items-center justify-between gap-3 border border-success/25 bg-success-soft px-3.5 py-2.5 text-[12px] text-success animate-fade-in">
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

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[12px] text-danger animate-fade-in">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-danger/70 hover:text-danger"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <section className="flex items-start gap-3.5 border-y border-line py-4">
        <Lock
          className="mt-0.5 h-4 w-4 shrink-0 text-accent"
          strokeWidth={1.8}
        />
        <div className="space-y-1">
          <h2 className="font-display text-[14.5px] font-medium tracking-[-0.02em] text-ink">
            Zero-knowledge credential security
          </h2>
          <p className="max-w-3xl text-[12px] leading-relaxed text-ink-2">
            MODELVAULT adheres to provider terms of service. We never request
            account passwords or scrape private consumer portals. Developer API
            keys are encrypted at rest using server-side AES-GCM and never
            exposed to browser bundles. Where official telemetry APIs do not
            exist, we provide transparent manual logging.
          </p>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 className="panel-title">Provider directory</h2>
            <p className="panel-subtitle">
              Read-only adapters for quota, token, and invoice telemetry.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {integrations.length} providers
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((item) => (
            <article
              key={item.slug}
              className="flex flex-col border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProviderIcon slug={item.slug} size="md" />
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-medium text-ink">
                      {item.name}
                    </h3>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      {item.lastSync || "Manual"}
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
                <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                  {item.status === "connected" ? "Encrypted vault" : "Manual mode"}
                </span>
                <button
                  onClick={() => setSelectedProvider(item)}
                  className="btn-secondary btn-sm"
                >
                  {item.status === "connected" ? "Reconfigure" : "Configure"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedProvider && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="configure-provider-title"
            className="panel max-h-[90vh] w-full max-w-md overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent">
                  Telemetry adapter
                </p>
                <h2
                  id="configure-provider-title"
                  className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink"
                >
                  {selectedProvider.name}
                </h2>
                <p className="mt-1 text-[11.5px] text-ink-3">
                  Read-only quota, token, and invoice access.
                </p>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="icon-btn -mr-1.5 -mt-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
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
                  <label className="label" htmlFor="provider-api-key">
                    API key or access token
                  </label>
                  <div className="relative">
                    <Key
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                      strokeWidth={1.8}
                    />
                    <input
                      id="provider-api-key"
                      type="password"
                      required={!selectedProvider.keyPreview}
                      placeholder={
                        selectedProvider.keyPreview
                          ? `Saved key ${selectedProvider.keyPreview} — enter a new key to replace`
                          : "sk-…"
                      }
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="field pl-8 font-mono text-[12px]"
                    />
                  </div>
                </div>

                <div className="border border-line bg-surface-2/50 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-success">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Encrypted client boundary
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                    Keys are used only for read-only quota and balance telemetry
                    and are never transmitted to third parties.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
                <div>
                  {selectedProvider.keyPreview && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={syncing}
                      className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-danger hover:underline disabled:opacity-50"
                    >
                      Disconnect credential
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                    {syncing ? "Saving…" : selectedProvider.keyPreview ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
