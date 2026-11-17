import { cn, getStatusBadgeColor } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
  pulse?: boolean
}

export function StatusBadge({ status, className, pulse = false }: StatusBadgeProps) {
  const badgeStyle = getStatusBadgeColor(status)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        badgeStyle,
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "active" || status === "connected"
              ? "bg-emerald-400 animate-pulse"
              : status === "warning" || status === "paused"
              ? "bg-amber-400"
              : "bg-red-400"
          )}
        />
      )}
      {status}
    </span>
  )
}
