"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, Bot, Cpu, GitBranch, ShieldCheck, Terminal, Zap } from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

export function FinalCTA() {
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
      ref={sectionRef}
      className="py-28 px-6 bg-[#08090A] text-white border-b border-[#1E2024] relative overflow-hidden"
    >
      {/* Subtle structural grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div ref={contentRef} className="relative max-w-4xl mx-auto text-center space-y-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2D3036] bg-[#16171A] px-3.5 py-1 text-xs font-mono text-[#A5A29A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
          <span>PRODUCTION-READY AI COMMAND CENTER</span>
        </div>

        <h2 className="text-[38px] font-display font-medium leading-[1.04] tracking-[-0.035em] sm:text-[56px] md:text-[64px] text-white leading-tight">
          Build more.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F1EFE9] to-[#6F6C64]">
            Coordinate everything.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-[#A5A29A] max-w-xl mx-auto leading-relaxed">
          Unify your AI subscriptions, orchestrate specialized coding agents, and verify every pull request from one centralized workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/overview"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-md bg-[#F5A623] px-8 py-4 text-sm font-semibold text-[#08090A] hover:bg-[#D98A12] active:scale-[0.98] transition-all group"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="h-4 w-4 text-[#08090A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md border border-[#2D3036] bg-[#16171A] px-8 py-4 text-sm font-medium text-[#C9C5BC] hover:text-white hover:border-[#3A3D44] active:scale-[0.98] transition-all"
          >
            <span>Create Free Account</span>
          </Link>
        </div>

        {/* Minimalist Trust & Status Indicators */}
        <div className="pt-12 border-t border-[#1E2024] flex flex-wrap items-center justify-center gap-8 text-xs font-mono text-[#6F6C64]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#63C08A]" />
            <span>All systems nominal (99.98% uptime)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#A5A29A]" />
            <span>SOC2 Type II & GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#A5A29A]" />
            <span>GitHub & GitLab Native</span>
          </div>
        </div>
      </div>
    </section>
  )
}
