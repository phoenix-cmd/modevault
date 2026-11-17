import { cn, getUsageBarColor } from "@/lib/utils"

interface UsageBarProps {
  used: number
  quota: number | null
  unit?: string
  className?: string
  showLabel?: boolean
}

export function UsageBar({
  used,
  quota,
  unit = "used",
  className,
  showLabel = true,
}: UsageBarProps) {
  if (!quota || quota === 0) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {showLabel && (
          <div className="flex items-center justify-between gap-3 text-[11.5px] text-ink-3">
            <span className="tnum">
              {used.toLocaleString()} {unit}
            </span>
            <span>Unmetered</span>
          </div>
        )}
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-1/3 rounded-full bg-ink-3/40" />
        </div>
      </div>
    )
  }

  const percentage = Math.min(Math.round((used / quota) * 100), 100)

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex items-center justify-between gap-3 text-[11.5px]">
          <span className="text-ink-2 tnum">
            {used.toLocaleString()} / {quota.toLocaleString()} {unit}
          </span>
          <span
            className={cn(
              "font-medium tnum",
              percentage >= 90
                ? "text-danger"
                : percentage >= 75
                  ? "text-warning"
                  : "text-success"
            )}
          >
            {percentage}%
          </span>
        </div>
      )}
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            getUsageBarColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
