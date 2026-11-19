"use client"

import { useEffect, useRef } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const PROVIDERS = [
  { provider: "Anthropic", plan: "Team plan (example)", period: "Monthly", included: "Shared usage allowance", tracked: "Seat + usage records", notes: "Invoice uploaded" },
  { provider: "OpenAI", plan: "API account (example)", period: "Usage-based", included: "Pay-as-you-go", tracked: "Token telemetry", notes: "Budget threshold set" },
  { provider: "Google", plan: "Developer account (example)", period: "Usage-based", included: "Pay-as-you-go", tracked: "Requests / tokens", notes: "Project attribution" },
  { provider: "Open-source runtime", plan: "Self-hosted (example)", period: "Infrastructure", included: "N/A", tracked: "Compute estimates", notes: "Internal cost center" },
]

const BREAKDOWN = [
  { label: "Model API usage", value: 46, note: "Share of tracked spend (example)" },
  { label: "Subscriptions / seats", value: 32, note: "Recurring plans (example)" },
  { label: "Evaluation & tooling", value: 14, note: "Testing, review, support (example)" },
  { label: "Unattributed", value: 8, note: "Needs project mapping (example)" },
]

export function ResourceIntelligence() {
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="intelligence" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-bg)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-8 border-b border-[var(--mkt-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">06</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Resource intelligence
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Understand spend, usage,
              <br />
              <span className="text-[var(--mkt-ink-2)]">and allocation in context.</span>
            </h2>
          </div>
          <div className="max-w-md">
            <p className="mkt-lead text-[15px]">
              Compare providers, subscriptions, and usage records with clear units and
              attribution. Treat forecasts as estimates, not guarantees.
            </p>
            <p className="mkt-note mt-4 border-l border-[var(--mkt-accent-border)] pl-3 text-[var(--mkt-accent-strong)]">
              Demonstration data — not live provider usage or financial records.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <p className="mkt-eyebrow">Provider & plan comparison · example</p>
              <p className="mkt-note">Sample records</p>
            </div>
            <div className="mt-4 overflow-x-auto border-t border-[var(--mkt-line)]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--mkt-line)] text-[var(--mkt-ink-3)]">
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Provider</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Plan / account</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Billing</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Included</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Tracked</th>
                    <th className="py-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Note</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-[var(--mkt-ink-2)]">
                  {PROVIDERS.map((row) => (
                    <tr key={row.provider} className="border-b border-[var(--mkt-line)] align-top">
                      <td className="py-3.5 pr-4 font-medium text-[var(--mkt-ink)]">{row.provider}</td>
                      <td className="py-3.5 pr-4">{row.plan}</td>
                      <td className="py-3.5 pr-4">{row.period}</td>
                      <td className="py-3.5 pr-4">{row.included}</td>
                      <td className="py-3.5 pr-4">{row.tracked}</td>
                      <td className="py-3.5 text-[var(--mkt-ink-3)]">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:pt-7">
            <div className="border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="mkt-eyebrow">Spend breakdown · example</p>
                <p className="mkt-note">Proportions only</p>
              </div>
              <div className="mt-5 space-y-4">
                {BREAKDOWN.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-medium text-[var(--mkt-ink)]">{item.label}</p>
                      <p className="mkt-mono text-[12px] text-[var(--mkt-ink-2)]">{item.value}%</p>
                    </div>
                    <div className="mt-2 h-px w-full bg-[var(--mkt-line)]">
                      <div className="h-px bg-[var(--mkt-accent)]" style={{ width: `${item.value}%` }} />
                    </div>
                    <p className="mt-1.5 text-[12px] text-[var(--mkt-ink-3)]">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-[var(--mkt-line)] pt-5">
                <p className="mkt-eyebrow">Usage timeline notes</p>
                <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                  <li>Record usage by project, agent run, or environment where possible.</li>
                  <li>Compare committed subscriptions against observed utilization.</li>
                  <li>Flag unattributed spend for follow-up rather than assuming a source.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
