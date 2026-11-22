"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

const FAQS = [
  {
    num: "01",
    q: "Does MODELVAULT work with my existing coding agents and subscriptions?",
    a: "Yes. MODELVAULT organizes workspace execution profiles (Claude Code, Codex, Gemini CLI) alongside manual and API-connected provider subscriptions so teams track usage, budgets, and outputs in one system. Additional local CLI adapters remain explicitly marked as planned.",
  },
  {
    num: "02",
    q: "How does multi-agent orchestration avoid overwriting files?",
    a: "Every execution begins with a planning stage that assigns distinct subtasks and file ownership boundaries before code diffs are generated, then consolidates changes onto a dedicated Git branch for inspection.",
  },
  {
    num: "03",
    q: "What does Verification Center actually check today?",
    a: "Verification Center reviews real execution records, diff artifacts, task stages, and review comments stored in your workspace, and runs transparent local pattern checks against added diff lines without fabricating third-party certifications.",
  },
  {
    num: "04",
    q: "Does MODELVAULT separate consumer subscriptions from metered API tokens?",
    a: "Yes. Fixed recurring seats (Subscriptions & Billing), developer token accounts (Usage & Limits), and per-execution cost records stay separated so billing attribution remains clear.",
  },
  {
    num: "05",
    q: "Can developers approve or reject agent diffs before merge?",
    a: "Every run awaiting approval supports side-by-side Monaco diff inspection, line-anchored review notes, and explicit Approve, Request Revision, or Reject actions backed by the workspace database.",
  },
  {
    num: "06",
    q: "How are provider credentials stored?",
    a: "API keys saved inside Integrations are encrypted on the server before storage and never returned in full to client components.",
  },
]

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="border-b border-[var(--rig-paper-18)] py-20 sm:py-28"
    >
      <div className="rig-container">
        <div className="mb-12 text-center">
          <span className="rig-badge mb-5">FAQ</span>
          <h2 className="rig-display text-[clamp(2.2rem,4.5vw,3.6rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
            Frequently asked questions.
          </h2>
        </div>

        <div className="mx-auto max-w-[920px]">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={item.num}
                className="border-t border-[var(--rig-paper-18)] last:border-b"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-5 py-6 text-left transition-colors hover:text-white focus-visible:outline-2"
                >
                  <span className="rig-mono text-[11px] font-bold tracking-[0.14em] text-[var(--rig-blue)]">
                    {item.num}
                  </span>
                  <span className="flex-1 rig-display text-[1.1rem] font-semibold text-[var(--rig-paper)] sm:text-[1.25rem]">
                    {item.q}
                  </span>
                  <Plus
                    className={`h-4 w-4 shrink-0 text-[var(--rig-paper-50)] transition-transform duration-200 ${
                      isOpen ? "rotate-45 text-[var(--rig-blue)]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pb-6 pl-10 pr-6 text-[0.92rem] leading-[1.7] text-[var(--rig-paper-75)] sm:pl-11">
                    <p className="max-w-[660px]">{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
