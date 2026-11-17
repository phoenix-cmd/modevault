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
  { box: string; label: string; text: string }
> = {
  high: {
    box: "border-warning/20 bg-warning-soft text-warning",
    label: "High priority",
    text: "text-warning",
  },
  medium: {
    box: "border-info/20 bg-info-soft text-info",
    label: "Review",
    text: "text-info",
  },
  low: {
    box: "border-success/20 bg-success-soft text-success",
    label: "Opportunity",
    text: "text-success",
  },
}

export function SmartIntelligenceCards({ insights }: SmartIntelligenceCardsProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Optimization signals</h2>
          <p className="panel-subtitle">
            Efficiency observations across your subscription portfolio
          </p>
        </div>
        <span className="badge bg-surface-2 text-ink-3">
          {insights.length} finding{insights.length === 1 ? "" : "s"}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12px] text-ink-3">
          No optimization signals right now.
        </p>
      ) : (
        <div className="row-divide">
          {insights.map((item, index) => {
            const Icon = TYPE_ICON[item.type] ?? Sparkles
            const style = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.low

            return (
              <div
                key={`${item.type}-${index}`}
                className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                    style.box
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="text-[13px] font-medium text-ink">
                      {item.title}
                    </p>
                    {item.impact && (
                      <span className="badge bg-success-soft text-success tnum">
                        {item.impact}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
                    {item.description}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[10.5px] font-medium uppercase tracking-[0.06em]",
                      style.text
                    )}
                  >
                    {style.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-start gap-2.5 border-t border-line bg-surface-2/50 px-4 py-3 sm:px-5">
        <ShieldAlert
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3"
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
