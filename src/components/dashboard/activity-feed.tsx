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

  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Recent activity
          </h2>
          <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            Latest changes across your stack
          </p>
        </div>
      </div>

      <ul className="border-t border-line">
        {activities.slice(0, 8).map((activity) => {
          const Icon = TYPE_ICON[activity.type] ?? TYPE_ICON.sync

          return (
            <li
              key={activity.id}
              className="flex items-start gap-3 border-b border-line py-3 last:border-b-0"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface-2 text-ink-3">
                <Icon className="h-3 w-3" strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {activity.title}
                  </p>
                  {activity.severity !== "info" && (
                    <span
                      className={cn(
                        "h-1 w-1 shrink-0 rounded-full",
                        SEVERITY_DOT[activity.severity] ?? SEVERITY_DOT.info
                      )}
                    />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-3">
                  {activity.description}
                </p>
              </div>

              <span className="shrink-0 pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
                {formatRelativeDate(activity.timestamp)}
              </span>
            </li>
          )
        })}
      </ul>
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
