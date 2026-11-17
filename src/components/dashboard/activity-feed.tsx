"use client"

import { motion } from "framer-motion"
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

const TYPE_CONFIG: Record<
  ActivityItemType["type"],
  { icon: LucideIcon; color: string }
> = {
  sync: { icon: RefreshCw, color: "#3b82f6" },
  usage_update: { icon: BarChart3, color: "#06b6d4" },
  subscription_added: { icon: Plus, color: "#10b981" },
  billing: { icon: Receipt, color: "#8b5cf6" },
  renewal: { icon: CalendarClock, color: "#f59e0b" },
  alert: { icon: AlertTriangle, color: "#ef4444" },
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
}

interface ActivityFeedProps {
  activities: ActivityItemType[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-vault-text">
        Recent Activity
      </h2>
      <div className="glass-card rounded-xl divide-y divide-white/[0.04]">
        {activities.slice(0, 8).map((activity, index) => {
          const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.sync
          const Icon = config.icon

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.04,
                ease: "easeOut",
              }}
              className="flex items-start gap-3.5 p-4"
            >
              {/* Icon */}
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${config.color}18` }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: config.color }}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-vault-text truncate">
                    {activity.title}
                  </p>
                  <div
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      SEVERITY_DOT[activity.severity] || SEVERITY_DOT.info
                    )}
                  />
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1">
                  {activity.description}
                </p>
              </div>

              {/* Timestamp */}
              <span className="shrink-0 text-[11px] text-zinc-600">
                {formatRelativeDate(activity.timestamp)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-32" />
      <div className="glass-card rounded-xl divide-y divide-white/[0.04]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3.5 p-4">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-3 w-64" />
            </div>
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
