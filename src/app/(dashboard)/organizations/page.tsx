"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

interface Organization {
  id: string
  name: string
  slug: string
  workspaces: Array<{ id: string; name: string; slug: string }>
  memberships: Array<{ id: string; role: string; user: { id: string; name: string | null; email: string } }>
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/organizations")
      const json = await res.json()
      setOrganizations(json?.data || [])
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
    await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    })
    setName("")
    setSlug("")
    await load()
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Organizations"
        description="Manage workspaces, teams, and memberships."
      />

      <GlassCard className="p-5">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" required />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="field" required />
          </label>
          <button type="submit" className="btn-primary">Create organization</button>
        </form>
      </GlassCard>

      {loading ? (
        <p className="text-sm text-ink-3">Loading organizations...</p>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <GlassCard key={org.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">{org.name}</h2>
                  <p className="text-[11.5px] text-ink-3">{org.slug}</p>
                </div>
                <span className="text-[11px] text-ink-3">{org.workspaces.length} workspaces</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {org.workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-lg border border-line bg-surface-2/40 p-3">
                    <p className="text-[12px] font-medium text-ink">{workspace.name}</p>
                    <p className="text-[10.5px] text-ink-3">{workspace.slug}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Members</p>
                <div className="space-y-2">
                  {org.memberships.map((membership) => (
                    <div key={membership.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                      <div>
                        <p className="text-[12px] font-medium text-ink">{membership.user.name || membership.user.email}</p>
                        <p className="text-[10.5px] text-ink-3">{membership.user.email}</p>
                      </div>
                      <span className="text-[10.5px] font-semibold uppercase text-ink-3">{membership.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
