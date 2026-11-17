"use client"

import { useEffect, useState } from "react"
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <PageHeader
        title="Notification Center & Quota Alerts"
        description="Real-time alert stream for quota exhaustion, agent approval gates, and billing events."
        action={
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5] transition-all"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[#1F7A4D]" />
            Mark All as Read
          </button>
        }
      />

      <div className="rounded-xl border border-[#E8EAED] bg-[#FFFFFF] divide-y divide-[#E8EAED] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#737982]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#737982]">No unread alerts at this time.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                !n.isRead ? "bg-[rgba(213,34,45,0.02)]" : "bg-white hover:bg-[#F8F9FB]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                    n.severity === "critical"
                      ? "bg-[rgba(213,34,45,0.1)] text-[#D5222D]"
                      : n.severity === "warning"
                      ? "bg-[#FDF6E8] text-[#A3630A]"
                      : "bg-[#EEF4FF] text-[#175CD3]"
                  }`}
                >
                  {n.severity === "critical" ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : n.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#17191C]">{n.title}</h4>
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D5222D]" />
                    )}
                  </div>
                  <p className="text-xs text-[#737982] mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>

              <span className="text-[10px] text-[#9AA0A8] whitespace-nowrap">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
