"use client"

import { useEffect, useRef } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const MATRIX = [
  { role: "Owner", propose: "Yes", review: "Yes", approve: "Yes", billing: "Yes", scope: "Organization / workspace" },
  { role: "Lead", propose: "Yes", review: "Yes", approve: "Yes", billing: "View", scope: "Assigned projects" },
  { role: "Developer", propose: "Yes", review: "Comment", approve: "No", billing: "No", scope: "Assigned projects" },
  { role: "Auditor", propose: "No", review: "View", approve: "No", billing: "View", scope: "Read-only access" },
]

export function CollaborationSection() {
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="governance" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-paper)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-8 border-b border-[var(--mkt-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">07</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Team governance
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Permissions, reviews,
              <br />
              <span className="text-[var(--mkt-ink-2)]">and accountable delivery.</span>
            </h2>
          </div>
          <p className="mkt-lead max-w-md text-[15px]">
            Make responsibility explicit: who can dispatch work, who can approve
            changes, and how decisions are recorded.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <p className="mkt-eyebrow">Permission matrix · example</p>
              <p className="mkt-note">Illustrative roles</p>
            </div>
            <div className="mt-4 overflow-x-auto border-t border-[var(--mkt-line)]">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--mkt-line)] text-[var(--mkt-ink-3)]">
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Role</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Propose</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Review</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Approve</th>
                    <th className="py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Billing</th>
                    <th className="py-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">Scope</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-[var(--mkt-ink-2)]">
                  {MATRIX.map((row) => (
                    <tr key={row.role} className="border-b border-[var(--mkt-line)]">
                      <td className="py-3.5 pr-4 font-medium text-[var(--mkt-ink)]">{row.role}</td>
                      <td className="py-3.5 pr-4">{row.propose}</td>
                      <td className="py-3.5 pr-4">{row.review}</td>
                      <td className="py-3.5 pr-4">{row.approve}</td>
                      <td className="py-3.5 pr-4">{row.billing}</td>
                      <td className="py-3.5 text-[var(--mkt-ink-3)]">{row.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6 lg:pt-7">
            <div className="border border-[var(--mkt-line)] bg-[var(--mkt-bg)] p-5">
              <p className="mkt-eyebrow">Review flow · example</p>
              <ol className="mt-4 space-y-3 text-[13px] text-[var(--mkt-ink-2)]">
                <li className="flex gap-3"><span className="mkt-mono text-[11px] text-[var(--mkt-accent)]">01</span><span>Agent proposes a change with diff and check results.</span></li>
                <li className="flex gap-3"><span className="mkt-mono text-[11px] text-[var(--mkt-accent)]">02</span><span>Reviewer leaves comments and requests edits if needed.</span></li>
                <li className="flex gap-3"><span className="mkt-mono text-[11px] text-[var(--mkt-accent)]">03</span><span>Authorized approver records the decision.</span></li>
                <li className="flex gap-3"><span className="mkt-mono text-[11px] text-[var(--mkt-accent)]">04</span><span>Merge or delivery follows repository policy.</span></li>
              </ol>
            </div>

            <div className="border-t border-[var(--mkt-line)] pt-5">
              <p className="mkt-eyebrow">Audit records</p>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                Keep a traceable history of prompts, generated artifacts, checks,
                review comments, and approvals. Records should describe what happened
                without overstating certainty.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
