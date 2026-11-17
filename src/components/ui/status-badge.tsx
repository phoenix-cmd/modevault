import { cn, getStatusBadgeColor } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
  pulse?: boolean
}

const DOT_COLOR: Record<string, string> = {
  active: "bg-success",
  connected: "bg-success",
  paused: "bg-warning",
  trial: "bg-accent",
  expired: "bg-danger",
  error: "bg-danger",
  cancelled: "bg-ink-3",
  manual: "bg-info",
}

export function StatusBadge({ status, className, pulse = false }: StatusBadgeProps) {
  return (
    <span className={cn("badge", getStatusBadgeColor(status), className)}>
      {pulse && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            DOT_COLOR[status] || "bg-ink-3"
          )}
        />
      )}
      {status.replace("_", " ")}
    </span>
  )
}
