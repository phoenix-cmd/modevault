"use client"

import { useState } from "react"
import { ShieldCheck, Lock, Users, AlertTriangle, CheckCircle2, Save } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

export default function PermissionsPage() {
  const [requireMainMergeApproval, setRequireMainMergeApproval] = useState(true)
  const [requireSchemaApproval, setRequireSchemaApproval] = useState(true)
  const [requireShellExecApproval, setRequireShellExecApproval] = useState(false)
  const [taskSpendCap, setTaskSpendCap] = useState(10)
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const team = [
    { name: "Alex Kumar", email: "alex@acme.corp", role: "Owner", access: "Full Control + Budgets" },
    { name: "Sarah Lin", email: "sarah@acme.corp", role: "Admin", access: "Agent Dispatch + PR Merges" },
    { name: "Dev Team Pool", email: "devs@acme.corp", role: "Member", access: "Sandbox Worktrees Only" },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <PageHeader
        title="Permissions & Agent Governance"
        description="Role-based access controls, automatic execution budget ceilings, and human-in-the-loop approval policies."
      />

      {saved && (
        <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#EDF7F1] p-3 text-xs text-[#1F7A4D] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Governance policies saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Guardrail Approval Policies */}
        <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E8EAED]">
            <ShieldCheck className="h-4 w-4 text-[#D5222D]" />
            <h3 className="text-sm font-semibold text-[#17191C]">
              Mandatory Approval Gates
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]/60">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Require approval before merging into protected branches
                </p>
                <p className="text-[11px] text-[#737982]">
                  Agents cannot automatically commit directly to <code className="bg-[#F2F3F5] px-1 py-0.5 rounded">main</code> or <code className="bg-[#F2F3F5] px-1 py-0.5 rounded">production</code>.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireMainMergeApproval}
                onChange={(e) => setRequireMainMergeApproval(e.target.checked)}
                className="h-4 w-4 accent-[#D5222D] rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]/60">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Require human sign-off on database schema migrations
                </p>
                <p className="text-[11px] text-[#737982]">
                  Any agent tasks modifying Prisma or SQL files pause for architectural review.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireSchemaApproval}
                onChange={(e) => setRequireSchemaApproval(e.target.checked)}
                className="h-4 w-4 accent-[#D5222D] rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Per-Task Execution Budget Ceiling ($ USD)
                </p>
                <p className="text-[11px] text-[#737982]">
                  Maximum token cost allocated to a single agent run before automatic suspension.
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono font-semibold">
                <span>$</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={taskSpendCap}
                  onChange={(e) => setTaskSpendCap(Number(e.target.value))}
                  className="w-16 rounded-md border border-[#E8EAED] bg-[#F8F9FB] px-2 py-1 text-right text-xs text-[#17191C] outline-none"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Team Members List */}
        <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#17191C]" />
              <h3 className="text-sm font-semibold text-[#17191C]">
                Workspace Members & Roles
              </h3>
            </div>
            <button
              type="button"
              onClick={() => alert("Invite link generated")}
              className="rounded-md border border-[#E8EAED] bg-[#F8F9FB] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
            >
              + Invite Member
            </button>
          </div>

          <div className="divide-y divide-[#E8EAED]">
            {team.map((m) => (
              <div key={m.email} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#17191C]">{m.name}</p>
                  <p className="text-[11px] text-[#737982]">{m.email} • {m.access}</p>
                </div>
                <span className="rounded bg-[#F2F3F5] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#17191C] border border-[#E8EAED]">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-5 py-2 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            Save Governance Settings
          </button>
        </div>
      </form>
    </div>
  )
}
