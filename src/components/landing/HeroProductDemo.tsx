"use client"

import { useEffect, useRef, useState } from "react"
import { animateConnectorGroup, animateNodeActivation } from "@/lib/animations/workflow"

interface TrackNode {
  id: string
  index: string
  role: string
  agent: string
  status: string
  scope: string
  tokens: string
  note: string
}

const TRACKS: TrackNode[] = [
  {
    id: "architect",
    index: "01",
    role: "Plan & Contract",
    agent: "Architect profile",
    status: "Verified spec",
    scope: "schema.prisma · types.ts",
    tokens: "1,480 tkn",
    note: "Breaks directive into conflict-free file ownership boundaries.",
  },
  {
    id: "implement",
    index: "02",
    role: "Parallel Synthesis",
    agent: "Implementation profile",
    status: "Diff staged",
    scope: "src/app/api/webhooks/route.ts",
    tokens: "2,920 tkn",
    note: "Applies idempotent handler updates inside an isolated worktree.",
  },
  {
    id: "verify",
    index: "03",
    role: "Evidence & Review",
    agent: "Verification profile",
    status: "Check passed",
    scope: "tests/webhooks.test.ts",
    tokens: "1,110 tkn",
    note: "Validates signature checks, bounds, and unit assertions before merge.",
  },
]

export function HeroProductDemo() {
  const [activeTrack, setActiveTrack] = useState<string>("implement")
  const path1Ref = useRef<SVGPathElement>(null)
  const path2Ref = useRef<SVGPathElement>(null)
  const path3Ref = useRef<SVGPathElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return animateConnectorGroup([path1Ref.current, path2Ref.current, path3Ref.current], 120)
  }, [])

  useEffect(() => {
    const anim = animateNodeActivation(detailRef.current, 0)
    return () => {
      anim?.cancel?.()
    }
  }, [activeTrack])

  const selected = TRACKS.find((t) => t.id === activeTrack) || TRACKS[1]

  return (
    <div className="border border-[#161e1d]/30 bg-[#101514] text-[var(--rig-paper)] shadow-[6px_6px_0_rgba(10,10,10,0.4)]">
      {/* Schematic Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-18)] bg-[#0b0f0e] px-4 py-2.5">
        <div className="flex items-center gap-2.5 rig-mono text-[10.5px] uppercase tracking-[0.12em]">
          <span className="h-2 w-2 bg-[var(--rig-blue)]" aria-hidden="true" />
          <span className="text-[var(--rig-paper)]">MV-ORCHESTRATOR // RUN-409</span>
        </div>
        <span className="rig-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rig-paper-50)]">
          Illustrative Architecture
        </span>
      </div>

      {/* Directive Origin */}
      <div className="border-b border-[var(--rig-paper-12)] px-4 py-3">
        <p className="rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-blue)]">
          Central Directive
        </p>
        <p className="mt-1 rig-mono text-[12px] text-[var(--rig-paper)]">
          &gt; Add idempotent webhook verification and test suite on branch feat/webhook-guard
        </p>
      </div>

      {/* SVG Routing Fan-Out + Agent Tracks */}
      <div className="px-4 pt-3 pb-4">
        <svg
          viewBox="0 0 540 34"
          className="h-8 w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            ref={path1Ref}
            d="M 270 0 L 270 14 L 90 14 L 90 34"
            fill="none"
            stroke="rgba(240,237,230,0.35)"
            strokeWidth="1.25"
          />
          <path
            ref={path2Ref}
            d="M 270 0 L 270 34"
            fill="none"
            stroke="oklch(0.6014 0.1657 253.83)"
            strokeWidth="1.5"
          />
          <path
            ref={path3Ref}
            d="M 270 0 L 270 14 L 450 14 L 450 34"
            fill="none"
            stroke="rgba(240,237,230,0.35)"
            strokeWidth="1.25"
          />
        </svg>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {TRACKS.map((track) => {
            const isSelected = track.id === activeTrack
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setActiveTrack(track.id)}
                aria-pressed={isSelected}
                className={`border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)]"
                    : "border-[var(--rig-paper-18)] bg-[#151b1a] hover:border-[var(--rig-paper-30)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 rig-mono text-[10px]">
                  <span className={isSelected ? "text-[var(--rig-blue)]" : "text-[var(--rig-paper-40)]"}>
                    {track.index}
                  </span>
                  <span className="uppercase tracking-[0.08em] text-[var(--rig-green)]">
                    {track.status}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-semibold text-[var(--rig-paper)]">
                  {track.role}
                </p>
                <p className="mt-0.5 rig-mono text-[10px] text-[var(--rig-paper-50)]">
                  {track.agent}
                </p>
              </button>
            )
          })}
        </div>

        {/* Selected Node Readout */}
        <div
          ref={detailRef}
          className="mt-3 border border-[var(--rig-paper-12)] bg-[#0b0f0e] p-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] pb-2 rig-mono text-[10px] uppercase tracking-[0.1em]">
            <span className="text-[var(--rig-blue)]">
              {`Track ${selected.index} // ${selected.scope}`}
            </span>
            <span className="text-[var(--rig-paper-50)]">Budget: {selected.tokens}</span>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--rig-paper-75)]">
            {selected.note}
          </p>
        </div>
      </div>

      {/* Bottom Merge Ledger */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rig-paper-18)] bg-[#0b0f0e] px-4 py-2.5 rig-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rig-paper-50)]">
        <span>3 agents coordinated</span>
        <span className="text-[var(--rig-green)]">Diff ready for approval · 5,510 tkn</span>
      </div>
    </div>
  )
}
