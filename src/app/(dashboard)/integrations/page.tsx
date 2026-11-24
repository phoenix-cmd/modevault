"use client"

import { useEffect, useState } from "react"
import {
  Check,
  CheckCircle2,
  Key,
  Lock,
  Minus,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
  hasKey?: boolean
  lastSyncMessage?: string | null
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
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Connect an OpenAI API key to verify model access and power live agent runs.",
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Connect an Anthropic API key for live Claude model verification and agent runs.",
  },
  {
    slug: "google",
    name: "Google / Gemini",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Connect a Google AI Studio key for Gemini model checks and orchestration.",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: true, apiTokens: true, invoices: true },
    notes: "Supports live credit usage & limit sync plus multi-model LLM routing.",
  },
  {
    slug: "github",
    name: "GitHub / Copilot",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Connect a GitHub PAT (repo scope) to open real remote Pull Requests.",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Encrypted key storage for Perplexity API accounts (manual usage logging).",
  },
  {
    slug: "cursor",
    name: "Cursor",
    status: "manual",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Cursor consumer seat quotas are tracked manually.",
  },
]

function mergeIntegrations(
  remote: Array<{
    providerSlug: string
    status?: string
    lastSyncAt?: string | null
    keyPreview?: string | null
    hasKey?: boolean
    notes?: string | null
    lastSyncLog?: { status?: string; message?: string | null } | null
    features?: {
      subscriptionQuotas?: boolean
      apiTokens?: boolean
      invoices?: boolean
    } | null
  }>
): ProviderIntegrationState[] {
  const map = new Map(remote.map((item) => [item.providerSlug, item]))
  return INTEGRATION_CATALOG.map((item) => {
    const saved = map.get(item.slug)
    if (!saved) return item
    const status =
      saved.status === "connected" || saved.status === "manual" || saved.status === "not_connected"
        ? saved.status
        : item.status
    return {
      ...item,
      status,
      hasKey: Boolean(saved.hasKey),
      lastSync: saved.lastSyncAt
        ? new Date(saved.lastSyncAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      lastSyncMessage: saved.lastSyncLog?.message || null,
      keyPreview: saved.keyPreview ?? null,
      notes: saved.notes || item.notes,
      features: {
        subscriptionQuotas: saved.features?.subscriptionQuotas ?? item.features.subscriptionQuotas,
        apiTokens: saved.features?.apiTokens ?? item.features.apiTokens,
        invoices: saved.features?.invoices ?? item.features.invoices,
      },
    }
  })
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<ProviderIntegrationState[]>(INTEGRATION_CATALOG)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<ProviderIntegrationState | null>(null)
  const [keyValue, setKeyValue] = useState("")
  const [statusValue, setStatusValue] = useState<"connected" | "manual" | "not_connected">("connected")
  const [saving, setSaving] = useState(false)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useModalA11y(modalOpen, () => setModalOpen(false))

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/integrations")
      const json = await res.json()
      if (res.ok && json.data) {
        setIntegrations(mergeIntegrations(json.data))
      }
    } catch (err) {
      console.error("Failed to load integrations", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openModal = (item: ProviderIntegrationState) => {
    setSelected(item)
    setStatusValue(item.status === "not_connected" ? "connected" : item.status)
    setKeyValue("")
    setError(null)
    setModalOpen(true)
  }

  const handleConnect = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: selected.slug,
          action: "save",
          status: statusValue,
          apiKey: keyValue || undefined,
          notes: selected.notes,
          features: selected.features,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save integration")
      if (json.verification?.message) {
        setNotice(json.verification.message)
      } else {
        setNotice(`${selected.name} configuration saved.`)
      }
      await load()
      setModalOpen(false)
      setKeyValue("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save integration")
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations?providerSlug=${encodeURIComponent(selected.slug)}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to disconnect")
      setNotice(`Disconnected ${selected.name} and removed encrypted key.`)
      await load()
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect")
    } finally {
      setSaving(false)
    }
  }

  const handleLiveSync = async (item: ProviderIntegrationState) => {
    setSyncingSlug(item.slug)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: item.slug,
          action: "sync",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Live verification failed")
      setNotice(json.verification?.message || `Synced ${item.name}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncingSlug(null)
    }
  }

  const connected = integrations.filter((i) => i.status === "connected").length
  const manual = integrations.filter((i) => i.status === "manual").length
  const pending = integrations.filter((i) => i.status === "not_connected").length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Operations · Connections"
        title="Integrations"
        description="Connect provider credentials with AES-256-GCM encryption at rest and run live API verification and balance checks."
        action={
          <span className="badge bg-success-soft text-success">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
            Encrypted at rest · Live API verification
          </span>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            { label: "Connected", value: String(connected), meta: "Saved credentials in DB", accent: connected > 0 },
            { label: "Manual", value: String(manual), meta: "Tracked without API key" },
            { label: "Not connected", value: String(pending), meta: "Unconfigured providers" },
          ]}
        />
      )}

      {notice && (
        <div className="flex items-center justify-between gap-2 border border-success/25 bg-success-soft/40 px-4 py-2.5 text-[12px] text-success">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="icon-btn" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="border border-danger/25 bg-danger-soft/40 px-3 py-2.5 text-[12px] text-danger">{error}</div>
      )}

      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Provider catalog</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Connect an API key to verify model access live, track OpenRouter balances, or enable live GitHub PRs and agent runs.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="border-t border-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton h-8 w-8 rounded-[6px]" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-36" />
                  <div className="skeleton h-2.5 w-48" />
                </div>
                <div className="skeleton h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto border-t border-line md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Status</th>
                    <th className="hidden text-center xl:table-cell">Quotas</th>
                    <th className="text-center">API</th>
                    <th className="hidden lg:table-cell">Last verification</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((item) => (
                    <tr key={item.slug}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon slug={item.slug} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-ink">{item.name}</p>
                            <p className="max-w-[380px] truncate text-[11px] text-ink-3">
                              {item.keyPreview ? `Key ${item.keyPreview} · ` : ""}
                              {item.lastSyncMessage || item.notes}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="hidden text-center xl:table-cell">
                        {item.features.subscriptionQuotas ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="text-center">
                        {item.features.apiTokens ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap font-mono text-[10.5px] text-ink-3 lg:table-cell">
                        {item.lastSync || "Never verified"}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {item.hasKey && (
                            <button
                              type="button"
                              onClick={() => handleLiveSync(item)}
                              disabled={syncingSlug === item.slug}
                              className="btn-secondary btn-sm"
                              title="Verify live key against provider API"
                            >
                              <RefreshCw className={cn("h-3 w-3", syncingSlug === item.slug && "animate-spin")} />
                              {syncingSlug === item.slug ? "Syncing…" : "Verify"}
                            </button>
                          )}
                          <button
                            onClick={() => openModal(item)}
                            className={cn(item.status === "connected" ? "btn-ghost btn-sm" : "btn-secondary btn-sm")}
                          >
                            {item.status === "connected" || item.hasKey ? "Manage" : "Connect"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line md:hidden">
              {integrations.map((item) => (
                <div key={item.slug} className="border-b border-line py-3.5 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ProviderIcon slug={item.slug} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-3">{item.lastSync ? `Verified ${item.lastSync}` : "Not verified"}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3 sm:pl-10">
                    {item.lastSyncMessage || item.notes}
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2 sm:pl-10">
                    {item.hasKey && (
                      <button
                        type="button"
                        onClick={() => handleLiveSync(item)}
                        disabled={syncingSlug === item.slug}
                        className="btn-ghost btn-sm"
                      >
                        <RefreshCw className={cn("h-3 w-3", syncingSlug === item.slug && "animate-spin")} />
                        Verify
                      </button>
                    )}
                    <button onClick={() => openModal(item)} className="btn-secondary btn-sm shrink-0">
                      {item.status === "connected" || item.hasKey ? "Manage" : "Connect"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="integration-modal-title"
            className="panel relative max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ProviderIcon slug={selected.slug} size="sm" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Provider connection</p>
                  <h2 id="integration-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                    {selected.hasKey ? "Manage" : "Connect"} {selected.name}
                  </h2>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {error && (
                <div className="border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{error}</div>
              )}

              <div>
                <label className="label">API key / token</label>
                <div className="relative">
                  <Key className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={
                      selected.keyPreview
                        ? `Leave blank to keep ${selected.keyPreview}`
                        : "sk-… or provider API token"
                    }
                    className="field pl-9"
                  />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                  <Lock className="h-3 w-3" strokeWidth={2} />
                  Encrypted with AES-256-GCM. Verified immediately against provider API when saved.
                </p>
              </div>

              <div>
                <label className="label">Connection status</label>
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as "connected" | "manual" | "not_connected")}
                  className="select"
                >
                  <option value="connected">Connected — enable live verification &amp; agent routing</option>
                  <option value="manual">Manual — track without automated API calls</option>
                  <option value="not_connected">Not connected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3.5">
              {selected.hasKey || selected.status !== "not_connected" ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="btn-ghost text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleConnect} disabled={saving} className="btn-primary">
                  {saving ? "Saving & verifying…" : "Save & verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
