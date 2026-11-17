"use client"

import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"

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

export function SmartIntelligenceCards({ insights }: SmartIntelligenceCardsProps) {
  const getIcon = (type: InsightItem["type"]) => {
    switch (type) {
      case "overlapping":
        return <Layers className="h-4 w-4 text-amber-400" />
      case "savings":
        return <TrendingDown className="h-4 w-4 text-emerald-400" />
      case "underutilized":
        return <Lightbulb className="h-4 w-4 text-blue-400" />
      default:
        return <Sparkles className="h-4 w-4 text-violet-400" />
    }
  }

  const getBorderColor = (severity: InsightItem["severity"]) => {
    switch (severity) {
      case "high":
        return "border-amber-500/30 bg-amber-500/[0.02]"
      case "medium":
        return "border-blue-500/20 bg-blue-500/[0.02]"
      default:
        return "border-emerald-500/20 bg-emerald-500/[0.02]"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-400" />
        <h2 className="text-base font-semibold text-zinc-100">
          Subscription Intelligence & Optimization Engine
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((item, idx) => (
          <GlassCard
            key={idx}
            className={`p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${getBorderColor(
              item.severity
            )}`}
          >
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                  {getIcon(item.type)}
                </div>
                <h3 className="text-xs font-semibold text-zinc-200">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.description}
              </p>
            </div>

            {item.impact && (
              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500">Estimated value:</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {item.impact}
                </span>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-xs text-zinc-400 flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-200">Intelligence Policy:</strong> MODELVAULT never recommends automatic cancellation based solely on low recorded usage. Low volume often reflects high-leverage occasional reliance (such as complex o1 reasoning or emergency fallbacks). Use these insights to optimize tiers, eliminate unintended overlaps, or switch to annual commitments.
        </p>
      </div>
    </div>
  )
}
