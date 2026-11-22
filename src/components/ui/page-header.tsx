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
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-5 pb-7",
        className
      )}
    >
      <div className="min-w-[min(100%,300px)] flex-1 max-w-3xl space-y-2.5">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 border border-line bg-surface px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
            <span className="h-1.5 w-1.5 bg-accent" aria-hidden />
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[clamp(1.625rem,3vw,2.25rem)] font-bold leading-[1.04] tracking-[-0.035em] text-ink">
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
      {action && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:max-w-full">
          {action}
        </div>
      )}
    </div>
  )
}
