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
    <section className="border-t border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/20 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
        <span>Open recommendations</span>
        <span className="tabular-nums">{String(suggestions.length).padStart(2, "0")}</span>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex items-start gap-2.5 py-6 text-[13px] leading-relaxed text-ink-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.7} />
          <span>No action needed right now. Quotas, renewals, and spend are within recorded thresholds.</span>
        </div>
      ) : (
        <ul>
          {suggestions.map((suggestion, i) => {
            const Icon = CATEGORY_ICON[suggestion.category] ?? AlertTriangle
            const style = SEVERITY_STYLE[suggestion.severity]
            return (
              <li key={suggestion.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4 last:border-b-0">
                <span className="pt-0.5 font-mono text-[10px] tabular-nums text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-start gap-2.5">
                    <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface", style.text)}>
                      <Icon className="h-3.25 w-3.25" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-ink">{suggestion.title}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{suggestion.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em]">
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          <span className={style.text}>{style.label}</span>
                        </span>
                        {suggestion.estimatedMonthlySavings ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-success tabular-nums">
                            ~{formatCurrency(suggestion.estimatedMonthlySavings, suggestion.currency)}/mo
                          </span>
                        ) : null}
                        <Link
                          href={suggestion.actionHref}
                          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
                        >
                          {suggestion.actionLabel}
                          <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>
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
