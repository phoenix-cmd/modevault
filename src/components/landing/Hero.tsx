"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, Bot, Cpu, GitBranch, Layers, ShieldCheck, Terminal, Zap } from "lucide-react"
import { HeroProductDemo } from "./HeroProductDemo"
import { animateHeroSequence } from "@/lib/animations/hero"

export function Hero() {
  const badgeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = animateHeroSequence({
      badge: badgeRef.current,
      title: titleRef.current,
      subtitle: subtitleRef.current,
      actions: actionsRef.current,
      stats: statsRef.current,
      demo: demoRef.current,
    })
    return cleanup
  }, [])

  return (
    <section className="relative pt-32 pb-20 px-6 bg-[#08090A] text-white border-b border-[#1E2024] overflow-hidden">
      {/* Subtle structural grid lines (Rig.ai architectural feel) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 rounded-full border border-[#2D3036] bg-[#16171A] px-3.5 py-1 text-xs font-mono text-[#A5A29A] mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] animate-pulse" />
          <span>AUTONOMOUS SOFTWARE DEVELOPMENT SUITE</span>
          <span className="text-[#6F6C64]">/</span>
          <span className="text-white">v2.4 READY</span>
        </div>

        {/* Headline */}
        <h1
          ref={titleRef}
          className="text-[38px] font-display font-medium leading-[1.04] tracking-[-0.035em] sm:text-[56px] md:text-[64px] text-white max-w-4xl leading-[1.08] mb-6"
        >
          Your AI team.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F1EFE9] to-[#6F6C64]">
            One command center.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p
          ref={subtitleRef}
          className="text-base sm:text-lg md:text-xl text-[#A5A29A] max-w-2xl leading-relaxed mb-10 font-normal"
        >
          Orchestrate intelligent coding agents, automate multi-step development pipelines, and govern subscriptions, API tokens, and code security from one powerful workspace.
        </p>

        {/* Call to Actions */}
        <div
          ref={actionsRef}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto"
        >
          <Link
            href="/overview"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-md bg-[#F5A623] px-7 py-3.5 text-sm font-semibold text-[#08090A] hover:bg-[#D98A12] active:scale-[0.98] transition-all group"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="h-4 w-4 text-[#08090A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="#orchestration"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md border border-[#2D3036] bg-[#16171A]/70 px-7 py-3.5 text-sm font-medium text-[#C9C5BC] hover:text-white hover:border-[#3A3D44] hover:bg-[#161820] active:scale-[0.98] transition-all"
          >
            <span>Explore the Platform</span>
          </Link>
        </div>

        {/* Architectural Ticker / Stats Bar */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl border-y border-[#1E2024] py-4 mb-14 text-left"
        >
          <div className="px-3 border-r border-[#1E2024] last:border-r-0">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Multi-Agent Mesh
            </span>
            <span className="text-sm font-semibold text-white">
              Parallel Orchestration
            </span>
          </div>

          <div className="px-3 md:border-r border-[#1E2024]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Verification Engine
            </span>
            <span className="text-sm font-semibold text-white">
              Sub-second AST Audit
            </span>
          </div>

          <div className="px-3 border-r border-[#1E2024] last:border-r-0">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Resource Intel
            </span>
            <span className="text-sm font-semibold text-white">
              Real-time Token Guard
            </span>
          </div>

          <div className="px-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#6F6C64]">
              Git Architecture
            </span>
            <span className="text-sm font-semibold text-white">
              Branch & PR Isolation
            </span>
          </div>
        </div>

        {/* Live Product Demonstration */}
        <div ref={demoRef} className="w-full">
          <HeroProductDemo />
        </div>
      </div>
    </section>
  )
}
