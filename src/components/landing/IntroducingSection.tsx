"use client"

import { useState } from "react"

interface WalkthroughStage {
  id: string
  step: string
  marker: string
  kicker: string
  heading: string
  description: string
  codeTitle: string
  lines: Array<{ num: string; text: string; tone?: "default" | "add" | "del" | "blue" }>
  note: string
}

const STAGES: WalkthroughStage[] = [
  {
    id: "request",
    step: "01",
    marker: "REQUEST",
    kicker: "01 / CENTRAL DEVELOPMENT REQUEST",
    heading: "One directive enters a structured execution plan.",
    description:
      "Instead of copying context across terminals, an engineering task enters MODELVAULT once with target repository scope and budget bounds.",
    codeTitle: "directive // plan.json",
    lines: [
      { num: "01", text: '{ "project": "checkout-api", "branch": "feat/webhook-idempotency",' },
      { num: "02", text: '  "budgetCapUsd": 0.75,' },
      { num: "03", text: '  "agents": ["architect", "backend", "verifier"],', tone: "blue" },
      { num: "04", text: '  "approvalGate": "required" }' },
    ],
    note: "Plan generated with explicit file lock boundaries and token ceilings.",
  },
  {
    id: "agents",
    step: "02",
    marker: "AGENTS",
    kicker: "02 / PARALLEL SPECIALIZED AGENTS",
    heading: "Multiple agents work in parallel without colliding.",
    description:
      "Architect, Backend, and Verification profiles receive scoped file permissions and execute concurrently on assigned subtasks.",
    codeTitle: "mesh // active-workers",
    lines: [
      { num: "01", text: "[ARCH-01] Mapped webhook payload contract -> src/types/webhook.ts" },
      { num: "02", text: "[BACK-02] Writing signature check -> src/app/api/webhooks/route.ts", tone: "blue" },
      { num: "03", text: "[VERF-03] Queued assertions -> tests/webhook-signature.test.ts" },
    ],
    note: "Each worker operates in its own task lane with independent token telemetry.",
  },
  {
    id: "context",
    step: "03",
    marker: "CONTEXT",
    kicker: "03 / SHARED PROJECT CONTEXT",
    heading: "Every agent reads the same schema and git state.",
    description:
      "Workspace files, Prisma models, and repository conventions live in a single indexed project record rather than ad-hoc clipboard prompts.",
    codeTitle: "prisma/schema.prisma + git",
    lines: [
      { num: "14", text: "model WebhookEvent {" },
      { num: "15", text: "  id          String   @id @default(cuid())" },
      { num: "16", text: "  externalId  String   @unique", tone: "add" },
      { num: "17", text: "  processedAt DateTime @default(now())" },
      { num: "18", text: "}" },
    ],
    note: "Shared workspace index keeps implementation and tests aligned on types.",
  },
  {
    id: "verify",
    step: "04",
    marker: "VERIFICATION",
    kicker: "04 / DIFF & VERIFICATION GATE",
    heading: "Changes are inspected and verified before merge.",
    description:
      "Every generated diff surfaces alongside pattern diagnostics and unit test output so reviewers act on recorded evidence.",
    codeTitle: "routes/webhook.ts // diff",
    lines: [
      { num: "21", text: "- const event = await req.json();", tone: "del" },
      { num: "21", text: "+ const raw = await req.text();", tone: "add" },
      { num: "22", text: "+ if (!verifyHmac(raw, sig)) return NextResponse.json({}, { status: 401 });", tone: "add" },
      { num: "23", text: "  await recordIdempotentEvent(JSON.parse(raw));" },
    ],
    note: "+ Timing-safe HMAC verification added before JSON deserialization.",
  },
  {
    id: "integrate",
    step: "05",
    marker: "INTEGRATE",
    kicker: "05 / APPROVAL & GIT INTEGRATION",
    heading: "Human sign-off commits directly to the feature branch.",
    description:
      "Tech leads approve, request revision, or reject inside the command center, leaving a full audit trail attached to the branch.",
    codeTitle: "git // feat/webhook-idempotency",
    lines: [
      { num: "SHA", text: "c91f48e  feat(webhooks): enforce hmac + idempotency key", tone: "add" },
      { num: "LOG", text: "Approved by Lead Reviewer · 5,510 tokens · $0.018 recorded" },
      { num: "GIT", text: "Worktree clean · Ready for pull request", tone: "blue" },
    ],
    note: "Execution, code diff, review notes, and resource ledger stay linked.",
  },
]

export function IntroducingSection() {
  const [activeId, setActiveId] = useState<string>("request")
  const stage = STAGES.find((s) => s.id === activeId) || STAGES[0]

  return (
    <section
      id="introducing"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] py-16 sm:py-28"
    >
      <div className="rig-container">
        {/* Centered Header */}
        <div className="mx-auto mb-10 max-w-[740px] text-center sm:mb-14">
          <span className="rig-badge mb-6">Introducing MODELVAULT</span>
          <h2 className="rig-display text-[clamp(1.9rem,4.8vw,4.35rem)] font-bold leading-[0.96] text-[var(--rig-paper)]">
            One workspace.
            <br />
            Your entire AI development process.
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-[1rem] leading-[1.7] text-[var(--rig-paper-75)]">
            Coordinate specialized agents, inspect shared project changes, verify code quality, and account for every token from one technical workspace.
          </p>
        </div>

        {/* Top Step Markers */}
        <div
          className="no-scrollbar mb-8 flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible"
          role="tablist"
          aria-label="MODELVAULT workspace stages"
        >
          {STAGES.map((item) => {
            const isActive = item.id === activeId
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(item.id)}
                className={`flex min-h-[44px] min-w-[126px] shrink-0 items-center justify-between border-t-2 pt-3 pb-2 text-left rig-mono text-[11px] uppercase tracking-[0.1em] transition-colors md:min-w-0 ${
                  isActive
                    ? "border-[var(--rig-blue)] text-[var(--rig-paper)]"
                    : "border-[var(--rig-paper-18)] text-[var(--rig-paper-50)] hover:text-[var(--rig-paper)]"
                }`}
              >
                <span>{item.marker}</span>
                <span className={isActive ? "text-[var(--rig-blue)]" : "text-[var(--rig-paper-30)]"}>
                  {item.step}
                </span>
              </button>
            )
          })}
        </div>

        {/* 2-Column Editorial Stage Description */}
        <div className="mb-8 grid items-start gap-6 border-t border-[var(--rig-paper-12)] pt-7 md:grid-cols-2 md:gap-12">
          <div>
            <p className="rig-mono text-[11px] uppercase tracking-[0.13em] text-[var(--rig-blue)]">
              {stage.kicker}
            </p>
            <h3 className="mt-2.5 rig-display text-[1.6rem] font-semibold leading-[1.15] text-[var(--rig-paper)] sm:text-[1.95rem]">
              {stage.heading}
            </h3>
          </div>
          <p className="text-[0.98rem] leading-[1.72] text-[var(--rig-paper-75)] md:pt-6">
            {stage.description}
          </p>
        </div>

        {/* Technical Code & Execution Demo Frame */}
        <div className="border border-[var(--rig-paper-18)] bg-[#101214]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] px-4 py-2.5 rig-mono text-[11px]">
            <span className="text-[var(--rig-paper-75)]">{stage.codeTitle}</span>
            <span className="uppercase tracking-[0.1em] text-[var(--rig-paper-40)]">
              Illustrative Simulation
            </span>
          </div>

          <div className="overflow-x-auto py-4">
            {stage.lines.map((line, i) => (
              <div
                key={`${stage.id}-${i}`}
                className={`flex min-h-[30px] items-center px-3 rig-mono text-[12.5px] leading-[28px] whitespace-pre ${
                  line.tone === "add"
                    ? "bg-[#56d887]/10 text-[#a8dcb1]"
                    : line.tone === "del"
                    ? "bg-[#ed462d]/12 text-[#f0ae8d]"
                    : line.tone === "blue"
                    ? "bg-[#317ef5]/14 text-[#9dc2ff]"
                    : "text-[var(--rig-paper-75)]"
                }`}
              >
                <span className="w-12 shrink-0 select-none pr-3 text-right text-[#646b76]">
                  {line.num}
                </span>
                <code>{line.text}</code>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--rig-paper-12)] bg-[#0b0e0d] px-4 py-2.5 rig-mono text-[11px] text-[#94ba9c]">
            {stage.note}
          </div>
        </div>
      </div>
    </section>
  )
}
