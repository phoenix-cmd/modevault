"use client"

import { useEffect, useState } from "react"
import { Building2, Layers, Plus, Trash2, Users } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"

interface Organization {
  id: string
  name: string
  slug: string
  workspaces: Array<{ id: string; name: string; slug: string }>
  memberships: Array<{
    id: string
    role: string
    user: { id: string; name: string | null; email: string }
  }>
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newWsOrgId, setNewWsOrgId] = useState<string | null>(null)
  const [newWsName, setNewWsName] = useState("")
  const [creatingWs, setCreatingWs] = useState(false)
  const [renamingOrgId, setRenamingOrgId] = useState<string | null>(null)
  const [renameOrgValue, setRenameOrgValue] = useState("")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/organizations")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load organizations")
      setOrganizations(json.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create organization")
      setName("")
      setSlug("")
      setShowForm(false)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent, orgId: string) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    setCreatingWs(true)
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_workspace",
          organizationId: orgId,
          name: newWsName.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create workspace")
      setNewWsName("")
      setNewWsOrgId(null)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreatingWs(false)
    }
  }

  const handleDeleteWorkspace = async (orgId: string, workspaceId: string) => {
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_workspace",
          organizationId: orgId,
          workspaceId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete workspace")
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRenameOrganization = async (e: React.FormEvent, orgId: string) => {
    e.preventDefault()
    if (!renameOrgValue.trim()) return
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_organization",
          organizationId: orgId,
          name: renameOrgValue.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to rename organization")
      setRenamingOrgId(null)
      setRenameOrgValue("")
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteOrganization = async (orgId: string) => {
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_organization",
          organizationId: orgId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete organization")
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalWorkspaces = organizations.reduce((sum, org) => sum + org.workspaces.length, 0)
  const totalMembers = organizations.reduce((sum, org) => sum + org.memberships.length, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Admin · Tenancy"
        title="Organizations"
        description="Manage workspaces and team membership across the MODELVAULT platform."
        action={
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            {showForm ? "Close" : "New organization"}
          </button>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            { label: "Organizations", value: String(organizations.length), accent: true },
            { label: "Workspaces", value: String(totalWorkspaces) },
            { label: "Members", value: String(totalMembers) },
          ]}
        />
      )}

      {error && (
        <div className="border border-danger/25 bg-danger-soft/30 px-4 py-3 text-[12px] text-danger">{error}</div>
      )}

      {showForm && (
        <section className="border-t border-line pt-5">
          <div className="pb-4">
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Create organization</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              A default workspace is provisioned automatically.
            </p>
          </div>
          <form onSubmit={handleCreate} className="border-t border-line pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Organization name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Systems"
                  className="field"
                />
              </div>
              <div>
                <label className="label">Slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. acme-systems"
                  className="field font-mono text-[12px]"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={creating || !name.trim() || !slug.trim()} className="btn-primary">
                {creating ? "Creating…" : "Create organization"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Directory</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Organizations, workspaces, and membership.</p>
        </div>

        {loading ? (
          <div className="border-t border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-line py-4 last:border-b-0">
                <div className="skeleton h-4 w-40" />
                <div className="mt-2 skeleton h-3 w-64" />
              </div>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="border-y border-line py-12">
            <p className="text-[13px] font-medium text-ink">No organizations yet</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              Create an organization to provision workspaces and invite members.
            </p>
          </div>
        ) : (
          <div className="border-t border-line">
            {organizations.map((org) => (
              <div key={org.id} className="border-b border-line py-5 last:border-b-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-ink-2">
                          <Building2 className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0">
                          {renamingOrgId === org.id ? (
                            <form onSubmit={(e) => handleRenameOrganization(e, org.id)} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={renameOrgValue}
                                onChange={(e) => setRenameOrgValue(e.target.value)}
                                className="field field-sm"
                                required
                              />
                              <button type="submit" className="btn-primary btn-sm">Save</button>
                              <button
                                type="button"
                                onClick={() => setRenamingOrgId(null)}
                                className="btn-ghost btn-sm"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <p className="truncate text-[14px] font-medium text-ink">{org.name}</p>
                          )}
                          <p className="font-mono text-[10.5px] text-ink-3">/{org.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renamingOrgId !== org.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingOrgId(org.id)
                              setRenameOrgValue(org.name)
                            }}
                            className="btn-ghost btn-sm text-[11px]"
                          >
                            Rename
                          </button>
                        )}
                        {organizations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrganization(org.id)}
                            className="icon-btn h-7 w-7 hover:text-danger"
                            title={`Delete ${org.name}`}
                            aria-label={`Delete ${org.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-5">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
                            <Layers className="h-3 w-3" strokeWidth={1.8} />
                            Workspaces ({org.workspaces.length})
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewWsOrgId(newWsOrgId === org.id ? null : org.id)
                              setNewWsName("")
                            }}
                            className="btn-ghost btn-sm text-[10px]"
                          >
                            <Plus className="h-3 w-3" />
                            Add workspace
                          </button>
                        </div>
                        {newWsOrgId === org.id && (
                          <form onSubmit={(e) => handleCreateWorkspace(e, org.id)} className="mb-2 flex gap-1.5">
                            <input
                              type="text"
                              value={newWsName}
                              onChange={(e) => setNewWsName(e.target.value)}
                              placeholder="Workspace name"
                              className="field field-sm flex-1"
                              required
                            />
                            <button type="submit" disabled={creatingWs} className="btn-primary btn-sm">
                              {creatingWs ? "Adding…" : "Add"}
                            </button>
                          </form>
                        )}
                        {org.workspaces.length === 0 ? (
                          <p className="text-[12px] text-ink-3">No workspaces</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {org.workspaces.map((ws) => (
                              <li key={ws.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-ink">{ws.name}</span>
                                  <span className="font-mono text-[10px] text-ink-3">/{ws.slug}</span>
                                </div>
                                {org.workspaces.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWorkspace(org.id, ws.id)}
                                    className="icon-btn h-6 w-6 hover:text-danger"
                                    title="Delete workspace"
                                    aria-label={`Delete workspace ${ws.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
                          <Users className="h-3 w-3" strokeWidth={1.8} />
                          Members ({org.memberships.length})
                        </p>
                        {org.memberships.length === 0 ? (
                          <p className="text-[12px] text-ink-3">No members</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {org.memberships.map((m) => (
                              <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px]">
                                <span className="min-w-0 break-all text-ink sm:break-words">{m.user.name || m.user.email}</span>
                                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">{m.role}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
