"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { LANDING_FAQS } from "@/lib/landing-faqs"

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] py-16 sm:py-28"
    >
      <div className="rig-container">
        <div className="mb-10 text-center sm:mb-12">
          <span className="rig-badge mb-5">FAQ</span>
          <h2 className="rig-display text-[clamp(1.9rem,4.5vw,3.6rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
            Frequently asked questions.
          </h2>
        </div>

        <div className="mx-auto max-w-[920px]">
          {LANDING_FAQS.map((item, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={item.num}
                className="border-t border-[var(--rig-paper-18)] last:border-b"
              >
                <button
                  id={`faq-trigger-${idx}`}
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${idx}`}
                  className="flex min-h-[48px] w-full items-center gap-4 py-5 text-left transition-colors hover:text-white focus-visible:outline-2 sm:gap-5 sm:py-6"
                >
                  <span className="rig-mono text-[11px] font-bold tracking-[0.14em] text-[var(--rig-blue)]">
                    {item.num}
                  </span>
                  <span className="flex-1 rig-display text-[1.05rem] font-semibold text-[var(--rig-paper)] sm:text-[1.25rem]">
                    {item.q}
                  </span>
                  <Plus
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-[var(--rig-paper-50)] transition-transform duration-200 ${
                      isOpen ? "rotate-45 text-[var(--rig-blue)]" : ""
                    }`}
                  />
                </button>

                <div
                  id={`faq-panel-${idx}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${idx}`}
                  hidden={!isOpen}
                  className="pb-6 pl-7 pr-2 text-[0.92rem] leading-[1.7] text-[var(--rig-paper-75)] sm:pl-11 sm:pr-6"
                >
                  <p className="max-w-[660px]">{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
