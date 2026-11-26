"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Info,
  ShieldAlert,
  Trash2,
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
  actionUrl?: string | null
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
  const [filter, setFilter] = useState("all")

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data?.notifications) setNotifications(json.data.notifications)
    } catch (err) {
      console.error("Failed to load notifications", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      }
    } catch (err) {
      console.error("Failed to mark read", err)
    }
  }

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } catch (err) {
      console.error("Failed to mark all read", err)
    }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete notification", err)
    }
  }

  const clearRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "DELETE" })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.isRead))
      }
    } catch (err) {
      console.error("Failed to clear read notifications", err)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const readCount = notifications.length - unreadCount
  const criticalCount = notifications.filter((n) => n.severity === "critical" && !n.isRead).length

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.isRead
      if (filter === "critical") return n.severity === "critical"
      if (filter === "warning") return n.severity === "warning"
      return true
    })
  }, [notifications, filter])

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Operations · Inbox"
        title="Notifications"
        description="System alerts for budget thresholds, renewal windows, and integration events."
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn-secondary btn-sm">
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button onClick={clearRead} className="btn-ghost btn-sm text-ink-3 hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                Clear read ({readCount})
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            { label: "Unread", value: String(unreadCount), accent: unreadCount > 0 },
            { label: "Critical", value: String(criticalCount), meta: criticalCount > 0 ? "Needs attention" : "Clear" },
            { label: "Total", value: String(notifications.length) },
          ]}
        />
      )}

      <section className="border-t border-line pt-5">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Activity</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              {filtered.length} notification{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="select select-sm w-full sm:w-auto"
              aria-label="Filter notifications"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="border-b border-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton mt-0.5 h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-48" />
                  <div className="skeleton h-2.5 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-b border-line py-12">
            <div className="flex items-center gap-2 text-ink-3">
              <Bell className="h-4 w-4" strokeWidth={1.8} />
              <p className="text-[13px] font-medium text-ink">No notifications</p>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {filter === "all"
                ? "Alerts and system events will appear here."
                : "No notifications match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="border-t border-line">
            {filtered.map((n) => {
              const meta = severityMeta(n.severity)
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 border-b border-line py-3.5 last:border-b-0 sm:gap-4",
                    !n.isRead && "bg-surface-2/20 -mx-1 px-1 sm:-mx-2 sm:px-2"
                  )}
                >
                  <span className={cn("mt-0.5 shrink-0", meta.tone)} aria-hidden>
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn("text-[13px] font-medium text-ink", !n.isRead && "font-semibold")}>{n.title}</p>
                      {!n.isRead && (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                          <span className="sr-only">Unread</span>
                        </>
                      )}
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">{meta.label}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{n.message}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <p className="font-mono text-[10px] text-ink-3 tabular-nums">
                        {new Date(n.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {n.actionUrl && n.actionUrl.startsWith("/") && (
                        <Link
                          href={n.actionUrl}
                          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-accent hover:underline"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity [@media(hover:hover)]:lg:opacity-0 [@media(hover:hover)]:lg:group-hover:opacity-100 [@media(hover:hover)]:lg:group-focus-within:opacity-100">
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="icon-btn" aria-label="Mark as read" title="Mark as read">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="icon-btn hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
