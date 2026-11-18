"use client"

import { useState } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
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
  const inviteDialogRef = useModalA11y(showInviteModal, () => setShowInviteModal(false))
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
        <div className="rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">Governance policies and team permissions updated successfully!</span>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            ref={inviteDialogRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-charcoal text-white">
                  <UserCheck className="h-4 w-4 text-accent" />
                </span>
                <h3 className="text-sm font-bold text-ink">Invite Team Member</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="rounded-lg p-1 text-ink-2 hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. elena@acme.corp"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs outline-none"
                >
                  <option value="Lead">Tech Lead (Can Approve & Merge PRs)</option>
                  <option value="Developer">Developer (Can Dispatch Agents in Sandbox)</option>
                  <option value="Viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
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
        <GlassCard className="p-5 border-line bg-surface space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-ink">
              Mandatory Approval Gates & Safeguards
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-line/60">
              <div>
                <p className="font-semibold text-ink">
                  Require human approval before merging to protected branches
                </p>
                <p className="text-[11px] text-ink-2">
                  Agents cannot automatically commit directly to <code className="bg-surface-2 px-1 py-0.5 rounded">main</code> or <code className="bg-surface-2 px-1 py-0.5 rounded">production</code>.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireMainMergeApproval}
                onChange={(e) => setRequireMainMergeApproval(e.target.checked)}
                className="h-4 w-4 accent-accent rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-line/60">
              <div>
                <p className="font-semibold text-ink">
                  Require human sign-off on database schema migrations
                </p>
                <p className="text-[11px] text-ink-2">
                  Any agent tasks modifying Prisma, migrations, or SQL files pause for lead architect review.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireSchemaApproval}
                onChange={(e) => setRequireSchemaApproval(e.target.checked)}
                className="h-4 w-4 accent-accent rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-ink">
                  Auto-approve micro-changes under threshold
                </p>
                <p className="text-[11px] text-ink-2">
                  Fast-track trivial documentation or unit test patches costing less than threshold.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={autoApproveUnderThreshold}
                  onChange={(e) => setAutoApproveUnderThreshold(e.target.checked)}
                  className="h-4 w-4 accent-accent rounded cursor-pointer"
                />
                {autoApproveUnderThreshold && (
                  <span className="font-mono text-[11px] bg-surface-2 px-2 py-0.5 rounded border border-line">
                    ${autoApproveLimit.toFixed(2)}/run
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Budget Ceilings & Security Rotation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 border-line bg-surface space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-line">
              <DollarSign className="h-4 w-4 text-accent" />
              <h3 className="text-xs font-bold text-ink">Spending Caps</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-2">Monthly Org Cap:</span>
                  <span className="font-mono font-bold text-ink">${monthlySpendCap}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={monthlySpendCap}
                  onChange={(e) => setMonthlySpendCap(Number(e.target.value))}
                  className="w-full mt-1.5 accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-2">Per-Task Hard Ceiling:</span>
                  <span className="font-mono font-bold text-ink">${taskSpendCap}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={taskSpendCap}
                  onChange={(e) => setTaskSpendCap(Number(e.target.value))}
                  className="w-full mt-1.5 accent-accent"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-line bg-surface space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-line">
              <Key className="h-4 w-4 text-accent" />
              <h3 className="text-xs font-bold text-ink">API Key Rotation Policy</h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-ink-2">
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
                        ? "border-charcoal bg-charcoal text-white"
                        : "border-line bg-canvas text-ink-2 hover:text-ink"
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
        <GlassCard className="p-5 border-line bg-surface space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ink" />
              <h3 className="text-sm font-semibold text-ink">
                Workspace Members & Role Permissions
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-line"
            >
              <Plus className="h-3 w-3 text-accent" />
              Invite Member
            </button>
          </div>

          <div className="divide-y divide-line">
            {team.map((m) => (
              <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{m.name}</p>
                  <p className="text-[11px] text-ink-2">{m.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
                    <span className={`h-2 w-2 rounded-full ${m.canDispatch ? "bg-success" : "bg-zinc-300"}`} />
                    <span>Dispatch</span>
                    <span className={`h-2 w-2 rounded-full ml-1.5 ${m.canMerge ? "bg-success" : "bg-zinc-300"}`} />
                    <span>Merge</span>
                  </div>

                  <select
                    value={m.role}
                    onChange={(e: any) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-lg border border-line bg-canvas px-2 py-1 font-mono text-[11px] font-bold uppercase text-ink outline-none"
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
            className="flex items-center gap-1.5 rounded-lg bg-charcoal px-5 py-2 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            Save Governance Settings
          </button>
        </div>
      </form>
    </div>
  )
}
