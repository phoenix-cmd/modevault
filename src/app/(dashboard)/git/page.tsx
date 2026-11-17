"use client"

import { useState } from "react"
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

export default function GitControlPage() {
  const [activeTab, setActiveTab] = useState<"branches" | "commits" | "pulls">("commits")

  const commits = [
    {
      sha: "c_8f291a",
      message: "feat(agent): Add resilient idempotency key handling to Stripe checkout",
      author: "Claude Code 3.7 (Agent)",
      date: "12 mins ago",
      branch: "feature/checkout-idempotency",
    },
    {
      sha: "c_14da88",
      message: "fix(auth): Token expiration verification on refresh endpoint",
      author: "Alex Kumar",
      date: "2 hours ago",
      branch: "main",
    },
    {
      sha: "c_901be3",
      message: "chore(deps): Upgrade Prisma ORM and Next.js Turbopack engine",
      author: "Codex 5.2 (Agent)",
      date: "1 day ago",
      branch: "main",
    },
  ]

  const pulls = [
    {
      id: "PR #42",
      title: "Add resilient idempotency key handling to Stripe checkout session API",
      author: "Claude Code 3.7",
      branch: "feature/checkout-idempotency",
      target: "main",
      status: "awaiting_review",
      reviews: "1 approved",
    },
    {
      id: "PR #39",
      title: "Kafka event schema migration for telemetry streaming",
      author: "Codex 5.2",
      branch: "feature/telemetry-kafka",
      target: "main",
      status: "merged",
      reviews: "2 approved",
    },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Git Control & Branch Management"
        description="Isolated task worktrees, automatic pull request generation, and atomic commit rollbacks."
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E8EAED] text-xs font-semibold">
        <button
          onClick={() => setActiveTab("commits")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "commits"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Commit History
        </button>
        <button
          onClick={() => setActiveTab("pulls")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "pulls"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Pull Requests
        </button>
      </div>

      {/* Content */}
      {activeTab === "commits" ? (
        <div className="rounded-xl border border-[#E8EAED] bg-[#FFFFFF] divide-y divide-[#E8EAED] shadow-xs overflow-hidden">
          {commits.map((c) => (
            <div key={c.sha} className="p-4 flex items-center justify-between hover:bg-[#F8F9FB] transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F2F3F5] text-[#17191C]">
                  <GitCommit className="h-4 w-4 text-[#D5222D]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#17191C]">{c.message}</p>
                  <p className="text-[11px] text-[#737982]">
                    By <strong>{c.author}</strong> on <span className="font-mono">{c.branch}</span> • {c.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-[#F2F3F5] px-2 py-0.5 rounded border border-[#E8EAED] text-[#17191C]">
                  {c.sha}
                </span>
                <button
                  onClick={() => alert(`Reverting to checkpoint ${c.sha}...`)}
                  className="rounded-lg p-1.5 text-[#737982] hover:bg-[#F2F3F5] hover:text-[#D5222D] transition-colors"
                  title="Rollback to this commit"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pulls.map((pr) => (
            <GlassCard key={pr.id} className="p-4 border-[#E8EAED] bg-[#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF7F1] text-[#1F7A4D]">
                  <GitPullRequest className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#17191C]">{pr.id}</span>
                    <h4 className="text-xs font-semibold text-[#17191C]">{pr.title}</h4>
                  </div>
                  <p className="text-[11px] text-[#737982] mt-0.5">
                    {pr.branch} → {pr.target} • Author: {pr.author}
                  </p>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  pr.status === "merged"
                    ? "bg-[#EDF7F1] text-[#1F7A4D]"
                    : "bg-[rgba(213,34,45,0.08)] text-[#D5222D]"
                }`}
              >
                {pr.status.replace("_", " ")}
              </span>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
