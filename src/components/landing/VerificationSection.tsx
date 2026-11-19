"use client"

import { useEffect, useRef, useState } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const BEFORE = `export async function findUserByEmail(email: string) {
  return db.query(
    "SELECT * FROM users WHERE email = '" + email + "'"
  )
}`

const AFTER = `export async function findUserByEmail(email: string) {
  return db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  )
}`

const STEPS = [
  { n: "01", t: "Generated change", d: "Agent proposes code for the requested task." },
  { n: "02", t: "Checks run", d: "Static analysis and tests inspect the change." },
  { n: "03", t: "Findings", d: "Issues are reported with location and severity." },
  { n: "04", t: "Remediation", d: "The change is revised and rechecked." },
  { n: "05", t: "Review evidence", d: "Results are attached for human approval." },
]

export function VerificationSection() {
  const [mode, setMode] = useState<"finding" | "revised">("finding")
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="verification" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-paper)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-8 border-b border-[var(--mkt-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">05</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Verification and security
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Treat generated code as
              <br />
              <span className="text-[var(--mkt-ink-2)]">a change that must be checked.</span>
            </h2>
          </div>
          <p className="mkt-lead max-w-md text-[15px]">
            Verification combines automated checks with review evidence. Findings
            should be specific, traceable, and followed by remediation — not hidden
            behind certainty claims.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="mkt-eyebrow">Verification path · example</p>
            <ol className="mt-4 space-y-0 border-t border-[var(--mkt-line)]">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-4 ${
                    i !== STEPS.length - 1 ? "border-b border-[var(--mkt-line)]" : ""
                  }`}
                >
                  <span className="mkt-mono text-[11px] tracking-[0.1em] text-[var(--mkt-accent)]">{s.n}</span>
                  <div>
                    <p className="font-display text-[16px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">{s.t}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mkt-note mt-5 border-t border-[var(--mkt-line)] pt-4">
              Example process only. Actual checks depend on repository, tools, and policy.
            </p>
          </div>

          <div className="border border-[var(--mkt-line)] bg-[var(--mkt-bg)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mkt-line)] px-4 py-3 sm:px-5">
              <div>
                <p className="mkt-eyebrow">Finding record · demonstration</p>
                <p className="mt-1 font-display text-[18px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
                  Unsanitized query input
                </p>
              </div>
              <div className="flex items-center gap-1 border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("finding")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
                    mode === "finding" ? "bg-[var(--mkt-bg)] text-[var(--mkt-ink)]" : "text-[var(--mkt-ink-3)]"
                  }`}
                >
                  Finding
                </button>
                <button
                  type="button"
                  onClick={() => setMode("revised")}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
                    mode === "revised" ? "bg-[var(--mkt-bg)] text-[var(--mkt-ink)]" : "text-[var(--mkt-ink-3)]"
                  }`}
                >
                  Revised
                </button>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="border-b border-[var(--mkt-line)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <dl className="space-y-4 text-[13px]">
                  <div>
                    <dt className="mkt-eyebrow">Severity</dt>
                    <dd className="mt-1 font-medium text-[var(--mkt-warning)]">High (example)</dd>
                  </div>
                  <div>
                    <dt className="mkt-eyebrow">Category</dt>
                    <dd className="mt-1 text-[var(--mkt-ink-2)]">Injection risk / unsafe input handling</dd>
                  </div>
                  <div>
                    <dt className="mkt-eyebrow">Affected file</dt>
                    <dd className="mkt-mono mt-1 text-[11px] text-[var(--mkt-ink)]">src/db/users.ts</dd>
                  </div>
                  <div>
                    <dt className="mkt-eyebrow">Status</dt>
                    <dd className={`mt-1 font-medium ${mode === "revised" ? "text-[var(--mkt-success)]" : "text-[var(--mkt-ink-2)]"}`}>
                      {mode === "revised" ? "Remediated in revised change" : "Reported, awaiting remediation"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 sm:p-5">
                <p className="mkt-eyebrow">{mode === "finding" ? "Flagged snippet" : "Revised snippet"}</p>
                <pre className="mkt-mono mt-3 overflow-x-auto border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-4 text-[12px] leading-relaxed text-[var(--mkt-ink)]">
                  <code>{mode === "finding" ? BEFORE : AFTER}</code>
                </pre>
                <p className="mt-4 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                  {mode === "finding"
                    ? "The finding identifies direct string interpolation in a query. Evidence should point reviewers to the exact location and suggested remediation."
                    : "The revised example uses parameterized input. A reviewer can compare the change, rerun checks, and record the outcome."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
