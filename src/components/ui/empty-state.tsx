import { LucideIcon, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-3.5 flex h-9 w-9 items-center justify-center rounded border border-line bg-surface-2 text-ink-3">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-2">
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary btn-sm mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
