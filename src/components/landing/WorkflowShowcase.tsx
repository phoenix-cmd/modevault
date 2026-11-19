"use client"

import { useEffect, useRef, useState } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const STEPS = [
  {
    id: "plan",
    title: "Plan",
    mode: "Decomposition",
    body: "Turn a request or issue into bounded tasks, dependencies, and acceptance checks.",
  },
  {
    id: "develop",
    title: "Develop",
    mode: "Implementation",
    body: "Execute tasks in parallel where safe, with clear file ownership and shared context.",
  },
  {
    id: "integrate",
    title: "Integrate",
    mode: "Composition",
    body: "Combine outputs, resolve conflicts, and prepare a coherent change set.",
  },
  {
    id: "test",
    title: "Test",
    mode: "Validation",
    body: "Run automated checks and surface regressions before review.",
  },
  {
    id: "verify",
    title: "Verify",
    mode: "Assurance",
    body: "Inspect findings, apply remediation, and record evidence for the change.",
  },
  {
    id: "review",
    title: "Review",
    mode: "Human gate",
    body: "Provide diffs, context, and results so a reviewer can approve or request changes.",
  },
  {
    id: "deliver",
    title: "Deliver",
    mode: "Release",
    body: "Merge or ship the reviewed change according to repository and team policy.",
  },
]

export function WorkflowShowcase() {
  const [active, setActive] = useState("develop")
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const step = STEPS.find((s) => s.id === active) || STEPS[1]

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="workflows" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-paper)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="flex flex-col gap-6 border-b border-[var(--mkt-line)] pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">03</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Workflow automation
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              A defined path from
              <br />
              <span className="text-[var(--mkt-ink-2)]">intent to delivery.</span>
            </h2>
          </div>
          <p className="mkt-lead max-w-md text-[15px]">
            Workflows make each stage explicit so autonomous steps, checks, and human
            approvals happen in a predictable order.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <div className="flex items-center justify-between">
              <p className="mkt-eyebrow">Lifecycle · example workflow</p>
              <p className="mkt-note text-[var(--mkt-accent)]">Demonstration</p>
            </div>
            <ol className="mt-4 border-t border-[var(--mkt-line)]">
              {STEPS.map((s, i) => {
                const isActive = s.id === active
                return (
                  <li key={s.id} className="border-b border-[var(--mkt-line)]">
                    <button
                      type="button"
                      onClick={() => setActive(s.id)}
                      className={`grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-4 py-4 text-left transition-colors sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] ${
                        isActive ? "bg-[var(--mkt-bg)]" : "hover:bg-[color:color-mix(in_srgb,var(--mkt-bg)_55%,transparent)]"
                      }`}
                      aria-pressed={isActive}
                    >
                      <span className="mkt-mono pt-0.5 text-[11px] tracking-[0.1em] text-[var(--mkt-ink-3)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block font-display text-[18px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
                          {s.title}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                          {s.body}
                        </span>
                      </span>
                      <span className={`mkt-chip mt-0.5 ${isActive ? "border-[var(--mkt-accent-border)] text-[var(--mkt-accent-strong)]" : ""}`}>
                        {s.mode}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <aside className="lg:pt-8">
            <div className="border border-[var(--mkt-line)] bg-[var(--mkt-bg)] p-5 sm:p-6">
              <p className="mkt-eyebrow text-[var(--mkt-accent)]">Selected stage</p>
              <h3 className="mt-2 font-display text-[28px] font-medium tracking-[-0.03em] text-[var(--mkt-ink)]">
                {step.title}
              </h3>
              <p className="mkt-mono mt-1 text-[11px] uppercase tracking-[0.1em] text-[var(--mkt-ink-3)]">
                {step.mode}
              </p>
              <p className="mt-5 text-[14px] leading-relaxed text-[var(--mkt-ink-2)]">{step.body}</p>

              <div className="mt-6 border-t border-[var(--mkt-line)] pt-5">
                <p className="mkt-eyebrow">Common controls</p>
                <ul className="mt-3 space-y-2 text-[13px] text-[var(--mkt-ink-2)]">
                  <li className="flex gap-2"><span className="text-[var(--mkt-accent)]">—</span><span>Entry conditions and required inputs</span></li>
                  <li className="flex gap-2"><span className="text-[var(--mkt-accent)]">—</span><span>Status, logs, and produced artifacts</span></li>
                  <li className="flex gap-2"><span className="text-[var(--mkt-accent)]">—</span><span>Approval or retry paths when checks fail</span></li>
                </ul>
              </div>

              <div className="mt-6 border border-[var(--mkt-line)] bg-[var(--mkt-paper)] px-4 py-3">
                <p className="mkt-note">Visualized without animation dependency — structure remains clear in static form.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
