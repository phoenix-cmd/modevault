"use client"

import { useCallback, useEffect, useState } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import {
  CheckCircle2,
  DollarSign,
  Key,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  userId?: string
  organizationId?: string
  name: string
  email: string
  role: "Owner" | "Lead" | "Developer" | "Viewer"
  canDispatch: boolean
  canMerge: boolean
  canViewBilling: boolean
}

const ROLES: TeamMember["role"][] = ["Owner", "Lead", "Developer", "Viewer"]

const ROLE_DEFAULTS: Record<TeamMember["role"], Pick<TeamMember, "canDispatch" | "canMerge" | "canViewBilling">> = {
  Owner: { canDispatch: true, canMerge: true, canViewBilling: true },
  Lead: { canDispatch: true, canMerge: true, canViewBilling: true },
  Developer: { canDispatch: true, canMerge: false, canViewBilling: false },
  Viewer: { canDispatch: false, canMerge: false, canViewBilling: false },
}

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
  const [members, setMembers] = useState<TeamMember[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Developer")
  const [inviting, setInviting] = useState(false)

  const inviteDialogRef = useModalA11y(inviteOpen, () => setInviteOpen(false))

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/members")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load members")
      setOrganizationId(json.data?.organizationId || null)
      setMembers(Array.isArray(json.data?.members) ? json.data.members : [])
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const toggle = (id: string, field: "canDispatch" | "canMerge" | "canViewBilling") => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const updated = { ...m, [field]: !m[field] }
        let nextRole: TeamMember["role"] = updated.role
        if (updated.role !== "Owner") {
          if (updated.canMerge || updated.canViewBilling) nextRole = "Lead"
          else if (updated.canDispatch) nextRole = "Developer"
          else nextRole = "Viewer"
        }
        return { ...updated, role: nextRole }
      })
    )
  }

  const changeRole = (id: string, role: TeamMember["role"]) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role, ...ROLE_DEFAULTS[role] } : m))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organizationId || undefined,
          members: members.map((m) => ({
            id: m.id,
            role: m.role,
            canDispatch: m.canDispatch,
            canMerge: m.canMerge,
            canViewBilling: m.canViewBilling,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save permissions policy")
      await loadMembers()
      setSaveMsg("Permissions policy saved to organization.")
      window.setTimeout(() => setSaveMsg(null), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save permissions policy")
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organizationId || undefined,
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to invite member")
      setInviteName("")
      setInviteEmail("")
      setInviteRole("Developer")
      setInviteOpen(false)
      await loadMembers()
      if (json.data?.inviteUrl && typeof window !== "undefined") {
        setLastInviteUrl(`${window.location.origin}${json.data.inviteUrl}`)
      }
      setSaveMsg("Team member added & invitation link generated.")
      window.setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to invite member")
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (member: TeamMember) => {
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/members?id=${encodeURIComponent(member.id)}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to remove member")
      await loadMembers()
      setSaveMsg(`Removed ${member.name} from organization.`)
      window.setTimeout(() => setSaveMsg(null), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove member")
    }
  }

  const canDispatchCount = members.filter((m) => m.canDispatch).length
  const canMergeCount = members.filter((m) => m.canMerge).length
  const canBillingCount = members.filter((m) => m.canViewBilling).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Admin · Access control"
        title="Permissions"
        description="Configure team roles and granular controls for agent dispatch, repository merges, and billing visibility across your organization."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setInviteOpen(true)} className="btn-secondary btn-sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Invite member
            </button>
            <button onClick={handleSave} disabled={saving || members.length === 0} className="btn-primary btn-sm">
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

      {lastInviteUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-accent/30 bg-accent-soft/40 px-4 py-2.5 text-[12px] text-ink">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">Invitation link</p>
            <p className="truncate font-mono text-[11px] text-ink-2">{lastInviteUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(lastInviteUrl)}
              className="btn-secondary btn-sm"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => setLastInviteUrl(null)}
              className="icon-btn"
              aria-label="Dismiss invite link"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="border border-danger/30 bg-danger-soft/30 px-4 py-2.5 text-[12px] text-danger">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            { label: "Members", value: String(members.length), accent: true },
            { label: "Can dispatch", value: String(canDispatchCount) },
            { label: "Can merge", value: String(canMergeCount) },
            { label: "Billing access", value: String(canBillingCount) },
          ]}
        />
      )}

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Team members</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            Organization membership, role assignments, and capability overrides.
          </p>
        </div>

        <div className="hidden overflow-x-auto border-t border-line md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th className="text-center">Dispatch</th>
                <th className="text-center">Merge &amp; deploy</th>
                <th className="text-center">Billing</th>
                <th className="text-right">Actions</th>
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
                    <select
                      value={member.role}
                      onChange={(e) => changeRole(member.id, e.target.value as TeamMember["role"])}
                      className="select h-8 py-1 text-[11.5px]"
                      aria-label={`Role for ${member.name}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
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
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={member.role === "Owner" && members.filter((m) => m.role === "Owner").length <= 1}
                      className="icon-btn hover:border-danger/30 hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                      title="Remove member"
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
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

              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="flex min-h-[42px] items-center justify-center gap-1.5 border border-line bg-surface-2/30 px-2 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canDispatch} onChange={() => toggle(member.id, "canDispatch")} className="h-4 w-4 accent-accent" />
                  Dispatch
                </label>
                <label className="flex min-h-[42px] items-center justify-center gap-1.5 border border-line bg-surface-2/30 px-2 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canMerge} onChange={() => toggle(member.id, "canMerge")} className="h-4 w-4 accent-accent" />
                  Merge
                </label>
                <label className="flex min-h-[42px] items-center justify-center gap-1.5 border border-line bg-surface-2/30 px-2 text-[11px] text-ink-2">
                  <input type="checkbox" checked={member.canViewBilling} onChange={() => toggle(member.id, "canViewBilling")} className="h-4 w-4 accent-accent" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={inviteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            className="panel max-h-[90dvh] w-full max-w-md overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Access control</p>
                <h2 id="invite-modal-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  Invite team member
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Add a member to your organization.</p>
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
                <button type="submit" disabled={inviting} className="btn-primary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {inviting ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
