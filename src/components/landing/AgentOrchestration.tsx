"use client"

import { useEffect, useRef, useState } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

type Stage = {
  id: string
  label: string
  mode: string
  detail: string
  outputs: string[]
}

const STAGES: Stage[] = [
  {
    id: "plan",
    label: "Architecture",
    mode: "Planning",
    detail: "Interprets the request, identifies affected areas, and breaks work into dependent tasks.",
    outputs: ["Task outline", "File boundaries", "Acceptance criteria"],
  },
  {
    id: "frontend",
    label: "Frontend",
    mode: "Parallel execution",
    detail: "Implements interface changes and client behaviour against the agreed contract.",
    outputs: ["UI components", "State and interactions", "Accessibility notes"],
  },
  {
    id: "backend",
    label: "Backend",
    mode: "Parallel execution",
    detail: "Implements routes, data access, and service logic required by the request.",
    outputs: ["Handlers / services", "Schema or query changes", "Error handling"],
  },
  {
    id: "test",
    label: "Testing",
    mode: "Integration",
    detail: "Runs checks and validates that the composed changes behave as intended.",
    outputs: ["Test results", "Regression signals", "Coverage notes"],
  },
  {
    id: "verify",
    label: "Verification",
    mode: "Verification",
    detail: "Surfaces findings, remediation, and evidence for human review before delivery.",
    outputs: ["Findings summary", "Remediation status", "Review packet"],
  },
]

function MeshDiagram({
  active,
  onSelect,
}: {
  active: string
  onSelect: (id: string) => void
}) {
  const node = (id: string, x: number, y: number, label: string, sub: string) => {
    const isActive = active === id
    return (
      <g
        key={id}
        transform={`translate(${x} ${y})`}
        onClick={() => onSelect(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(id)
          }
        }}
        tabIndex={0}
        role="button"
        aria-pressed={isActive}
        className="cursor-pointer outline-none"
      >
        <rect
          width="150"
          height="46"
          rx="2"
          fill={isActive ? "var(--mkt-ink)" : "var(--mkt-paper)"}
          stroke={isActive ? "var(--mkt-ink)" : "var(--mkt-line-strong)"}
          strokeWidth="1.2"
        />
        <text
          x="12"
          y="18"
          fontSize="9.5"
          fontFamily="var(--font-jetbrains), monospace"
          letterSpacing="0.1em"
          fill={isActive ? "#f7f3ec" : "var(--mkt-ink-3)"}
        >
          {sub.toUpperCase()}
        </text>
        <text
          x="12"
          y="34"
          fontSize="13"
          fontFamily="var(--font-inter), sans-serif"
          fill={isActive ? "#fffdf8" : "var(--mkt-ink)"}
        >
          {label}
        </text>
      </g>
    )
  }

  return (
    <figure className="border border-[var(--mkt-line)] bg-[var(--mkt-paper)]">
      <div className="flex items-center justify-between border-b border-[var(--mkt-line)] px-4 py-2.5">
        <span className="mkt-eyebrow">Execution relationships · example</span>
        <span className="mkt-note">Select a stage</span>
      </div>
      <svg viewBox="0 0 620 360" className="block h-auto w-full" aria-label="Agent relationship diagram">
        <g stroke="var(--mkt-line-strong)" strokeWidth="1.2" fill="none">
          <path d="M310 52 V88" />
          <path d="M310 134 C310 154 170 154 170 178" />
          <path d="M310 134 C310 154 450 154 450 178" />
          <path d="M170 224 V250" />
          <path d="M450 224 V250" />
          <path d="M170 250 C170 272 310 272 310 292" />
          <path d="M450 250 C450 272 310 272 310 292" />
          <path d="M310 338 V352" markerEnd="url(#arr)" />
        </g>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mkt-line-strong)" />
          </marker>
        </defs>

        <g transform="translate(235 8)">
          <rect width="150" height="44" rx="2" fill="var(--mkt-accent-soft)" stroke="var(--mkt-accent-border)" />
          <text x="75" y="18" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-accent-strong)">REQUEST</text>
          <text x="75" y="33" textAnchor="middle" fontSize="12" fontFamily="var(--font-inter), sans-serif" fill="var(--mkt-ink)">Development task</text>
        </g>

        {node("plan", 235, 88, "Architecture", "Planning")}
        {node("frontend", 95, 178, "Frontend", "Parallel")}
        {node("backend", 375, 178, "Backend", "Parallel")}
        {node("test", 235, 292, "Testing · Verification", "Integration")}

        <g transform="translate(220 352)" opacity="0.001">
          <rect width="180" height="1" />
        </g>
      </svg>
      <div className="border-t border-[var(--mkt-line)] px-4 py-2.5 text-[12px] text-[var(--mkt-ink-3)]">
        Ownership and handoff are explicit; outputs converge before delivery.
      </div>
    </figure>
  )
}

export function AgentOrchestration() {
  const [active, setActive] = useState("plan")
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stage = STAGES.find((s) => s.id === active) || STAGES[0]

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="orchestration" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-bg)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div>
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">02</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Multi-agent orchestration
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Specialized agents,
              <br />
              <span className="text-[var(--mkt-ink-2)]">shared task structure.</span>
            </h2>
            <p className="mkt-lead mt-5 max-w-md text-[15px]">
              Represent work as a sequence of responsibilities — planning, parallel
              implementation, integration, and verification — rather than isolated prompts.
            </p>

            <div className="mt-8 border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-5">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--mkt-line)] pb-3">
                <div>
                  <p className="mkt-eyebrow text-[var(--mkt-accent)]">{stage.mode}</p>
                  <p className="mt-1 font-display text-[20px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
                    {stage.label}
                  </p>
                </div>
                <span className="mkt-chip">{stage.id}</span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--mkt-ink-2)]">{stage.detail}</p>
              <div className="mt-4 border-t border-[var(--mkt-line)] pt-4">
                <p className="mkt-eyebrow">Typical outputs</p>
                <ul className="mt-3 space-y-2">
                  {stage.outputs.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-[13px] text-[var(--mkt-ink-2)]">
                      <span className="mt-[7px] h-px w-3 bg-[var(--mkt-accent)]" aria-hidden />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mkt-note mt-5">Illustrative stage description</p>
            </div>
          </div>

          <div className="lg:pt-8">
            <MeshDiagram active={active === "test" ? "test" : active === "verify" ? "test" : active} onSelect={setActive} />
            <div className="mt-3 flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={`mkt-chip transition-colors ${
                    active === s.id
                      ? "border-[var(--mkt-accent-border)] bg-[var(--mkt-accent-soft)] text-[var(--mkt-accent-strong)]"
                      : "hover:bg-[var(--mkt-paper-2)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
