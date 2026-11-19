"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Info,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

type Severity = "critical" | "warning" | "info"

interface Notification {
  id: string
  title: string
  message: string
  severity: Severity | string
  isRead: boolean
  createdAt: string
}

const SEVERITY: Record<
  Severity,
  { label: string; icon: typeof Info; tone: string }
> = {
  critical: { label: "Critical", icon: ShieldAlert, tone: "text-danger" },
  warning: { label: "Warning", icon: AlertTriangle, tone: "text-warning" },
  info: { label: "Info", icon: Info, tone: "text-info" },
}

function severityMeta(severity: string) {
  return SEVERITY[(severity as Severity) in SEVERITY ? (severity as Severity) : "info"]
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data?.notifications) {
        setNotifications(json.data.notifications)
      }
    } catch (e) {
      console.error(e)
      setError("The alert stream could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const unread = notifications.filter((n) => !n.isRead)
  const counts = useMemo(
    () => ({
      critical: notifications.filter((n) => n.severity === "critical").length,
      warning: notifications.filter((n) => n.severity === "warning").length,
    }),
    [notifications]
  )

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
      setError("Marking alerts as read failed.")
    }
  }

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      if (!res.ok) throw new Error("request failed")
    } catch (e) {
      console.error(e)
      setError("That alert could not be marked as read.")
      fetchNotifs()
    }
  }

  const handleDismiss = async (id: string) => {
    const previous = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("request failed")
    } catch (e) {
      console.error(e)
      setError("That alert could not be dismissed.")
      setNotifications(previous)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Workspace · Signals"
        title="Notifications"
        description="Quota exhaustion, approval gates, and billing events across every connected provider."
        action={
          <button
            onClick={handleMarkAllRead}
            disabled={unread.length === 0}
            className="btn-secondary"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            Mark all read
          </button>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            {
              label: "Unread",
              value: String(unread.length),
              meta: unread.length > 0 ? "Awaiting review" : "Inbox clear",
              accent: unread.length > 0,
            },
            {
              label: "Critical",
              value: String(counts.critical),
              meta: "Quota or access failures",
            },
            {
              label: "Warnings",
              value: String(counts.warning),
              meta: "Approaching thresholds",
            },
            {
              label: "Total alerts",
              value: String(notifications.length),
              meta: "In this workspace",
            },
          ]}
        />
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[11.5px] text-danger">
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-danger/70 transition-colors hover:text-danger"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 className="panel-title">Alert stream</h2>
            <p className="panel-subtitle">
              Newest first. Unread alerts carry an amber rule.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {unread.length} unread / {notifications.length} total
          </span>
        </div>

        {loading ? (
          <div className="border-t border-line">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-line py-4">
                <div className="skeleton h-7 w-7 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-52" />
                  <div className="skeleton h-2.5 w-full max-w-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="border-t border-line px-6 py-16 text-center">
            <Bell className="mx-auto h-7 w-7 text-ink-3" strokeWidth={1.4} />
            <h3 className="mt-3 font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
              No alerts in this workspace
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-ink-3">
              Quota warnings and approval requests will appear here as providers
              report usage.
            </p>
          </div>
        ) : (
          <div className="border-t border-line">
            {notifications.map((n) => {
              const meta = severityMeta(n.severity)
              const Icon = meta.icon
              return (
                <article
                  key={n.id}
                  className={cn(
                    "group relative flex flex-wrap items-start justify-between gap-4 border-b border-line py-4 pl-4 pr-1 transition-colors duration-150",
                    !n.isRead ? "bg-surface-2/30" : "hover:bg-surface-2/20"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-3 left-0 w-px bg-accent transition-opacity",
                      n.isRead ? "opacity-0" : "opacity-100"
                    )}
                    aria-hidden
                  />

                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface",
                        meta.tone
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          className={cn(
                            "font-mono text-[9px] font-medium uppercase tracking-[0.12em]",
                            meta.tone
                          )}
                        >
                          {meta.label}
                        </span>
                        <h3
                          className={cn(
                            "text-[12.5px] text-ink",
                            n.isRead ? "font-medium" : "font-semibold"
                          )}
                        >
                          {n.title}
                        </h3>
                        {!n.isRead && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-accent"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-ink-2">
                        {n.message}
                      </p>
                      <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="icon-btn h-7 w-7"
                        title="Mark as read"
                        aria-label={`Mark ${n.title} as read`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(n.id)}
                      className="icon-btn h-7 w-7 hover:text-danger"
                      title="Dismiss alert"
                      aria-label={`Dismiss ${n.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
