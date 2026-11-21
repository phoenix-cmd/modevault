"use client"

import { useState } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import {
  CheckCircle2,
  DollarSign,
  Key,
  Plus,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  email: string
  role: "Owner" | "Lead" | "Developer" | "Viewer"
  canDispatch: boolean
  canMerge: boolean
  canViewBilling: boolean
}

const ROLES: TeamMember["role"][] = ["Owner", "Lead", "Developer", "Viewer"]

function PermissionFlag({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em]",
        on ? "text-ink-2" : "text-ink-3/60"
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", on ? "bg-accent" : "bg-ink-3/30")} />
      {label}
    </span>
  )
}

function RoleCell({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex justify-center text-accent" aria-label="Allowed">
      <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
    </span>
  ) : (
    <span className="inline-flex justify-center text-ink-3/30" aria-label="Not allowed">
      <span className="block h-px w-3 bg-current" />
    </span>
  )
}

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "u1",
    name: "Aarav Kumar",
    email: "aarav@company.com",
    role: "Owner",
    canDispatch: true,
    canMerge: true,
    canViewBilling: true,
  },
  {
    id: "u2",
    name: "Priya Sharma",
    email: "priya@company.com",
    role: "Lead",
    canDispatch: true,
    canMerge: true,
    canViewBilling: true,
  },
  {
    id: "u3",
    name: "Rohan Patel",
    email: "rohan@company.com",
    role: "Developer",
    canDispatch: true,
    canMerge: false,
    canViewBilling: false,
  },
  {
    id: "u4",
    name: "Sneha Reddy",
    email: "sneha@company.com",
    role: "Viewer",
    canDispatch: false,
    canMerge: false,
    canViewBilling: false,
  },
]

const ROLE_MATRIX = [
  {
    capability: "Dispatch agents",
    detail: "Start agent runs and orchestration workflows",
    icon: Key,
    owner: true,
    lead: true,
    developer: true,
    viewer: false,
  },
  {
    capability: "Merge & deploy",
    detail: "Approve, merge and deploy agent-generated code",
    icon: ShieldCheck,
    owner: true,
    lead: true,
    developer: false,
    viewer: false,
  },
  {
    capability: "View billing",
    detail: "Access invoices, spend data and payment methods",
    icon: DollarSign,
    owner: true,
    lead: true,
    developer: false,
    viewer: false,
  },
  {
    capability: "Manage members",
    detail: "Invite, remove and change member roles",
    icon: Users,
    owner: true,
    lead: false,
    developer: false,
    viewer: false,
  },
  {
    capability: "Policy admin",
    detail: "Edit organization-wide access policies",
    icon: UserCheck,
    owner: true,
    lead: false,
    developer: false,
    viewer: false,
  },
]

export default function PermissionsPage() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Developer")

  const inviteDialogRef = useModalA11y(inviteOpen, () => setInviteOpen(false))

  const toggle = (id: string, field: keyof TeamMember) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: !m[field] } : m)))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaveMsg("Permissions policy saved (sample workspace state).")
    window.setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    const defaults: Record<TeamMember["role"], Pick<TeamMember, "canDispatch" | "canMerge" | "canViewBilling">> = {
      Owner: { canDispatch: true, canMerge: true, canViewBilling: true },
      Lead: { canDispatch: true, canMerge: true, canViewBilling: true },
      Developer: { canDispatch: true, canMerge: false, canViewBilling: false },
      Viewer: { canDispatch: false, canMerge: false, canViewBilling: false },
    }
    setMembers((prev) => [
      ...prev,
      {
        id: `u${Date.now()}`,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        ...defaults[inviteRole],
      },
    ])
    setInviteName("")
    setInviteEmail("")
    setInviteRole("Developer")
    setInviteOpen(false)
    setSaveMsg("Invitation added to local sample workspace.")
    window.setTimeout(() => setSaveMsg(null), 3000)
  }

  const canDispatchCount = members.filter((m) => m.canDispatch).length
  const canMergeCount = members.filter((m) => m.canMerge).length
  const canBillingCount = members.filter((m) => m.canViewBilling).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Admin · Access control"
        title="Permissions"
        description="Configure team roles and granular controls for agent dispatch, repository merges, and billing visibility. Member data shown is local sample workspace state."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setInviteOpen(true)} className="btn-secondary btn-sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Invite member
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              <Save className="h-3.5 w-3.5" strokeWidth={2} />
              {saving ? "Saving…" : "Save policy"}
            </button>
          </div>
        }
      />

      {saveMsg && (
        <div className="flex items-center gap-2 border border-success/30 bg-success-soft/40 px-4 py-2.5 text-[12px] text-success animate-fade-in">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
          {saveMsg}
        </div>
      )}

      <StatBand
        columns={4}
        items={[
          { label: "Members", value: String(members.length), accent: true },
          { label: "Can dispatch", value: String(canDispatchCount) },
          { label: "Can merge", value: String(canMergeCount) },
          { label: "Billing access", value: String(canBillingCount) },
        ]}
      />

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Team members</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Individual permissions and role assignments (sample).</p>
        </div>

        <div className="hidden overflow-x-auto border-t border-line md:block">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th className="text-center">Dispatch</th>
                <th className="text-center">Merge & deploy</th>
                <th className="text-center">Billing</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-medium text-ink-2">
                        {member.name
                          .split(" ")
                          .map((n) => n[0] || "")
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink">{member.name}</p>
                        <p className="text-[11px] text-ink-3">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-surface-2 text-ink-2">{member.role}</span>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={member.canDispatch}
                      onChange={() => toggle(member.id, "canDispatch")}
                      className="h-3.5 w-3.5 accent-accent"
                      aria-label={`Allow ${member.name} to dispatch`}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={member.canMerge}
                      onChange={() => toggle(member.id, "canMerge")}
                      className="h-3.5 w-3.5 accent-accent"
                      aria-label={`Allow ${member.name} to merge`}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={member.canViewBilling}
                      onChange={() => toggle(member.id, "canViewBilling")}
                      className="h-3.5 w-3.5 accent-accent"
                      aria-label={`Allow ${member.name} to view billing`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line md:hidden">
          {members.map((member) => (
            <div key={member.id} className="border-b border-line py-3.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-medium text-ink-2">
                    {member.name
                      .split(" ")
                      .map((n) => n[0] || "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{member.name}</p>
                    <p className="truncate text-[11px] text-ink-3">{member.email}</p>
                  </div>
                </div>
                <span className="badge shrink-0 bg-surface-2 text-ink-2">{member.role}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 pl-10">
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canDispatch} onChange={() => toggle(member.id, "canDispatch")} className="h-3.5 w-3.5 accent-accent" />
                  Dispatch
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canMerge} onChange={() => toggle(member.id, "canMerge")} className="h-3.5 w-3.5 accent-accent" />
                  Merge
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canViewBilling} onChange={() => toggle(member.id, "canViewBilling")} className="h-3.5 w-3.5 accent-accent" />
                  Billing
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Role capability matrix</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Default permissions granted by each role (reference).</p>
        </div>

        <div className="hidden overflow-x-auto border-t border-line sm:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Capability</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => {
                const Icon = row.icon
                return (
                  <tr key={row.capability}>
                    <td>
                      <div className="flex items-start gap-2.5">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
                        <div>
                          <p className="text-[12.5px] font-medium text-ink">{row.capability}</p>
                          <p className="text-[11px] text-ink-3">{row.detail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center"><RoleCell enabled={row.owner} /></td>
                    <td className="text-center"><RoleCell enabled={row.lead} /></td>
                    <td className="text-center"><RoleCell enabled={row.developer} /></td>
                    <td className="text-center"><RoleCell enabled={row.viewer} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line sm:hidden">
          {ROLE_MATRIX.map((row) => {
            const Icon = row.icon
            return (
              <div key={row.capability} className="border-b border-line py-3.5 last:border-b-0">
                <div className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">{row.capability}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">{row.detail}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 pl-6">
                  <PermissionFlag label="Owner" on={row.owner} />
                  <PermissionFlag label="Lead" on={row.lead} />
                  <PermissionFlag label="Dev" on={row.developer} />
                  <PermissionFlag label="Viewer" on={row.viewer} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] animate-fade-in">
          <div
            ref={inviteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            className="panel w-full max-w-md shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Access control</p>
                <h2 id="invite-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  Invite team member
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Add a member to this local sample workspace.</p>
              </div>
              <button onClick={() => setInviteOpen(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleInvite}>
              <div className="space-y-4 px-5 py-4">
                <div>
                  <label className="label">Full name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as TeamMember["role"])}
                    className="select"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-ink-3">Default permissions are applied from the role matrix.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
                <button type="button" onClick={() => setInviteOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Add member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
