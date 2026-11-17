"use client"

import { useState } from "react"
import {
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Save,
  Key,
  Sliders,
  DollarSign,
  Plus,
  X,
  UserCheck,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

interface TeamMember {
  id: string
  name: string
  email: string
  role: "Owner" | "Lead" | "Developer" | "Viewer"
  canDispatch: boolean
  canMerge: boolean
  canViewBilling: boolean
}

export default function PermissionsPage() {
  const [requireMainMergeApproval, setRequireMainMergeApproval] = useState(true)
  const [requireSchemaApproval, setRequireSchemaApproval] = useState(true)
  const [autoApproveUnderThreshold, setAutoApproveUnderThreshold] = useState(true)
  const [autoApproveLimit, setAutoApproveLimit] = useState(0.20)
  const [monthlySpendCap, setMonthlySpendCap] = useState(2500)
  const [taskSpendCap, setTaskSpendCap] = useState(15)
  const [keyRotationDays, setKeyRotationDays] = useState(60)
  const [saved, setSaved] = useState(false)

  // Team members
  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: "u1",
      name: "Alex Kumar",
      email: "alex@acme.corp",
      role: "Owner",
      canDispatch: true,
      canMerge: true,
      canViewBilling: true,
    },
    {
      id: "u2",
      name: "Sarah Lin",
      email: "sarah@acme.corp",
      role: "Lead",
      canDispatch: true,
      canMerge: true,
      canViewBilling: false,
    },
    {
      id: "u3",
      name: "Jordan Reed",
      email: "jordan@acme.corp",
      role: "Developer",
      canDispatch: true,
      canMerge: false,
      canViewBilling: false,
    },
    {
      id: "u4",
      name: "Auditor Bot",
      email: "auditor@acme.corp",
      role: "Viewer",
      canDispatch: false,
      canMerge: false,
      canViewBilling: true,
    },
  ])

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<"Lead" | "Developer" | "Viewer">("Developer")

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) return

    setTeam((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        canDispatch: inviteRole !== "Viewer",
        canMerge: inviteRole === "Lead",
        canViewBilling: false,
      },
    ])

    setInviteName("")
    setInviteEmail("")
    setShowInviteModal(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleRoleChange = (userId: string, newRole: "Owner" | "Lead" | "Developer" | "Viewer") => {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              role: newRole,
              canDispatch: newRole !== "Viewer",
              canMerge: newRole === "Owner" || newRole === "Lead",
              canViewBilling: newRole === "Owner",
            }
          : m
      )
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      <PageHeader
        title="Permissions & Organization Governance"
        description="Role-based access controls, automatic execution budget ceilings, and human-in-the-loop approval policies."
      />

      {saved && (
        <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#EDF7F1] p-3 text-xs text-[#1F7A4D] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">Governance policies and team permissions updated successfully!</span>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8EAED] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#040404] text-white">
                  <UserCheck className="h-4 w-4 text-[#D5222D]" />
                </span>
                <h3 className="text-sm font-bold text-[#17191C]">Invite Team Member</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="rounded-lg p-1 text-[#737982] hover:bg-[#F2F3F5]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#17191C]">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="mt-1 w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C]">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. elena@acme.corp"
                  className="mt-1 w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C]">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs outline-none"
                >
                  <option value="Lead">Tech Lead (Can Approve & Merge PRs)</option>
                  <option value="Developer">Developer (Can Dispatch Agents in Sandbox)</option>
                  <option value="Viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAED]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#737982] hover:bg-[#F2F3F5] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Guardrail Approval Policies */}
        <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E8EAED]">
            <ShieldCheck className="h-4 w-4 text-[#D5222D]" />
            <h3 className="text-sm font-semibold text-[#17191C]">
              Mandatory Approval Gates & Safeguards
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]/60">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Require human approval before merging to protected branches
                </p>
                <p className="text-[11px] text-[#737982]">
                  Agents cannot automatically commit directly to <code className="bg-[#F2F3F5] px-1 py-0.5 rounded">main</code> or <code className="bg-[#F2F3F5] px-1 py-0.5 rounded">production</code>.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireMainMergeApproval}
                onChange={(e) => setRequireMainMergeApproval(e.target.checked)}
                className="h-4 w-4 accent-[#D5222D] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]/60">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Require human sign-off on database schema migrations
                </p>
                <p className="text-[11px] text-[#737982]">
                  Any agent tasks modifying Prisma, migrations, or SQL files pause for lead architect review.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireSchemaApproval}
                onChange={(e) => setRequireSchemaApproval(e.target.checked)}
                className="h-4 w-4 accent-[#D5222D] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-[#17191C]">
                  Auto-approve micro-changes under threshold
                </p>
                <p className="text-[11px] text-[#737982]">
                  Fast-track trivial documentation or unit test patches costing less than threshold.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={autoApproveUnderThreshold}
                  onChange={(e) => setAutoApproveUnderThreshold(e.target.checked)}
                  className="h-4 w-4 accent-[#D5222D] rounded cursor-pointer"
                />
                {autoApproveUnderThreshold && (
                  <span className="font-mono text-[11px] bg-[#F2F3F5] px-2 py-0.5 rounded border border-[#E8EAED]">
                    ${autoApproveLimit.toFixed(2)}/run
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Budget Ceilings & Security Rotation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E8EAED]">
              <DollarSign className="h-4 w-4 text-[#D5222D]" />
              <h3 className="text-xs font-bold text-[#17191C]">Spending Caps</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#737982]">Monthly Org Cap:</span>
                  <span className="font-mono font-bold text-[#17191C]">${monthlySpendCap}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={monthlySpendCap}
                  onChange={(e) => setMonthlySpendCap(Number(e.target.value))}
                  className="w-full mt-1.5 accent-[#D5222D]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#737982]">Per-Task Hard Ceiling:</span>
                  <span className="font-mono font-bold text-[#17191C]">${taskSpendCap}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={taskSpendCap}
                  onChange={(e) => setTaskSpendCap(Number(e.target.value))}
                  className="w-full mt-1.5 accent-[#D5222D]"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E8EAED]">
              <Key className="h-4 w-4 text-[#D5222D]" />
              <h3 className="text-xs font-bold text-[#17191C]">API Key Rotation Policy</h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#737982]">
                Enforce periodic secret rolling for connected OpenAI, Anthropic, and Google provider tokens.
              </p>
              <div className="flex items-center gap-2">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setKeyRotationDays(days)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      keyRotationDays === days
                        ? "border-[#040404] bg-[#040404] text-white"
                        : "border-[#E8EAED] bg-[#F8F9FB] text-[#737982] hover:text-[#17191C]"
                    }`}
                  >
                    Every {days} Days
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Team Members List */}
        <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#17191C]" />
              <h3 className="text-sm font-semibold text-[#17191C]">
                Workspace Members & Role Permissions
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1 rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#E8EAED]"
            >
              <Plus className="h-3 w-3 text-[#D5222D]" />
              Invite Member
            </button>
          </div>

          <div className="divide-y divide-[#E8EAED]">
            {team.map((m) => (
              <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#17191C]">{m.name}</p>
                  <p className="text-[11px] text-[#737982]">{m.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#737982]">
                    <span className={`h-2 w-2 rounded-full ${m.canDispatch ? "bg-[#1F7A4D]" : "bg-zinc-300"}`} />
                    <span>Dispatch</span>
                    <span className={`h-2 w-2 rounded-full ml-1.5 ${m.canMerge ? "bg-[#1F7A4D]" : "bg-zinc-300"}`} />
                    <span>Merge</span>
                  </div>

                  <select
                    value={m.role}
                    onChange={(e: any) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-2 py-1 font-mono text-[11px] font-bold uppercase text-[#17191C] outline-none"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Lead">Lead</option>
                    <option value="Developer">Developer</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
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
