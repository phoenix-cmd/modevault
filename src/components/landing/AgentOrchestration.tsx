"use client"

import { useEffect, useRef, useState } from "react"
import { animateNodeActivation } from "@/lib/animations/workflow"

interface LoopStep {
  id: string
  num: string
  title: string
  summary: string
  detail: string
  diagramLabel: string
  nodes: Array<{ title: string; meta: string; active?: boolean }>
}

const LOOP_STEPS: LoopStep[] = [
  {
    id: "plan",
    num: "STEP 01",
    title: "Plan the task.",
    summary:
      "Analyze target files, dependency relationships, and task constraints before modifying source code.",
    detail:
      "The orchestrator resolves a directed execution graph and estimates token allocation across agents.",
    diagramLabel: "PHASE 01 // TOPOLOGICAL PLANNER",
    nodes: [
      { title: "Ingest Prompt & Repo Index", meta: "AST + tsconfig scan", active: true },
      { title: "Generate DAG Stages", meta: "3 isolated file scopes" },
      { title: "Allocate Token Cap", meta: "Budget boundary set" },
    ],
  },
  {
    id: "assign",
    num: "STEP 02",
    title: "Assign specialized agents.",
    summary:
      "Route system architecture, backend implementation, UI changes, and test synthesis to dedicated agent profiles.",
    detail:
      "Each agent receives only the files and instructions needed for its domain.",
    diagramLabel: "PHASE 02 // ROLE DISPATCH",
    nodes: [
      { title: "Architect Profile", meta: "Schema & API contracts" },
      { title: "Implementation Profile", meta: "Route & UI diffs", active: true },
      { title: "Verifier Profile", meta: "Checks & assertions" },
    ],
  },
  {
    id: "coordinate",
    num: "STEP 03",
    title: "Coordinate parallel execution.",
    summary:
      "Track live task stages, terminal outputs, token consumption, and verification findings in real time.",
    detail:
      "Failed checks or pattern findings return directly to the active agent context with line references.",
    diagramLabel: "PHASE 03 // PARALLEL RUNTIME",
    nodes: [
      { title: "Event Stream Active", meta: "Tool calls & diffs logged", active: true },
      { title: "Pre-merge Inspection", meta: "Pattern & type checks", active: true },
      { title: "Self-Correction Loop", meta: "Guided fix when flagged" },
    ],
  },
  {
    id: "integrate",
    num: "STEP 04",
    title: "Integrate the results.",
    summary:
      "Consolidate reviewed diffs onto a dedicated Git branch and wait for human merge approval.",
    detail:
      "Every commit remains linked to its execution prompt, reviewer comments, and recorded token cost.",
    diagramLabel: "PHASE 04 // GIT INTEGRATION",
    nodes: [
      { title: "Unified Diff Prepared", meta: "Side-by-side Monaco review" },
      { title: "Human Approval Gate", meta: "Approve / Request revision", active: true },
      { title: "Branch Committed", meta: "Full lineage preserved" },
    ],
  },
]

export function AgentOrchestration() {
  const [activeId, setActiveId] = useState<string>("plan")
  const activeStep = LOOP_STEPS.find((s) => s.id === activeId) || LOOP_STEPS[0]
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anim = animateNodeActivation(diagramRef.current, 0)
    return () => {
      anim?.cancel?.()
    }
  }, [activeId])

  return (
    <section
      id="orchestration"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] pt-16 sm:pt-28"
    >
      <div className="rig-container !px-0">
        {/* Centered Header */}
        <div className="mx-auto max-w-[680px] px-4 text-center sm:px-6">
          <span className="rig-badge mb-6">Agent Orchestration Loop</span>
          <h2 className="rig-display text-[clamp(1.9rem,4.5vw,3.9rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
            Coordinated execution
            <br />
            inside the loop.
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.68] text-[var(--rig-paper-75)]">
            Bring planning, parallel synthesis, code checks, and Git integration into one repeatable engineering cycle.
          </p>
        </div>

        {/* Rig 2fr 3fr Interactive Vertical Stepper */}
        <div className="mt-12 grid items-stretch border-t border-[var(--rig-paper-18)] sm:mt-14 lg:grid-cols-[2fr_3fr]">
          {/* Left Interactive Steps */}
          <div className="flex flex-col">
            {LOOP_STEPS.map((step) => {
              const isActive = step.id === activeId
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveId(step.id)}
                  aria-expanded={isActive}
                  aria-controls={`orchestration-step-${step.id}`}
                  className="relative min-h-[44px] w-full border-b border-[var(--rig-paper-18)] px-4 py-5 text-left transition-colors last:border-b-0 focus-visible:outline-2 sm:px-8 sm:py-6"
                >
                  {/* Left 2px active bar */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-[2px] transition-colors ${
                      isActive ? "bg-[var(--rig-blue)]" : "bg-transparent"
                    }`}
                  />

                  <span
                    className={`block rig-mono text-[11px] uppercase tracking-[0.16em] ${
                      isActive ? "text-[var(--rig-blue)]" : "text-[var(--rig-paper-40)]"
                    }`}
                  >
                    {step.num}
                  </span>
                  <h3
                    className={`mt-2 rig-display text-[1.45rem] font-semibold leading-[1.08] sm:text-[1.75rem] ${
                      isActive ? "text-[var(--rig-paper)]" : "text-[var(--rig-paper-40)]"
                    }`}
                  >
                    {step.title}
                  </h3>

                  <div
                    id={`orchestration-step-${step.id}`}
                    hidden={!isActive}
                    className="mt-3.5 space-y-2 text-[0.9rem] leading-[1.68] text-[var(--rig-paper-75)]"
                  >
                    <p>{step.summary}</p>
                    <p className="text-[var(--rig-paper-50)]">{step.detail}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Technical Schematic Viewport */}
          <div className="flex flex-col justify-between border-t border-[var(--rig-paper-18)] bg-[#101514] p-5 sm:p-10 lg:border-t-0 lg:border-l">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] pb-3 rig-mono text-[10.5px] uppercase tracking-[0.12em]">
              <span className="text-[var(--rig-blue)]">{activeStep.diagramLabel}</span>
              <span className="text-[var(--rig-paper-40)]">Illustrative Loop</span>
            </div>

            <div ref={diagramRef} className="my-auto py-8">
              <div className="space-y-4">
                {activeStep.nodes.map((node, idx) => (
                  <div key={node.title} className="relative">
                    <div
                      className={`flex items-center justify-between gap-4 border p-4 ${
                        node.active
                          ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)]"
                          : "border-[var(--rig-paper-18)] bg-[#161e1d]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="rig-mono text-[11px] text-[var(--rig-paper-40)]">
                          0{idx + 1}
                        </span>
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--rig-paper)]">
                            {node.title}
                          </p>
                          <p className="mt-0.5 rig-mono text-[11px] text-[var(--rig-paper-50)]">
                            {node.meta}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`h-2 w-2 shrink-0 ${
                          node.active ? "bg-[var(--rig-blue)]" : "bg-[var(--rig-paper-30)]"
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    {idx < activeStep.nodes.length - 1 && (
                      <div className="ml-6 h-4 w-px bg-[var(--rig-paper-20)]" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--rig-paper-12)] pt-3 rig-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--rig-paper-40)]">
              Select any step to inspect its runtime state
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
