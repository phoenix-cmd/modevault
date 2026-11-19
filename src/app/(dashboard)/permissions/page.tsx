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
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          on ? "bg-success" : "bg-line-strong"
        )}
      />
      {label}
    </span>
  )
}

function GateRow({
  title,
  description,
  checked,
  onChange,
  trailing,
}: {
  title: string
  description: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink">{title}</p>
        <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-ink-3">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-accent"
          aria-label={title}
        />
      </div>
    </div>
  )
}

export default function PermissionsPage() {
  const [requireMainMergeApproval, setRequireMainMergeApproval] = useState(true)
  const [requireSchemaApproval, setRequireSchemaApproval] = useState(true)
  const [autoApproveUnderThreshold, setAutoApproveUnderThreshold] = useState(true)
  const [autoApproveLimit, setAutoApproveLimit] = useState(0.2)
  const [monthlySpendCap, setMonthlySpendCap] = useState(2500)
  const [taskSpendCap, setTaskSpendCap] = useState(15)
  const [keyRotationDays, setKeyRotationDays] = useState(60)
  const [saved, setSaved] = useState(false)

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

  const [showInviteModal, setShowInviteModal] = useState(false)
  const inviteDialogRef = useModalA11y(showInviteModal, () =>
    setShowInviteModal(false)
  )
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] =
    useState<"Lead" | "Developer" | "Viewer">("Developer")

  const activeGates = [
    requireMainMergeApproval,
    requireSchemaApproval,
    autoApproveUnderThreshold,
  ].filter(Boolean).length

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

  const handleRoleChange = (userId: string, newRole: TeamMember["role"]) => {
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
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Workspace · Governance"
        title="Permissions"
        description="Role-based access, execution budget ceilings, and human approval gates for agent work."
        action={
          <button type="submit" form="permissions-form" className="btn-primary">
            <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
            Save policies
          </button>
        }
      />

      <StatBand
        columns={4}
        items={[
          {
            label: "Members",
            value: String(team.length),
            meta: "Seats in this workspace",
          },
          {
            label: "Approval gates",
            value: `${activeGates}/3`,
            meta: "Enabled safeguards",
            accent: activeGates === 3,
          },
          {
            label: "Monthly cap",
            value: `$${monthlySpendCap.toLocaleString()}`,
            meta: "Organization ceiling",
          },
          {
            label: "Task ceiling",
            value: `$${taskSpendCap}`,
            meta: "Per execution",
          },
        ]}
      />

      {saved && (
        <div className="flex items-center justify-between gap-3 border border-success/25 bg-success-soft px-3.5 py-2.5 text-[11.5px] text-success animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="font-medium">
              Governance policies and team permissions updated.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="text-success/70 transition-colors hover:text-success"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <form id="permissions-form" onSubmit={handleSave} className="space-y-4">
        <section className="panel">
          <div className="panel-header">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink-2">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="panel-title">Approval gates</h2>
                <p className="panel-subtitle">
                  Human sign-off before an agent can land protected work.
                </p>
              </div>
            </div>
            <span className="badge bg-surface-2 text-ink-2">
              {activeGates} active
            </span>
          </div>

          <div className="px-4 sm:px-5">
            <GateRow
              title="Require approval before merging to protected branches"
              description={
                <>
                  Agents cannot commit directly to{" "}
                  <code className="bg-surface-2 px-1 py-0.5 font-mono text-[10.5px] text-ink-2">
                    main
                  </code>{" "}
                  or{" "}
                  <code className="bg-surface-2 px-1 py-0.5 font-mono text-[10.5px] text-ink-2">
                    production
                  </code>
                  .
                </>
              }
              checked={requireMainMergeApproval}
              onChange={setRequireMainMergeApproval}
            />

            <GateRow
              title="Require sign-off on database schema migrations"
              description="Any task touching Prisma, migrations, or SQL files pauses for lead architect review."
              checked={requireSchemaApproval}
              onChange={setRequireSchemaApproval}
            />

            <GateRow
              title="Auto-approve micro-changes under threshold"
              description="Fast-track trivial documentation or unit test patches below the cost ceiling."
              checked={autoApproveUnderThreshold}
              onChange={setAutoApproveUnderThreshold}
              trailing={
                autoApproveUnderThreshold ? (
                  <span className="font-mono text-[10.5px] tabular-nums text-ink-2">
                    ${autoApproveLimit.toFixed(2)}/run
                  </span>
                ) : undefined
              }
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="panel">
            <div className="panel-header">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink-2">
                  <DollarSign className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="panel-title">Spending caps</h2>
                  <p className="panel-subtitle">
                    Hard ceilings enforced before dispatch.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel-body space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-ink-2">
                    Monthly organization cap
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    ${monthlySpendCap.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={monthlySpendCap}
                  onChange={(e) => setMonthlySpendCap(Number(e.target.value))}
                  aria-label="Monthly organization cap"
                  className="mt-2 w-full accent-accent"
                />
                <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-ink-2">
                    Per-task hard ceiling
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-ink">
                    ${taskSpendCap}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={taskSpendCap}
                  onChange={(e) => setTaskSpendCap(Number(e.target.value))}
                  aria-label="Per-task hard ceiling"
                  className="mt-2 w-full accent-accent"
                />
                <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                  <span>$1</span>
                  <span>$50</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink-2">
                  <Key className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="panel-title">Key rotation</h2>
                  <p className="panel-subtitle">
                    Periodic secret rolling for provider tokens.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel-body space-y-3">
              <p className="text-[11.5px] leading-relaxed text-ink-3">
                Enforce rolling for connected OpenAI, Anthropic, and Google
                credentials. Rotation reminders appear in the alert stream.
              </p>
              <div className="segmented w-full">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setKeyRotationDays(days)}
                    aria-pressed={keyRotationDays === days}
                    className={cn(
                      "segmented-item flex-1",
                      keyRotationDays === days && "segmented-item-active"
                    )}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                Current policy · every {keyRotationDays} days
              </p>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink-2">
                <Users className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="panel-title">Members & roles</h2>
                <p className="panel-subtitle">
                  Dispatch, merge, and billing permissions by seat.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="btn-secondary btn-sm"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              Invite member
            </button>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line bg-surface-2/40 px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 sm:grid sm:px-5">
            <span>Member</span>
            <span>Access · role</span>
          </div>

          <div className="px-4 sm:px-5">
            {team.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] font-medium text-ink">
                      {m.name}
                    </p>
                    {m.role === "Owner" && (
                      <span className="badge bg-accent-soft text-accent">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-3">
                    {m.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <PermissionFlag label="Dispatch" on={m.canDispatch} />
                    <PermissionFlag label="Merge" on={m.canMerge} />
                    <PermissionFlag label="Billing" on={m.canViewBilling} />
                  </div>

                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(
                        m.id,
                        e.target.value as TeamMember["role"]
                      )
                    }
                    aria-label={`Role for ${m.name}`}
                    className="select select-sm w-32 font-mono text-[11px] uppercase"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
            Policies apply to every agent run in this workspace
          </p>
          <button type="submit" className="btn-primary">
            <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
            Save policies
          </button>
        </div>
      </form>

      {showInviteModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={inviteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-dialog-title"
            className="panel w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent">
                  New seat
                </p>
                <h2
                  id="invite-dialog-title"
                  className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink"
                >
                  Invite team member
                </h2>
                <p className="mt-1 text-[11.5px] text-ink-3">
                  The invite is recorded locally; no email is sent.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="icon-btn -mr-1.5 -mt-1"
                aria-label="Close invite dialog"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 px-5 py-4">
              <div>
                <label className="label" htmlFor="invite-name">
                  Full name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="field"
                />
              </div>

              <div>
                <label className="label" htmlFor="invite-email">
                  Work email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="elena@acme.corp"
                  className="field"
                />
              </div>

              <div>
                <label className="label" htmlFor="invite-role">
                  Assigned role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                  className="select"
                >
                  <option value="Lead">Lead — approve and merge</option>
                  <option value="Developer">Developer — dispatch in sandbox</option>
                  <option value="Viewer">Viewer — read only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <UserCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
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
