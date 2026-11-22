"use client"

import { useState } from "react"

interface CodeCase {
  id: string
  label: string
  file: string
  issueFlag: string
  originalLines: Array<{ num: string; text: string; flagged?: boolean }>
  issueExplanation: string
  fixedLines: Array<{ num: string; text: string; added?: boolean }>
  fixExplanation: string
  verificationResult: string
}

const CASES: CodeCase[] = [
  {
    id: "sql",
    label: "SQL Parameterization",
    file: "src/app/api/users/search/route.ts",
    issueFlag: "! Raw string interpolation in SQL query",
    originalLines: [
      { num: "12", text: "const name = req.nextUrl.searchParams.get('name') ?? '';" },
      { num: "13", text: "const rows = await prisma.$queryRawUnsafe(", flagged: true },
      { num: "14", text: "  `SELECT id, email FROM users WHERE name = '${name}'`", flagged: true },
      { num: "15", text: ");" },
    ],
    issueExplanation:
      "Interpolating request parameters directly into a template string lets crafted input alter the SQL statement structure.",
    fixedLines: [
      { num: "12", text: "const name = req.nextUrl.searchParams.get('name') ?? '';" },
      { num: "13", text: "const rows = await prisma.$queryRaw`", added: true },
      { num: "14", text: "  SELECT id, email FROM users WHERE name = ${name}", added: true },
      { num: "15", text: "`;" },
    ],
    fixExplanation:
      "Pass user input through a tagged parameterized query so the database driver binds the parameter strictly as data.",
    verificationResult: "Pattern check passed · 0 unescaped SQL interpolations remain · Tagged $queryRaw verified",
  },
  {
    id: "webhook",
    label: "Signature Verification",
    file: "src/app/api/billing/webhook/route.ts",
    issueFlag: "! Non-constant string comparison on HMAC digest",
    originalLines: [
      { num: "18", text: "const sig = req.headers.get('x-signature') ?? '';" },
      { num: "19", text: "const digest = createHmac('sha256', secret).update(raw).digest('hex');" },
      { num: "20", text: "if (digest !== sig) return new Response('Unauthorized', { status: 401 });", flagged: true },
      { num: "21", text: "await applyInvoiceEvent(JSON.parse(raw));" },
    ],
    issueExplanation:
      "Using !== exits early on the first mismatched byte, which can leak timing differences when comparing cryptographic signatures.",
    fixedLines: [
      { num: "18", text: "const sig = Buffer.from(req.headers.get('x-signature') ?? '', 'utf8');" },
      { num: "19", text: "const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'), 'utf8');" },
      { num: "20", text: "if (sig.length !== expected.length || !timingSafeEqual(sig, expected))", added: true },
      { num: "21", text: "  return new Response('Unauthorized', { status: 401 });" },
    ],
    fixExplanation:
      "Check buffer lengths first and compare digests with crypto.timingSafeEqual to keep comparison runtime uniform.",
    verificationResult: "Pattern check passed · timingSafeEqual present with length guard",
  },
  {
    id: "timeout",
    label: "Bounded External Fetch",
    file: "src/lib/sync/provider-client.ts",
    issueFlag: "! Unbounded outbound request without signal timeout",
    originalLines: [
      { num: "09", text: "export async function fetchProviderUsage(url: string, key: string) {" },
      { num: "10", text: "  const res = await fetch(url, {", flagged: true },
      { num: "11", text: "    headers: { Authorization: `Bearer ${key}` },", flagged: true },
      { num: "12", text: "  });" },
    ],
    issueExplanation:
      "An upstream stall hangs the worker request indefinitely, exhausting concurrency limits across agent loops.",
    fixedLines: [
      { num: "09", text: "export async function fetchProviderUsage(url: string, key: string) {" },
      { num: "10", text: "  const res = await fetch(url, {", added: true },
      { num: "11", text: "    headers: { Authorization: `Bearer ${key}` },", added: true },
      { num: "12", text: "    signal: AbortSignal.timeout(8000),", added: true },
      { num: "13", text: "  });" },
    ],
    fixExplanation:
      "Attach AbortSignal.timeout so hung upstream requests fail fast and hand back explicit diagnostics.",
    verificationResult: "Pattern check passed · Request timeout bound enforced (8000ms)",
  },
]

export function VerificationSection() {
  const [selectedId, setSelectedId] = useState<string>("sql")
  const [mobilePane, setMobilePane] = useState<"both" | "issue" | "fix">("both")
  const item = CASES.find((c) => c.id === selectedId) || CASES[0]

  return (
    <section
      id="verification"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] py-16 sm:py-28"
    >
      <div className="rig-container">
        <div className="mx-auto max-w-[720px] text-center">
          <span className="rig-badge mb-6">Code Demonstration</span>
          <h2 className="rig-display text-[clamp(1.9rem,4.6vw,4.1rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
            Clear findings.
            <br />
            Actionable fixes.
          </h2>
          <p className="mx-auto mt-5 max-w-[580px] text-[1rem] leading-[1.7] text-[var(--rig-paper-75)]">
            Give coding agents and reviewers exact line locations, why a pattern is risky, and a verified diff before code merges.
          </p>
        </div>

        {/* Scenario Switcher */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {CASES.map((c) => {
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-pressed={active}
                className={`min-h-[44px] border px-3.5 py-2 rig-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)] text-[var(--rig-paper)]"
                    : "border-[var(--rig-paper-18)] bg-[#101514] text-[var(--rig-paper-50)] hover:text-[var(--rig-paper)]"
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Mobile Issue / Fix Focus Toggle */}
        <div className="mt-4 flex gap-2 lg:hidden" role="group" aria-label="Comparison view">
          {[
            { id: "both" as const, label: "Both" },
            { id: "issue" as const, label: "01 / Issue" },
            { id: "fix" as const, label: "02 / Fix" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setMobilePane(mode.id)}
              aria-pressed={mobilePane === mode.id}
              className={`min-h-[42px] flex-1 border rig-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${
                mobilePane === mode.id
                  ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)] text-[var(--rig-paper)]"
                  : "border-[var(--rig-paper-18)] bg-[#101514] text-[var(--rig-paper-50)]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Side-by-Side Before & After Demonstration */}
        <div className="mt-6 border border-[var(--rig-paper-18)] bg-[#101214] lg:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] px-4 py-2.5 rig-mono text-[11px]">
            <span className="min-w-0 truncate text-[var(--rig-paper-75)]">{item.file}</span>
            <span className="text-[var(--rig-yellow)] uppercase tracking-[0.1em]">
              Illustrative Example · Not a live security certification
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* 01 / THE ISSUE */}
            <div
              className={`border-b border-[var(--rig-paper-12)] p-4 sm:p-6 lg:border-b-0 lg:border-r ${
                mobilePane === "fix" ? "hidden lg:block" : ""
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="rig-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rig-red)]">
                  01 / The Issue
                </span>
                <span className="rig-mono text-[10.5px] text-[var(--rig-yellow)]">
                  Original code
                </span>
              </div>

              <div className="border border-[var(--rig-paper-12)] bg-[#0b0e0d] py-3 overflow-x-auto">
                {item.originalLines.map((line) => (
                  <div
                    key={`orig-${line.num}`}
                    className={`flex items-center px-3 rig-mono text-[11.5px] leading-[26px] whitespace-pre ${
                      line.flagged
                        ? "bg-[var(--rig-yellow)]/12 text-[var(--rig-yellow)]"
                        : "text-[var(--rig-paper-75)]"
                    }`}
                  >
                    <span className="w-8 shrink-0 select-none pr-3 text-right text-[#646b76]">
                      {line.num}
                    </span>
                    <code>{line.text}</code>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-l-2 border-[var(--rig-red)] bg-[#ed462d]/8 px-3.5 py-2.5">
                <p className="rig-mono text-[11px] font-semibold text-[var(--rig-red)]">
                  {item.issueFlag}
                </p>
                <p className="mt-1 text-[13px] leading-[1.6] text-[var(--rig-paper-75)]">
                  {item.issueExplanation}
                </p>
              </div>
            </div>

            {/* 02 / THE FIX */}
            <div className={`p-4 sm:p-6 ${mobilePane === "issue" ? "hidden lg:block" : ""}`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="rig-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rig-green)]">
                  02 / The Fix
                </span>
                <span className="rig-mono text-[10.5px] text-[var(--rig-green)]">
                  Modified code
                </span>
              </div>

              <div className="border border-[var(--rig-paper-12)] bg-[#0b0e0d] py-3 overflow-x-auto">
                {item.fixedLines.map((line) => (
                  <div
                    key={`fix-${line.num}`}
                    className={`flex items-center px-3 rig-mono text-[11.5px] leading-[26px] whitespace-pre ${
                      line.added
                        ? "bg-[#56d887]/12 text-[#a8dcb1]"
                        : "text-[var(--rig-paper-75)]"
                    }`}
                  >
                    <span className="w-8 shrink-0 select-none pr-3 text-right text-[#646b76]">
                      {line.num}
                    </span>
                    <code>{line.text}</code>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-l-2 border-[var(--rig-green)] bg-[#56d887]/8 px-3.5 py-2.5">
                <p className="rig-mono text-[11px] font-semibold text-[var(--rig-green)]">
                  Verification Result (Illustrative)
                </p>
                <p className="mt-1 text-[13px] leading-[1.6] text-[var(--rig-paper-75)]">
                  {item.fixExplanation}
                </p>
                <p className="mt-2 rig-mono text-[10.5px] text-[#94ba9c]">
                  {item.verificationResult}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rig 3-Column Evidence Strip */}
        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[var(--rig-paper-18)] pt-10 md:grid-cols-3">
          <div>
            <p className="rig-mono text-[11px] text-[var(--rig-blue)]">01</p>
            <h3 className="mt-2 rig-display text-[1.25rem] font-semibold text-[var(--rig-paper)]">
              Know where to look.
            </h3>
            <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--rig-paper-60)]">
              Findings point to exact files and line numbers inside the diff review rather than buried logs.
            </p>
          </div>
          <div>
            <p className="rig-mono text-[11px] text-[var(--rig-blue)]">02</p>
            <h3 className="mt-2 rig-display text-[1.25rem] font-semibold text-[var(--rig-paper)]">
              Understand what matters.
            </h3>
            <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--rig-paper-60)]">
              Plain engineering explanations clarify why a line is flagged and what data boundary must hold.
            </p>
          </div>
          <div>
            <p className="rig-mono text-[11px] text-[var(--rig-blue)]">03</p>
            <h3 className="mt-2 rig-display text-[1.25rem] font-semibold text-[var(--rig-paper)]">
              Check the change.
            </h3>
            <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--rig-paper-60)]">
              Compare original and remediated code side by side before approving commits into the target branch.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
