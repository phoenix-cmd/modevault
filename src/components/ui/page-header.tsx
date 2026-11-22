import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  badge?: React.ReactNode
  eyebrow?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  action,
  badge,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 max-w-3xl space-y-2.5">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 border border-line bg-surface px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
            <span className="h-1.5 w-1.5 bg-accent" aria-hidden />
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[28px] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[36px]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-xl text-[13.5px] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}
