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
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Recommendations</h2>
          <p className="panel-subtitle">
            Generated from live quota, spend, and model pricing signals
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
          {suggestions.length}
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[12.5px] text-ink-3 sm:px-5">
          <Sparkles className="h-3.5 w-3.5 text-success" strokeWidth={1.8} />
          No action needed right now — quotas, renewals, and spend are all within range.
        </div>
      ) : (
        <ul className="row-divide">
          {suggestions.map((suggestion) => {
            const Icon = CATEGORY_ICON[suggestion.category] ?? AlertTriangle
            const style = SEVERITY_STYLE[suggestion.severity]
            return (
              <li
                key={suggestion.id}
                className="group flex items-start gap-3 px-4 py-3 sm:px-5"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2",
                    style.text
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {suggestion.title}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em]">
                      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                      <span className={style.text}>{style.label}</span>
                    </span>
                    {suggestion.estimatedMonthlySavings ? (
                      <span className="rounded-full border border-success/20 bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">
                        ~{formatCurrency(suggestion.estimatedMonthlySavings, suggestion.currency)}/mo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                    {suggestion.description}
                  </p>
                </div>

                <Link
                  href={suggestion.actionHref}
                  className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-2 opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover:opacity-100"
                >
                  {suggestion.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
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
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-32" />
          <div className="skeleton h-2.5 w-52" />
        </div>
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-5 py-3">
            <div className="skeleton h-7 w-7 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-2.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
