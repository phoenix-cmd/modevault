"use client"

import {
  Sparkles,
  Lightbulb,
  TrendingDown,
  Layers,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface InsightItem {
  type: "underutilized" | "overlapping" | "savings" | "heavy_spend"
  title: string
  description: string
  impact?: string
  severity: "low" | "medium" | "high"
}

interface SmartIntelligenceCardsProps {
  insights: InsightItem[]
}

const TYPE_ICON: Record<InsightItem["type"], LucideIcon> = {
  overlapping: Layers,
  savings: TrendingDown,
  underutilized: Lightbulb,
  heavy_spend: Sparkles,
}

const SEVERITY_STYLE: Record<
  InsightItem["severity"],
  { icon: string; label: string; text: string }
> = {
  high: {
    icon: "text-warning",
    label: "High priority",
    text: "text-warning",
  },
  medium: {
    icon: "text-info",
    label: "Review",
    text: "text-info",
  },
  low: {
    icon: "text-success",
    label: "Opportunity",
    text: "text-success",
  },
}

export function SmartIntelligenceCards({ insights }: SmartIntelligenceCardsProps) {
  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Optimization signals
          </h2>
          <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            Efficiency across your subscription portfolio
          </p>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">
          {String(insights.length).padStart(2, "0")}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="border-t border-line py-8 text-center text-[12px] text-ink-3">
          No optimization signals right now.
        </p>
      ) : (
        <ul className="border-t border-line">
          {insights.map((item, index) => {
            const Icon = TYPE_ICON[item.type] ?? Sparkles
            const style = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.low

            return (
              <li
                key={`${item.type}-${index}`}
                className="flex items-start gap-3 border-b border-line py-4 last:border-b-0"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface-2",
                    style.icon
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[12.5px] font-medium text-ink">
                      {item.title}
                    </p>
                    {item.impact && (
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-success">
                        {item.impact}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                    {item.description}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-mono text-[9px] font-medium uppercase tracking-[0.1em]",
                      style.text
                    )}
                  >
                    {style.label}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-start gap-2.5 border-t border-line pt-4">
        <ShieldAlert
          className="mt-0.5 h-3 w-3 shrink-0 text-ink-3"
          strokeWidth={1.8}
        />
        <p className="text-[11px] leading-relaxed text-ink-3">
          <span className="font-medium text-ink-2">Policy note:</span> MODELVAULT
          never recommends automatic cancellation based solely on low recorded
          usage. Low volume often reflects high-leverage occasional reliance. Use
          these signals to optimize tiers, remove unintended overlaps, or move to
          annual commitments.
        </p>
      </div>
    </section>
  )
}
