"use client"

import { useEffect, useRef } from "react"
import {
  CheckCircle2,
  FileCheck2,
  GitPullRequest,
  Lock,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const PILLARS = [
  {
    step: "01",
    title: "Granular Role-Based Access",
    description:
      "Configure team permissions across Admin, Lead Architect, Developer, and Auditor roles. Set maximum per-user spend limits and restrict high-tier models to approved projects.",
    badge: "RBAC & SPEND CAPS",
    features: ["Per-user monthly token caps", "Model tier access control", "Workspace isolation"],
  },
  {
    step: "02",
    title: "Human-in-the-Loop Reviews",
    description:
      "Agents prepare complete pull requests with synthetic test suites, but humans maintain final merge authority. Review code in our Monaco diff inspector with inline annotations.",
    badge: "DIFF INSPECTION",
    features: ["Side-by-side Monaco diff", "Threaded review comments", "One-click PR merge"],
  },
  {
    step: "03",
    title: "SOC2-Compliant Audit Trail",
    description:
      "Every single agent prompt, token transaction, model completion, and human approval signature is stored in an immutable, exportable compliance log.",
    badge: "ENTERPRISE COMPLIANCE",
    features: ["Exportable JSON audit logs", "Cryptographic proof hashes", "Complete prompt lineage"],
  },
]

export function CollaborationSection() {
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
      id="governance"
      ref={sectionRef}
      className="py-24 px-6 bg-[#FFFEFB] text-[#15140F] border-b border-[#E2DDD3]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2DDD3] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#A4610A]">07</span>
              <span>/</span>
              <span>Governance & Control</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-[#15140F] leading-tight">
              Autonomous speed.
              <br />
              <span className="text-[#6F6C64]">Enterprise control.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#6F6C64] max-w-md leading-relaxed">
            Unleash the full capability of multi-agent software engineering without sacrificing security, governance, or organizational sanity.
          </p>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.step}
              className="p-8 rounded-none bg-[#F6F4EF] border border-[#E2DDD3] flex flex-col justify-between space-y-6 hover:border-[#CFC9BE] transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#A4610A]">
                    {pillar.step}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFFEFB] text-[#6F6C64] border border-[#E2DDD3] uppercase">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#15140F]">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#6F6C64] leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2DDD3] space-y-2">
                {pillar.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-mono text-[#15140F]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A4D] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
