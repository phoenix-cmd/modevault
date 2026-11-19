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
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <div className="flex items-center justify-between gap-3 font-mono text-[10.5px] text-ink-3">
            <span className="tabular-nums">
              {used.toLocaleString()} {unit}
            </span>
            <span>Unmetered</span>
          </div>
        )}
        <div className="h-px w-full bg-surface-3">
          <div className="h-px w-1/3 bg-ink-3/40" />
        </div>
      </div>
    )
  }

  const percentage = Math.min(Math.round((used / quota) * 100), 100)

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between gap-3 font-mono text-[10.5px]">
          <span className="text-ink-2 tabular-nums">
            {used.toLocaleString()} / {quota.toLocaleString()} {unit}
          </span>
          <span
            className={cn(
              "font-medium tabular-nums",
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
      <div className="h-px w-full bg-surface-3">
        <div
          className={cn(
            "h-px transition-[width] duration-500 ease-out",
            getUsageBarColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
