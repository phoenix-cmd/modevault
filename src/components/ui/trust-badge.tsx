import { cn } from "@/lib/utils"

export type ProvenanceSource =
  | "live_api_sync"
  | "api_sync"
  | "manual"
  | "manual_topup"
  | "estimated"
  | "unsupported"
  | "deterministic_fallback"
  | "local_bridge"
  | "direct_api"
  | "agent_execution"

const SOURCE_META: Record<
  string,
  { label: string; className: string; title: string }
> = {
  live_api_sync: {
    label: "Live API sync",
    className: "bg-success-soft text-success border border-success/25",
    title: "Numbers retrieved directly from provider API",
  },
  api_sync: {
    label: "Live API sync",
    className: "bg-success-soft text-success border border-success/25",
    title: "Numbers retrieved directly from provider API",
  },
  direct_api: {
    label: "Direct API",
    className: "bg-success-soft text-success border border-success/25",
    title: "Official provider REST API using user credential",
  },
  local_bridge: {
    label: "Local CLI bridge",
    className: "bg-info-soft text-info border border-info/25",
    title: "Sanctioned loopback CLI/OAuth bridge",
  },
  manual: {
    label: "Manual entry",
    className: "bg-info-soft text-info border border-info/25",
    title: "Entered or imported manually by user",
  },
  manual_topup: {
    label: "Manual top-up",
    className: "bg-info-soft text-info border border-info/25",
    title: "Manually confirmed top-up receipt",
  },
  estimated: {
    label: "Estimated",
    className: "bg-warning-soft text-warning border border-warning/25",
    title: "Estimated from catalog token rates or usage heuristics",
  },
  deterministic_fallback: {
    label: "Deterministic fallback",
    className: "bg-warning-soft text-warning border border-warning/25",
    title: "Low confidence — generated deterministically without a live LLM key",
  },
  agent_execution: {
    label: "Studio run",
    className: "bg-accent-soft text-accent border border-accent/25",
    title: "Attributed from a Studio execution",
  },
  unsupported: {
    label: "Unsupported",
    className: "bg-surface-2 text-ink-3 border border-line",
    title: "Provider does not expose a live API for this capability",
  },
}

export function formatFreshnessLabel(syncedAt?: string | Date | null): string {
  if (!syncedAt) return "Never synced"
  const ts = typeof syncedAt === "string" ? new Date(syncedAt).getTime() : syncedAt.getTime()
  if (!Number.isFinite(ts)) return "Never synced"
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 45) return "Synced just now"
  const mins = Math.floor(diffSec / 60)
  if (mins < 60) return `Synced ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Synced ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Synced ${days}d ago`
}

export function TrustBadge({
  source,
  syncedAt,
  showFreshness = false,
  className,
}: {
  source?: string | null
  syncedAt?: string | Date | null
  showFreshness?: boolean
  className?: string
}) {
  const key = (source || "manual").toLowerCase()
  const meta = SOURCE_META[key] || SOURCE_META.manual
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn("badge font-mono text-[9.5px] uppercase tracking-[0.06em]", meta.className)} title={meta.title}>
        {meta.label}
      </span>
      {showFreshness && (
        <span className="font-mono text-[10px] text-ink-3">
          {formatFreshnessLabel(syncedAt)}
        </span>
      )}
    </span>
  )
}
