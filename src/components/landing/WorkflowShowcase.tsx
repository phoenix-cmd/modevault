"use client"

import { useEffect, useRef, useState } from "react"
import { createScrollObserver } from "@/lib/animations/reveals"
import { animateConnectorGroup } from "@/lib/animations/workflow"

interface Stage {
  id: string
  step: string
  label: string
  status: "done" | "active" | "gate"
  owner: string
  duration: string
  description: string
  checks: string[]
}

const PIPELINE: Stage[] = [
  {
    id: "plan",
    step: "01",
    label: "Plan",
    status: "done",
    owner: "Orchestrator",
    duration: "1.4s",
    description: "Decomposes ticket into isolated file scopes and validates budget headroom.",
    checks: ["DAG topological check", "Token cap estimated"],
  },
  {
    id: "develop",
    step: "02",
    label: "Develop",
    status: "done",
    owner: "Coding Agents",
    duration: "4.6s",
    description: "Executes parallel diffs across assigned route handlers and UI views.",
    checks: ["Worktree isolated", "Types preserved"],
  },
  {
    id: "integrate",
    step: "03",
    label: "Integrate",
    status: "done",
    owner: "Git Engine",
    duration: "0.7s",
    description: "Combines agent outputs onto a single feature branch and flags merge conflicts.",
    checks: ["0 conflicts", "Clean rebase"],
  },
  {
    id: "test",
    step: "04",
    label: "Test",
    status: "active",
    owner: "Test Runner",
    duration: "2.3s",
    description: "Runs suite assertions against the updated worktree; failed tests route back to Develop.",
    checks: ["Unit assertions queued", "Exit code captured"],
  },
  {
    id: "verify",
    step: "05",
    label: "Verify",
    status: "gate",
    owner: "Verification Center",
    duration: "1.1s",
    description: "Inspects generated diffs for risky patterns, missing guards, and secret literals.",
    checks: ["Diff heuristics", "Scope recorded"],
  },
  {
    id: "review",
    step: "06",
    label: "Review",
    status: "gate",
    owner: "Human Lead",
    duration: "Manual",
    description: "Mandatory approval checkpoint with line comments before code reaches main.",
    checks: ["Side-by-side diff", "Explicit approve"],
  },
  {
    id: "deliver",
    step: "07",
    label: "Deliver",
    status: "gate",
    owner: "Release Hook",
    duration: "12s",
    description: "Finalizes branch commit, updates cost ledger, and dispatches preview build.",
    checks: ["Ledger reconciled", "Branch tagged"],
  },
]

export function WorkflowShowcase() {
  const [selectedId, setSelectedId] = useState<string>("test")
  const sectionRef = useRef<HTMLElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const branchRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    let cancelDraw: (() => void) | null = null
    const stopObserver = createScrollObserver(sectionRef.current, () => {
      cancelDraw = animateConnectorGroup([lineRef.current, branchRef.current], 150)
    })
    return () => {
      stopObserver()
      cancelDraw?.()
    }
  }, [])

  const current = PIPELINE.find((s) => s.id === selectedId) || PIPELINE[3]

  return (
    <section
      id="workflows"
      ref={sectionRef}
      className="border-b border-[var(--rig-paper-18)] py-20 sm:py-28"
    >
      <div className="rig-container">
        <div className="flex flex-col justify-between gap-6 border-b border-[var(--rig-paper-18)] pb-10 lg:flex-row lg:items-end">
          <div>
            <span className="rig-badge mb-6">Workflow Automation</span>
            <h2 className="rig-display text-[clamp(2.4rem,4.6vw,3.9rem)] font-bold leading-[0.94] text-[var(--rig-paper)]">
              From request to verified merge.
              <br />
              <span className="text-[var(--rig-paper-50)]">Every stage connected.</span>
            </h2>
          </div>
          <p className="max-w-md text-[0.95rem] leading-[1.68] text-[var(--rig-paper-75)]">
            Chain agent execution, Git integration, testing, verification, and human approval into a single inspectable DAG workflow.
          </p>
        </div>

        {/* SVG Pipeline Backbone (desktop visual connector) */}
        <div className="mt-10 hidden lg:block" aria-hidden="true">
          <svg viewBox="0 0 1120 44" className="h-11 w-full">
            <path
              ref={lineRef}
              d="M 40 20 L 1080 20"
              fill="none"
              stroke="oklch(0.6014 0.1657 253.83)"
              strokeWidth="1.5"
            />
            <path
              ref={branchRef}
              d="M 560 20 L 560 38 L 220 38 L 220 20"
              fill="none"
              stroke="oklch(0.6973 0.1443 72.87)"
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />
          </svg>
        </div>

        {/* 7-Stage Pipeline Nodes */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:mt-2 lg:grid-cols-7">
          {PIPELINE.map((stage) => {
            const active = stage.id === selectedId
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedId(stage.id)}
                aria-pressed={active}
                className={`flex min-h-[122px] flex-col justify-between border p-3.5 text-left transition-colors ${
                  active
                    ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)]"
                    : "border-[var(--rig-paper-18)] bg-[#101514] hover:border-[var(--rig-paper-30)]"
                }`}
              >
                <div className="flex w-full items-center justify-between rig-mono text-[10px]">
                  <span className={active ? "text-[var(--rig-blue)]" : "text-[var(--rig-paper-40)]"}>
                    {stage.step}
                  </span>
                  <span
                    className={`uppercase tracking-[0.06em] ${
                      stage.status === "done"
                        ? "text-[var(--rig-green)]"
                        : stage.status === "active"
                        ? "text-[var(--rig-blue)]"
                        : "text-[var(--rig-yellow)]"
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                <div>
                  <p className="rig-display text-[1.05rem] font-semibold text-[var(--rig-paper)]">
                    {stage.label}
                  </p>
                  <p className="mt-0.5 rig-mono text-[10px] text-[var(--rig-paper-50)]">
                    {stage.owner}
                  </p>
                </div>

                <div className="border-t border-[var(--rig-paper-12)] pt-2 rig-mono text-[10px] text-[var(--rig-paper-40)]">
                  {stage.duration}
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Stage Specification Panel */}
        <div className="mt-6 border border-[var(--rig-paper-18)] bg-[#101514] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rig-paper-12)] pb-3">
            <div className="flex items-center gap-3">
              <span className="rig-mono text-[11px] font-bold text-[var(--rig-blue)]">
                {`STAGE ${current.step} // ${current.label.toUpperCase()}`}
              </span>
              <span className="rig-mono text-[11px] text-[var(--rig-paper-50)]">
                Owner: {current.owner}
              </span>
            </div>
            <span className="rig-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--rig-yellow)]">
              On failure -&gt; return to Develop
            </span>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <p className="max-w-2xl text-[0.95rem] leading-[1.65] text-[var(--rig-paper-75)]">
              {current.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {current.checks.map((chk) => (
                <span
                  key={chk}
                  className="border border-[var(--rig-paper-18)] bg-[#161e1d] px-2.5 py-1 rig-mono text-[10.5px] text-[var(--rig-paper)]"
                >
                  {chk}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
