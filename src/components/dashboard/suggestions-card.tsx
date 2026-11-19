"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Coins,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import type { Suggestion, SuggestionCategory } from "@/lib/suggestions"

const CATEGORY_ICON: Record<SuggestionCategory, typeof Zap> = {
  quota: Zap,
  spend: Coins,
  unused: TrendingDown,
  renewal: CalendarClock,
  optimization: Sparkles,
}

const SEVERITY_STYLE: Record<
  Suggestion["severity"],
  { dot: string; label: string; text: string }
> = {
  critical: {
    dot: "bg-danger",
    label: "Critical",
    text: "text-danger",
  },
  warning: {
    dot: "bg-warning",
    label: "Warning",
    text: "text-warning",
  },
  opportunity: {
    dot: "bg-accent",
    label: "Opportunity",
    text: "text-accent",
  },
  info: {
    dot: "bg-ink-3",
    label: "Insight",
    text: "text-ink-2",
  },
}

interface SuggestionsCardProps {
  suggestions: Suggestion[]
}

export function SuggestionsCard({ suggestions }: SuggestionsCardProps) {
  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Recommendations
          </h2>
          <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            Live quota, spend, and pricing signals
          </p>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">
          {String(suggestions.length).padStart(2, "0")}
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex items-start gap-2 border-t border-line py-5 text-[12px] leading-relaxed text-ink-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={1.8} />
          No action needed right now — quotas, renewals, and spend are all within range.
        </div>
      ) : (
        <ul className="border-t border-line">
          {suggestions.map((suggestion) => {
            const Icon = CATEGORY_ICON[suggestion.category] ?? AlertTriangle
            const style = SEVERITY_STYLE[suggestion.severity]
            return (
              <li
                key={suggestion.id}
                className="group border-b border-line py-3.5 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface-2",
                      style.text
                    )}
                  >
                    <Icon className="h-3 w-3" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium leading-snug text-ink">
                      {suggestion.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                      {suggestion.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="flex items-center gap-1 font-mono text-[9px] font-medium uppercase tracking-[0.1em]">
                        <span className={cn("h-1 w-1 rounded-full", style.dot)} />
                        <span className={style.text}>{style.label}</span>
                      </span>
                      {suggestion.estimatedMonthlySavings ? (
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-success">
                          ~
                          {formatCurrency(
                            suggestion.estimatedMonthlySavings,
                            suggestion.currency
                          )}
                          /mo
                        </span>
                      ) : null}
                      <Link
                        href={suggestion.actionHref}
                        className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                      >
                        {suggestion.actionLabel}
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function SuggestionsCardSkeleton() {
  return (
    <section className="border-t border-line pt-5">
      <div className="space-y-2 pb-4">
        <div className="skeleton h-3.5 w-32" />
        <div className="skeleton h-2.5 w-52" />
      </div>
      <div className="border-t border-line">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-line py-3.5 last:border-b-0"
          >
            <div className="skeleton h-6 w-6 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-2.5 w-4/5" />
              <div className="skeleton h-2 w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
