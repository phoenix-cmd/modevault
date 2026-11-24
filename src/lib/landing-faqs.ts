export interface LandingFaqItem {
  num: string
  q: string
  a: string
}

export const LANDING_FAQS: LandingFaqItem[] = [
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
