import { cn } from "@/lib/utils"

export interface StatItem {
  label: string
  value: string
  meta?: string
  accent?: boolean
}

interface StatBandProps {
  items: StatItem[]
  columns?: 3 | 4
  className?: string
}

/**
 * Editorial metric band. One hairline rule above and below, mono values,
 * and dividers only where the band resolves to a single row.
 */
export function StatBand({ items, columns = 4, className }: StatBandProps) {
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-x-6 border-y border-line",
        columns === 4
          ? "lg:grid-cols-4 lg:divide-x lg:divide-line"
          : "sm:grid-cols-3 sm:divide-x sm:divide-line",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 py-5 lg:px-6 lg:first:pl-0 lg:last:pr-0"
        >
          <p className="metric-label">{item.label}</p>
          <p
            className={cn(
              "mt-2.5 font-mono text-[23px] font-medium leading-none tracking-[-0.045em] tabular-nums sm:text-[26px]",
              item.accent ? "text-accent" : "text-ink"
            )}
          >
            {item.value}
          </p>
          {item.meta && <p className="mt-2 text-[11px] text-ink-3">{item.meta}</p>}
        </div>
      ))}
    </section>
  )
}

export function StatBandSkeleton({
  columns = 4,
  className,
}: {
  columns?: 3 | 4
  className?: string
}) {
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-x-6 border-y border-line",
        columns === 4
          ? "lg:grid-cols-4 lg:divide-x lg:divide-line"
          : "sm:grid-cols-3 sm:divide-x sm:divide-line",
        className
      )}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="min-w-0 py-5 lg:px-6 lg:first:pl-0 lg:last:pr-0"
        >
          <div className="skeleton h-2.5 w-24" />
          <div className="skeleton mt-2.5 h-6 w-28" />
          <div className="skeleton mt-2 h-2.5 w-20" />
        </div>
      ))}
    </section>
  )
}
