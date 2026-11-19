"use client"

import { useEffect, useRef } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const PROBLEMS = [
  {
    code: "01",
    title: "Fragmented execution",
    note: "Coordination",
    body: "Agents often work in isolation. Plans, implementation, and tests drift apart when context and dependencies are not shared.",
  },
  {
    code: "02",
    title: "Unclear cost and usage",
    note: "Visibility",
    body: "Token use, subscriptions, and model choices are difficult to compare when spending is spread across tools and providers.",
  },
  {
    code: "03",
    title: "Unverified output",
    note: "Quality",
    body: "Generated code can be plausible yet incomplete. Without checks and review, defects and security issues reach the main branch.",
  },
  {
    code: "04",
    title: "Limited governance",
    note: "Control",
    body: "Teams need clear ownership, permissions, and records of what was generated, reviewed, and approved.",
  },
]

export function ProblemSection() {
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section ref={ref} className="border-b border-[var(--mkt-line)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">01</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Context
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Faster code generation created
              <br />
              <span className="text-[var(--mkt-ink-2)]">new coordination work.</span>
            </h2>
            <p className="mkt-lead mt-5 max-w-md text-[15px]">
              Modelvault treats agents, workflows, and verification as parts of one
              development system rather than separate tools.
            </p>
          </div>

          <div className="border-t border-[var(--mkt-line)]">
            {PROBLEMS.map((item, i) => (
              <article
                key={item.code}
                className={`grid gap-3 py-6 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-6 ${
                  i !== PROBLEMS.length - 1 ? "border-b border-[var(--mkt-line)]" : ""
                }`}
              >
                <div className="flex items-start justify-between sm:block">
                  <p className="mkt-mono text-[11px] tracking-[0.1em] text-[var(--mkt-accent)]">
                    {item.code}
                  </p>
                  <p className="mkt-note mt-0 sm:mt-2">{item.note}</p>
                </div>
                <div>
                  <h3 className="font-display text-[18px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--mkt-ink-2)]">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
