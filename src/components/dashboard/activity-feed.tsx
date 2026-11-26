"use client"

import {
  RefreshCw,
  BarChart3,
  Plus,
  Receipt,
  CalendarClock,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react"
import { cn, formatRelativeDate } from "@/lib/utils"
import type { ActivityItem as ActivityItemType } from "@/lib/types"

const TYPE_ICON: Record<ActivityItemType["type"], LucideIcon> = {
  sync: RefreshCw,
  usage_update: BarChart3,
  subscription_added: Plus,
  billing: Receipt,
  renewal: CalendarClock,
  alert: AlertTriangle,
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-ink-3",
  warning: "bg-warning",
  critical: "bg-danger",
}

interface ActivityFeedProps {
  activities: ActivityItemType[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return null
  }

  const items = activities.slice(0, 8)

  return (
    <section className="border-t border-line">
      <ol className="relative">
        {items.map((activity, idx) => {
          const Icon = TYPE_ICON[activity.type] ?? TYPE_ICON.sync
          const isLast = idx === items.length - 1

          return (
            <li key={activity.id} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
              <div className="relative flex justify-center pt-0.5">
                {!isLast && <span className="absolute left-1/2 top-6 bottom-[-0.25rem] w-px -translate-x-1/2 bg-line" aria-hidden />}
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-3">
                  <Icon className="h-3 w-3" strokeWidth={1.7} />
                </span>
              </div>

              <div className="min-w-0 border-b border-line pb-4 pt-0.5 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-[13px] font-medium text-ink">{activity.title}</p>
                    {activity.severity !== "info" && (
                      <>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            SEVERITY_DOT[activity.severity] ?? SEVERITY_DOT.info
                          )}
                          aria-hidden="true"
                        />
                        <span className="sr-only">{activity.severity}</span>
                      </>
                    )}
                  </div>
                  <time className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    {formatRelativeDate(activity.timestamp)}
                  </time>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{activity.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <section className="border-t border-line pt-5">
      <div className="space-y-2 pb-4">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-2.5 w-40" />
      </div>
      <div className="border-t border-line">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-line py-3 last:border-b-0"
          >
            <div className="skeleton h-6 w-6 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-2.5 w-56" />
            </div>
            <div className="skeleton h-2.5 w-12" />
          </div>
        ))}
      </div>
    </section>
  )
}
