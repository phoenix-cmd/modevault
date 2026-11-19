"use client"

import { useEffect, useState } from "react"
import { Building2, Layers, Plus, Users } from "lucide-react"
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

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/organizations")
      const json = await res.json()
      setOrganizations(json?.data || [])
    } catch {
      setError("Organizations could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name || !slug) return
    setCreating(true)
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })
      if (!res.ok) throw new Error("request failed")
      setName("")
      setSlug("")
      await load()
    } catch {
      setError("The organization could not be created.")
    } finally {
      setCreating(false)
    }
  }

  const workspaceCount = organizations.reduce(
    (sum, org) => sum + org.workspaces.length,
    0
  )
  const memberCount = organizations.reduce(
    (sum, org) => sum + org.memberships.length,
    0
  )

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Workspace · Tenancy"
        title="Organizations"
        description="Group workspaces, teams, and memberships under a single billing and governance umbrella."
      />

      {loading ? (
        <StatBandSkeleton columns={3} />
      ) : (
        <StatBand
          columns={3}
          items={[
            {
              label: "Organizations",
              value: String(organizations.length),
              meta: "Billing entities",
            },
            {
              label: "Workspaces",
              value: String(workspaceCount),
              meta: "Nested under this account",
            },
            {
              label: "Members",
              value: String(memberCount),
              meta: "Across all memberships",
            },
          ]}
        />
      )}

      {error && (
        <div className="border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[11.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <section className="border-t border-line pt-5">
        <div className="pb-4">
          <h2 className="panel-title">New organization</h2>
          <p className="panel-subtitle">
            The slug is used in workspace URLs and cannot be changed later.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="sm:w-64">
            <label className="label" htmlFor="org-name">
              Name
            </label>
            <input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
              placeholder="Acme Corporation"
              required
            />
          </div>
          <div className="sm:w-56">
            <label className="label" htmlFor="org-slug">
              Slug
            </label>
            <input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="field font-mono text-[12px]"
              placeholder="acme"
              required
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            {creating ? "Creating…" : "Create organization"}
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 className="panel-title">Organization ledger</h2>
            <p className="panel-subtitle">
              Workspaces and membership roles for every organization.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {String(organizations.length).padStart(2, "0")} total
          </span>
        </div>

        {loading ? (
          <div className="border-t border-line">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3 border-b border-line py-5">
                <div className="skeleton h-3.5 w-56" />
                <div className="skeleton h-2.5 w-32" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="skeleton h-14 w-full" />
                  <div className="skeleton h-14 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="border-t border-line px-6 py-16 text-center">
            <Building2
              className="mx-auto h-7 w-7 text-ink-3"
              strokeWidth={1.4}
            />
            <h3 className="mt-3 font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
              No organizations yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-ink-3">
              Create an organization above to group workspaces, teams, and
              billing under one entity.
            </p>
          </div>
        ) : (
          <div className="border-t border-line">
            {organizations.map((org, index) => (
              <article
                key={org.id}
                className="grid grid-cols-1 gap-5 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                      {org.name}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                      /{org.slug}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3 w-3" strokeWidth={1.8} />
                        {org.workspaces.length} workspaces
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3 w-3" strokeWidth={1.8} />
                        {org.memberships.length} members
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="metric-label">Workspaces</p>
                  <div className="mt-2.5 space-y-1.5">
                    {org.workspaces.length === 0 && (
                      <p className="text-[11.5px] text-ink-3">
                        No workspaces attached.
                      </p>
                    )}
                    {org.workspaces.map((workspace) => (
                      <div
                        key={workspace.id}
                        className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2"
                      >
                        <span className="truncate text-[12px] font-medium text-ink">
                          {workspace.name}
                        </span>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
                          {workspace.slug}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="metric-label">Members</p>
                  <div className="mt-2.5 space-y-1.5">
                    {org.memberships.length === 0 && (
                      <p className="text-[11.5px] text-ink-3">
                        No members yet.
                      </p>
                    )}
                    {org.memberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-ink">
                            {membership.user.name || membership.user.email}
                          </p>
                          <p className="truncate text-[10.5px] text-ink-3">
                            {membership.user.email}
                          </p>
                        </div>
                        <span className="badge shrink-0 bg-surface-2 text-ink-2">
                          {membership.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
