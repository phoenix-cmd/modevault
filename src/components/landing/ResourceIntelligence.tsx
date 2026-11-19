"use client"

import { useState, useEffect, useRef } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  DollarSign,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const PROVIDERS = [
  {
    name: "Anthropic",
    tier: "Claude 3.7 Sonnet / Haiku",
    spent: "$342.10",
    budget: "$500.00",
    pct: 68,
    tokens: "18.4M",
    cacheHit: "84.2%",
    color: "#F5A623",
  },
  {
    name: "OpenAI",
    tier: "GPT-4.5 / o3-mini",
    spent: "$512.40",
    budget: "$800.00",
    pct: 64,
    tokens: "24.1M",
    cacheHit: "72.0%",
    color: "#1F7A4D",
  },
  {
    name: "DeepSeek",
    tier: "DeepSeek V3 / R1",
    spent: "$48.20",
    budget: "$200.00",
    pct: 24,
    tokens: "31.8M",
    cacheHit: "91.5%",
    color: "#5B61D6",
  },
  {
    name: "Google Cloud",
    tier: "Gemini 2.5 Pro / Flash",
    spent: "$89.00",
    budget: "$300.00",
    pct: 29,
    tokens: "12.0M",
    cacheHit: "65.8%",
    color: "#F5A623",
  },
]

export function ResourceIntelligence() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = createScrollObserver(sectionRef.current, () => {
      if (contentRef.current) {
        animateFadeUp(contentRef.current, 0, 700)
      }
    })
    return cleanup
  }, [])

  return (
    <section
      id="intelligence"
      ref={sectionRef}
      className="py-24 px-6 bg-[#08090A] text-white border-b border-[#1E2024]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1E2024] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#F5A623]">06</span>
              <span>/</span>
              <span>Resource & Cost Intelligence</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-white leading-tight">
              Stop runway bleed.
              <br />
              <span className="text-[#A5A29A]">Govern every token.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#A5A29A] max-w-md leading-relaxed">
            Eliminate month-end billing surprises. Track real-time token spend, prompt caching efficiency, and enforce hard spending ceilings across all your models and subscriptions.
          </p>
        </div>

        {/* Global Spend Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-none bg-[#16171A] border border-[#1E2024] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Total MTD Spend
            </span>
            <div className="text-2xl font-bold font-mono text-white">$991.70</div>
            <div className="text-[11px] text-[#63C08A] font-mono flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              <span>18% under org monthly cap</span>
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#16171A] border border-[#1E2024] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Total Tokens Ingested
            </span>
            <div className="text-2xl font-bold font-mono text-white">86.3M</div>
            <div className="text-[11px] text-[#A5A29A] font-mono">
              Across 4 active providers
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#16171A] border border-[#1E2024] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Prompt Cache Savings
            </span>
            <div className="text-2xl font-bold font-mono text-[#63C08A]">$412.80</div>
            <div className="text-[11px] text-[#A5A29A] font-mono">
              78% average cache hit rate
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#16171A] border border-[#1E2024] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Active Hard Guardrails
            </span>
            <div className="text-2xl font-bold font-mono text-white">12 Policies</div>
            <div className="text-[11px] text-[#F5A623] font-mono flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Recursive loops auto-killed</span>
            </div>
          </div>
        </div>

        {/* Provider Breakdown Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#6F6C64]">
            <span>MULTI-PROVIDER INVENTORY & TELEMETRY</span>
            <span>UPDATED LIVE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROVIDERS.map((provider) => (
              <div
                key={provider.name}
                className="p-6 rounded-none bg-[#16171A] border border-[#1E2024] space-y-4 hover:border-[#2D3036] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">{provider.name}</h4>
                    <span className="text-xs text-[#6F6C64] font-mono">
                      {provider.tier}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-white">
                      {provider.spent}
                    </span>
                    <span className="text-xs text-[#6F6C64] font-mono block">
                      / {provider.budget} cap
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-[#1F2024] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${provider.pct}%`,
                        backgroundColor: provider.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#6F6C64]">
                    <span>{provider.pct}% of allocated quota consumed</span>
                    <span>Remaining: {100 - provider.pct}%</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E2024] grid grid-cols-2 gap-2 text-xs font-mono text-[#A5A29A]">
                  <div>Tokens: <span className="text-white font-medium">{provider.tokens}</span></div>
                  <div>Cache Discount: <span className="text-[#63C08A] font-medium">{provider.cacheHit}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
