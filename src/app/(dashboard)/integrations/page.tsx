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
    notes: "Developer API usage and billing data syncs automatically when connected.",
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    status: "connected",
    lastSync: "1 hour ago",
    features: { subscriptionQuotas: false, apiTokens: true, invoices: true },
    notes: "Claude Pro quotas are not available via API and remain manual.",
  },
  {
    slug: "google",
    name: "Google / Gemini",
    status: "manual",
    lastSync: "Yesterday",
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Consumer subscription data is tracked manually in this workspace.",
  },
  {
    slug: "github",
    name: "GitHub / Copilot",
    status: "manual",
    lastSync: "2 days ago",
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Seat and Copilot usage tracking is managed manually.",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    status: "not_connected",
    lastSync: null,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Connect a key to enable API usage monitoring for this provider.",
  },
  {
    slug: "cursor",
    name: "Cursor",
    status: "not_connected",
    lastSync: null,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Pro request tracking is currently managed manually.",
  },
]

function mergeIntegrations(
  remote: Array<{
    providerSlug: string
    status?: string
    lastSyncAt?: string | null
    keyPreview?: string | null
    notes?: string | null
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
      lastSync: saved.lastSyncAt
        ? new Date(saved.lastSyncAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : item.lastSync,
      keyPreview: saved.keyPreview ?? item.keyPreview,
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
  const [statusValue, setStatusValue] = useState<"connected" | "manual" | "not_connected">("manual")
  const [saving, setSaving] = useState(false)
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
    setStatusValue(item.status)
    setKeyValue("")
    setError(null)
    setModalOpen(true)
  }

  const handleConnect = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: selected.slug,
          status: statusValue,
          apiKey: keyValue || undefined,
          notes: selected.notes,
          features: selected.features,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save integration")
      await load()
      setModalOpen(false)
      setKeyValue("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save integration")
    } finally {
      setSaving(false)
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
        description="Provider connections for automated usage sync, billing, and quota data. Catalog entries without a saved record are shown with local defaults."
        action={
          <span className="badge bg-success-soft text-success">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
            Keys stored encrypted
          </span>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            { label: "Connected", value: String(connected), meta: "API sync active", accent: true },
            { label: "Manual", value: String(manual), meta: "Tracked without sync" },
            { label: "Pending", value: String(pending), meta: "Not yet configured" },
          ]}
        />
      )}

      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Provider catalog</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Connect a provider API key to enable automated sync where supported.
            </p>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="mb-4 border border-danger/25 bg-danger-soft/40 px-3 py-2.5 text-[12px] text-danger">{error}</div>
        )}

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
              <table className="data-table min-w-[860px]">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Status</th>
                    <th className="text-center">Sub quotas</th>
                    <th className="text-center">API tokens</th>
                    <th className="text-center">Invoices</th>
                    <th>Last sync</th>
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
                            <p className="max-w-[360px] truncate text-[11px] text-ink-3">
                              {item.keyPreview ? `Key ${item.keyPreview} · ` : ""}
                              {item.notes}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="text-center">
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
                      <td className="text-center">
                        {item.features.invoices ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="whitespace-nowrap font-mono text-[10.5px] text-ink-3">{item.lastSync || "Never"}</td>
                      <td className="text-right">
                        <button
                          onClick={() => openModal(item)}
                          className={cn(item.status === "connected" ? "btn-ghost btn-sm" : "btn-secondary btn-sm")}
                        >
                          {item.status === "connected" ? "Manage" : "Connect"}
                        </button>
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
                        <p className="text-[13px] font-medium text-ink">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-3">{item.lastSync ? `Synced ${item.lastSync}` : "Never synced"}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 pl-10 text-[11.5px] leading-relaxed text-ink-3">{item.notes}</p>
                  <div className="mt-3 flex items-center justify-between pl-10">
                    <div className="flex items-center gap-3 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      <span className={item.features.apiTokens ? "text-ink-2" : ""}>API</span>
                      <span className={item.features.invoices ? "text-ink-2" : ""}>Invoices</span>
                      <span className={item.features.subscriptionQuotas ? "text-ink-2" : ""}>Quotas</span>
                    </div>
                    <button onClick={() => openModal(item)} className="btn-ghost btn-sm">
                      {item.status === "connected" ? "Manage" : "Connect"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] animate-fade-in">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="integration-modal-title"
            className="panel relative w-full max-w-lg shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ProviderIcon slug={selected.slug} size="sm" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Provider connection</p>
                  <h2 id="integration-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                    {selected.status === "connected" ? "Manage" : "Connect"} {selected.name}
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
                <label className="label">API key</label>
                <div className="relative">
                  <Key className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={
                      selected.keyPreview
                        ? `Leave blank to keep ${selected.keyPreview}`
                        : "sk-… or provider API key"
                    }
                    className="field pl-9"
                  />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                  <Lock className="h-3 w-3" strokeWidth={2} />
                  Keys are encrypted at rest. Leave blank to keep the existing key.
                </p>
              </div>

              <div>
                <label className="label">Connection status</label>
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as "connected" | "manual" | "not_connected")}
                  className="select"
                >
                  <option value="connected">Connected — enable automated sync</option>
                  <option value="manual">Manual — track without sync</option>
                  <option value="not_connected">Not connected</option>
                </select>
              </div>

              <div className="border border-line bg-surface-2/30 p-3.5">
                <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">Sync capabilities</p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-ink-2">
                  <li className="flex items-center gap-2">
                    {selected.features.apiTokens ? <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} /> : <Minus className="h-3.5 w-3.5 text-ink-3" strokeWidth={2} />}
                    API token usage
                  </li>
                  <li className="flex items-center gap-2">
                    {selected.features.invoices ? <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} /> : <Minus className="h-3.5 w-3.5 text-ink-3" strokeWidth={2} />}
                    Billing and invoices
                  </li>
                  <li className="flex items-center gap-2">
                    {selected.features.subscriptionQuotas ? <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} /> : <Minus className="h-3.5 w-3.5 text-ink-3" strokeWidth={2} />}
                    Subscription quotas
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleConnect} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save integration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
