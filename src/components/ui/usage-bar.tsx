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
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{used.toLocaleString()} {unit}</span>
            <span className="text-zinc-500 font-mono">Unlimited / Unmetered</span>
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-full bg-violet-500/30 rounded-full" />
        </div>
      </div>
    )
  }

  const percentage = Math.min(Math.round((used / quota) * 100), 100)
  const barColor = getUsageBarColor(percentage)

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-zinc-300 font-medium">
            {used.toLocaleString()} / {quota.toLocaleString()} {unit}
          </span>
          <span
            className={cn(
              "font-mono font-semibold",
              percentage >= 90
                ? "text-red-400"
                : percentage >= 75
                ? "text-amber-400"
                : "text-emerald-400"
            )}
          >
            {percentage}%
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
