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
import { TrustBadge } from "@/components/ui/trust-badge"
import { cn } from "@/lib/utils"
import { useModalA11y } from "@/lib/use-modal-a11y"

interface CapabilitySpec {
  canSyncUsage: boolean
  canSyncCredits: boolean
  canReplenish: boolean
  canCode: boolean
  authMode: string
  syncCadence: string
  termsStatus: string
  billingUrl: string | null
  capabilitiesNote: string
}

interface ProviderIntegrationState {
  slug: string
  name: string
  status: "connected" | "manual" | "not_connected"
  lastSync: string | null
  lastSyncIso?: string | null
  keyPreview?: string | null
  hasKey?: boolean
  lastSyncMessage?: string | null
  capability?: CapabilitySpec
  features: {
    subscriptionQuotas: boolean
    apiTokens: boolean
    invoices: boolean
  }
  notes: string
}

const INTEGRATION_CATALOG: ProviderIntegrationState[] = [
  {
    slug: "openrouter",
    name: "OpenRouter",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: true, apiTokens: true, invoices: true },
    notes: "Official credits & usage sync plus unified multi-model Studio coding.",
  },
  {
    slug: "openai",
    name: "OpenAI / ChatGPT",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: true, apiTokens: true, invoices: false },
    notes: "Standard keys power Studio coding; Organization Admin keys (sk-admin-...) sync org usage.",
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: true, apiTokens: true, invoices: false },
    notes: "Standard keys power Studio coding; Admin keys (sk-ant-admin-...) sync org usage.",
  },
  {
    slug: "google",
    name: "Google / Gemini",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Gemini API key powers Studio coding; usage/billing tracked manually.",
  },
  {
    slug: "huggingface",
    name: "Hugging Face",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "HF token verification and Inference Router coding supported.",
  },
  {
    slug: "github",
    name: "GitHub / Repos & PRs",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "Connect a GitHub PAT (repo scope) to clone private repos & open Pull Requests.",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    status: "not_connected",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: true, invoices: false },
    notes: "API key check supported; usage tracked manually.",
  },
  {
    slug: "cursor",
    name: "Cursor",
    status: "manual",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Consumer IDE seat tracked manually (sanctioned local bridge optional in Studio).",
  },
  {
    slug: "antigravity",
    name: "Antigravity",
    status: "manual",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Consumer IDE plan tracked manually without credential scraping.",
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    status: "manual",
    lastSync: null,
    hasKey: false,
    features: { subscriptionQuotas: false, apiTokens: false, invoices: false },
    notes: "Consumer IDE plan tracked manually.",
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
    capability?: CapabilitySpec
    lastSyncLog?: { status?: string; message?: string | null } | null
    features?: {
      subscriptionQuotas?: boolean
      apiTokens?: boolean
      invoices?: boolean
    } | null
  }>,
  capList: Array<{ providerSlug: string } & CapabilitySpec>
): ProviderIntegrationState[] {
  const map = new Map(remote.map((item) => [item.providerSlug, item]))
  const capMap = new Map(capList.map((c) => [c.providerSlug, c]))

  return INTEGRATION_CATALOG.map((item) => {
    const saved = map.get(item.slug)
    const cap = saved?.capability || capMap.get(item.slug)
    if (!saved) return { ...item, capability: cap }
    const status =
      saved.status === "connected" || saved.status === "manual" || saved.status === "not_connected"
        ? saved.status
        : item.status
    return {
      ...item,
      status,
      hasKey: Boolean(saved.hasKey),
      lastSyncIso: saved.lastSyncAt || null,
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
      notes: saved.notes || cap?.capabilitiesNote || item.notes,
      capability: cap,
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
  const [syncingAll, setSyncingAll] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useModalA11y(modalOpen, () => setModalOpen(false))

  const load = async () => {
    try {
      setLoading(true)
      const [res, capRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/providers/capabilities").catch(() => null),
      ])
      const [json, capJson] = await Promise.all([
        res.json(),
        capRes ? capRes.json().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ])
      const capList = Array.isArray(capJson?.data?.capabilities) ? capJson.data.capabilities : []
      if (res.ok && json.data) {
        setIntegrations(mergeIntegrations(json.data, capList))
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
      await fetch("/api/usage-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerSlug: item.slug }),
      }).catch(() => {})
      setNotice(json.verification?.message || `Synced ${item.name}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncingSlug(null)
    }
  }

  const handleSyncAllSnapshots = async () => {
    setSyncingAll(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch("/api/usage-sync", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Usage sync failed")
      const s = json.data
      setNotice(
        `Usage snapshot run complete: ${s.liveUpdatedCount} live updated, ${s.unsupportedCount} manual/unsupported, ${s.errorCount} sync errors.`
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Usage sync failed")
    } finally {
      setSyncingAll(false)
    }
  }

  const connected = integrations.filter((i) => i.status === "connected").length
  const manual = integrations.filter((i) => i.status === "manual").length
  const codingReady = integrations.filter((i) => i.status === "connected" && i.capability?.canCode).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Operations · Capability Registry & Keys"
        title="Integrations"
        description="Official capability registry per provider, AES-256-GCM credential vault, and live usage/credit sync status."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAllSnapshots}
              disabled={syncingAll}
              className="btn-secondary btn-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncingAll && "animate-spin")} />
              {syncingAll ? "Syncing snapshots…" : "Sync usage & credits"}
            </button>
            <span className="badge bg-success-soft text-success">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} />
              Encrypted at rest · Official APIs only
            </span>
          </div>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            { label: "Connected", value: String(connected), meta: "Saved credentials in DB", accent: connected > 0 },
            { label: "Studio coding ready", value: String(codingReady), meta: "Direct API coding backends", accent: codingReady > 0 },
            { label: "Manual only", value: String(manual), meta: "No automated provider API" },
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
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Provider capability matrix</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Every provider explicitly declares whether usage sync, credit balances, replenishment, and Studio coding are officially supported or manual-only.
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
          <div className="overflow-x-auto border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th className="text-center">Usage Sync</th>
                  <th className="text-center">Credits</th>
                  <th className="text-center">Coding</th>
                  <th>Terms / Auth</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((item) => {
                  const cap = item.capability
                  return (
                    <tr key={item.slug}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon slug={item.slug} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-ink">{item.name}</p>
                            <p className="max-w-[360px] truncate text-[11px] text-ink-3">
                              {item.keyPreview ? `Key ${item.keyPreview} · ` : ""}
                              {item.lastSyncMessage || item.notes}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={item.status} />
                          {item.lastSyncIso && (
                            <TrustBadge
                              source={cap?.canSyncCredits || cap?.canSyncUsage ? "live_api_sync" : "manual"}
                              syncedAt={item.lastSyncIso}
                              showFreshness
                            />
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        {cap?.canSyncUsage ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="text-center">
                        {cap?.canSyncCredits ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="text-center">
                        {cap?.canCode ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                        ) : (
                          <Minus className="mx-auto h-3.5 w-3.5 text-ink-3/50" strokeWidth={2} />
                        )}
                      </td>
                      <td className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        {cap?.termsStatus || "manual"} · {cap?.authMode || "manual"}
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
                              {syncingSlug === item.slug ? "Syncing…" : "Verify & Sync"}
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
                  )
                })}
              </tbody>
            </table>
          </div>
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
                  <option value="connected">Connected — enable live verification &amp; Studio coding</option>
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
