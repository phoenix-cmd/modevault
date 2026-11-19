"use client"

import { useEffect, useRef } from "react"
import { AlertCircle, Bot, DollarSign, Layers, ShieldAlert, Sparkles, Terminal } from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const PROBLEMS = [
  {
    code: "01",
    title: "Disjointed Agent Execution",
    description:
      "Coding agents run in isolated CLI windows or local extensions without unified orchestration. Architect, frontend, and backend agents cannot share context, coordinate dependencies, or synchronize outputs.",
    tag: "ZERO MESH COORDINATION",
  },
  {
    code: "02",
    title: "Opaque API Credit Burn",
    description:
      "Engineers spin up agent loops across OpenAI, Anthropic, and DeepSeek. Without centralized spend caps or project attribution, runaway recursive loops result in severe billing shock.",
    tag: "RUNAWAY CONSUMPTION",
  },
  {
    code: "03",
    title: "Unverified Code Ingestion",
    description:
      "Autonomous agents write syntactically correct code that introduces subtle CWE vulnerabilities, broken concurrency, and architectural drift. A completed prompt is never a verified pull request.",
    tag: "SILENT REGRESSIONS",
  },
  {
    code: "04",
    title: "Subscription Sprawl",
    description:
      "Teams purchase dozens of unmanaged Claude Pro, ChatGPT Team, and Copilot licenses. Organizations pay thousands every month for redundant, under-utilized seats with zero governance.",
    tag: "UNTRACKED SEAT OVERHEAD",
  },
]

export function ProblemSection() {
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
      id="problem"
      ref={sectionRef}
      className="py-24 px-6 bg-[#F6F4EF] text-[#15140F] border-b border-[#E2DDD3]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2DDD3] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#A4610A]">01</span>
              <span>/</span>
              <span>The Industry Dilemma</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-[#15140F] leading-tight">
              AI multiplied raw code velocity.
              <br />
              <span className="text-[#6F6C64]">It multiplied engineering chaos.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#6F6C64] max-w-md leading-relaxed">
            Without a unified command center, autonomous coding agents operate as untracked silos—burning credits, introducing vulnerabilities, and fragmenting developer teams.
          </p>
        </div>

        {/* 4 Problem Architectural Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROBLEMS.map((item) => (
            <div
              key={item.code}
              className="p-8 rounded-none bg-[#FFFEFB] border border-[#E2DDD3] hover:border-[#F5A623]/40 transition-colors flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#A4610A] px-2 py-0.5 rounded bg-[#F5A623]/8 border border-[#F5A623]/20">
                    PROBLEM {item.code}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-[#6F6C64] uppercase">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#15140F] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-[#6F6C64] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2DDD3] flex items-center justify-between font-mono text-xs text-[#6F6C64]">
                <span>Status: Unresolved in legacy workflows</span>
                <span className="text-[#A4610A] font-semibold">Risk: High</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
