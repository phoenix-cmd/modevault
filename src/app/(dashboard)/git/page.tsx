"use client"

import { useState, useEffect } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  RotateCcw,
  Plus,
  FileCode,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  RefreshCw,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

export default function GitControlPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"changes" | "commits" | "pulls" | "branches" | "conflicts">("changes")
  const [branches, setBranches] = useState<any[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [pulls, setPulls] = useState<any[]>([])
  const [changes, setChanges] = useState<any[]>([])
  const [currentBranch, setCurrentBranch] = useState("main")
  const [diff, setDiff] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // PR Modal state
  const [showPrModal, setShowPrModal] = useState(false)
  const prDialogRef = useModalA11y(showPrModal, () => setShowPrModal(false))
  const [prTitle, setPrTitle] = useState("")
  const [prBranch, setPrBranch] = useState("feature/checkout-idempotency")
  const [creatingPr, setCreatingPr] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // New Branch state
  const [showBranchModal, setShowBranchModal] = useState(false)
  const branchDialogRef = useModalA11y(showBranchModal, () => setShowBranchModal(false))
  const [newBranchName, setNewBranchName] = useState("")

  // Conflict resolution state (sample/local interaction)
  const [conflictResolved, setConflictResolved] = useState(false)
  const [pendingRollback, setPendingRollback] = useState<string | null>(null)
  const [sync, setSync] = useState<{
    hasRemote: boolean
    remoteUrl: string | null
    upstream: string | null
    branch: string
    ahead: number
    behind: number
  } | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const loadGitData = async (targetProjectId?: string) => {
    const pid = targetProjectId || projectId
    if (!pid) return
    try {
      setLoading(true)
      const res = await fetch(`/api/git?projectId=${pid}`)
      const json = await res.json()
      if (json.data) {
        setBranches(json.data.branches || [])
        setCommits(json.data.commits || [])
        setPulls(json.data.pullRequests || [])
        setChanges(json.data.changes || [])
        setCurrentBranch(json.data.currentBranch || "main")
        setDiff(json.data.diff || "")
        setSync(json.data.sync || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetch("/api/projects")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const list = json?.data || []
        setProjects(list)
        if (list.length > 0) {
          const id = list[0].id
          setProjectId(id)
          loadGitData(id)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (projectId) loadGitData(projectId)
  }, [projectId])

  const handleSync = async (action: "pull" | "push" | "fetch") => {
    setSyncing(action)
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, projectId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Git ${action} failed`)
      if (json.data?.sync) setSync(json.data.sync)
      setActionSuccess(json.data?.output || `Git ${action} completed`)
      setTimeout(() => setActionSuccess(null), 4000)
      loadGitData()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : `Git ${action} failed`)
      setTimeout(() => setSyncError(null), 6000)
    } finally {
      setSyncing(null)
    }
  }

  const handleRollback = async (sha: string) => {
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revert",
          projectId,
          commitSha: sha,
        }),
      })

      const json = await res.json()
      if (json.data) {
        setActionSuccess(`Reverted commit ${sha}. Revert commit ${json.data.revertSha} created.`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPendingRollback(null)
    }
  }

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingPr(true)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pr",
          projectId,
          branchName: prBranch,
          prTitle: prTitle || "feat: AI Agent feature branch update",
        }),
      })

      const json = await res.json()
      if (json.data) {
        setShowPrModal(false)
        setPrTitle("")
        setActionSuccess(`Pull request #${json.data.pullRequestNumber} dispatched to remote.`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingPr(false)
    }
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranchName || !projectId) return
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "branch",
          projectId,
          branchName: newBranchName,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setBranches(json.data.branches || branches)
        setCurrentBranch(newBranchName)
        setNewBranchName("")
        setShowBranchModal(false)
        setActionSuccess(`Created and switched to branch ${newBranchName}.`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData(projectId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const tabs = [
    { id: "changes" as const, label: "Changes", count: changes.length },
    { id: "commits" as const, label: "Commits", count: commits.length },
    { id: "pulls" as const, label: "Pull requests", count: pulls.length },
    { id: "branches" as const, label: "Branches", count: branches.length },
    { id: "conflicts" as const, label: "Conflicts" },
  ]

  const activeProject = projects.find((p) => p.id === projectId)

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Workspace · Version control"
        title="Git"
        description="Inspect worktree changes, commits, branches, pull requests, sync state, and conflict-resolution flows for the selected project."
        badge={
          currentBranch ? (
            <span className="inline-flex items-center gap-1.5 border border-line bg-surface-2/40 px-2 py-1 font-mono text-[10px] text-ink-2">
              <GitBranch className="h-3 w-3 text-accent" strokeWidth={1.8} />
              {currentBranch}
            </span>
          ) : undefined
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Active project"
              className="select select-sm w-auto max-w-[220px]"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <button onClick={() => setShowBranchModal(true)} className="btn-secondary btn-sm" disabled={!projectId}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              New branch
            </button>

            <div className="inline-flex h-8 items-center overflow-hidden border border-line bg-surface">
              <button
                onClick={() => handleSync("pull")}
                disabled={syncing !== null || !projectId}
                title={sync?.hasRemote ? "Pull from origin" : "No remote configured"}
                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.8} />
                {syncing === "pull" ? "Pulling" : "Pull"}
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                onClick={() => handleSync("push")}
                disabled={syncing !== null || !projectId}
                title={sync?.hasRemote ? "Push to origin" : "No remote configured"}
                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.8} />
                {syncing === "push" ? "Pushing" : "Push"}
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                onClick={() => handleSync("fetch")}
                disabled={syncing !== null || !projectId}
                title="Fetch origin"
                aria-label="Fetch origin"
                className="icon-btn h-8 w-8 rounded-none"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncing === "fetch" && "animate-spin")} strokeWidth={1.8} />
              </button>
            </div>

            <button onClick={() => setShowPrModal(true)} className="btn-primary btn-sm" disabled={!projectId}>
              <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.8} />
              Open pull request
            </button>
          </div>
        }
      />

      <StatBand
        columns={4}
        items={[
          { label: "Commits", value: loading ? "—" : String(commits.length), meta: currentBranch || "—" },
          {
            label: "Working changes",
            value: loading ? "—" : String(changes.length),
            meta: changes.length > 0 ? "Uncommitted files" : "Tree clean",
            accent: changes.length > 0,
          },
          { label: "Branches", value: loading ? "—" : String(branches.length), meta: activeProject?.name || "Selected project" },
          {
            label: "Remote sync",
            value: sync?.hasRemote ? "Linked" : "Not set",
            meta: sync?.hasRemote ? `${sync.upstream || sync.branch} · ${sync.ahead} ahead · ${sync.behind} behind` : "Add an origin to push",
            accent: !!sync?.hasRemote,
          },
        ]}
      />

      {(actionSuccess || syncError) && (
        <div className="space-y-2">
          {actionSuccess && (
            <div className="flex items-start gap-2 border border-success/25 bg-success-soft px-3.5 py-3 text-[12.5px] text-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="font-medium">{actionSuccess}</span>
            </div>
          )}
          {syncError && (
            <div className="flex items-start gap-2 border border-warning/25 bg-warning-soft px-3.5 py-3 text-[12.5px] text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="font-medium">{syncError}</span>
            </div>
          )}
        </div>
      )}

      <section className="border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Repository register</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Browse changes, history, branches, pull requests, and conflict-resolution state for the active worktree.</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {activeProject?.name || "No project"} · {currentBranch}
          </p>
        </div>

        <div className="-mb-px flex overflow-x-auto border-b border-line">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors",
                activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-ink-3 hover:text-ink"
              )}
            >
              {tab.label}
              {typeof tab.count === "number" && <span className="ml-1.5 tabular-nums text-ink-3">{loading ? "—" : tab.count}</span>}
            </button>
          ))}
        </div>

        {diff && (
          <div className="border-b border-line py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="metric-label">Latest workspace diff</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Recorded from active worktree</p>
            </div>
            <pre className="mt-2 max-h-72 overflow-auto border border-line bg-surface-2/20 p-3 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
              {diff}
            </pre>
          </div>
        )}

        {activeTab === "changes" && (
          <div className="space-y-6 py-5">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Working tree changes</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Stage or unstage files before committing the selected worktree.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await fetch("/api/git", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "stage", projectId }),
                      })
                      loadGitData(projectId)
                    }}
                    className="btn-secondary btn-sm"
                    disabled={!projectId}
                  >
                    Stage all
                  </button>
                  <button
                    onClick={async () => {
                      await fetch("/api/git", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "unstage", projectId }),
                      })
                      loadGitData(projectId)
                    }}
                    className="btn-ghost btn-sm"
                    disabled={!projectId}
                  >
                    Unstage all
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2 py-6">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}
                </div>
              ) : changes.length === 0 ? (
                <p className="py-8 text-[13px] leading-relaxed text-ink-3">No changes detected in this worktree.</p>
              ) : (
                <ul className="border-t border-line">
                  {changes.map((change: any) => (
                    <li key={change.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                      <span className="truncate font-mono text-[11px] text-ink">{change.path}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{change.code}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line pt-5">
              <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Commit staged work</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Create a commit from the current staged worktree state.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="Commit message"
                  aria-label="Commit message"
                  className="field flex-1"
                  disabled={!projectId}
                />
                <button
                  onClick={async () => {
                    if (!prTitle) return
                    await fetch("/api/git", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "commit",
                        projectId,
                        commitMessage: prTitle,
                      }),
                    })
                    setPrTitle("")
                    loadGitData(projectId)
                  }}
                  className="btn-primary"
                  disabled={!projectId || !prTitle}
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "commits" && (
          <div className="py-1">
            {loading ? (
              <div className="space-y-2 py-6">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
              </div>
            ) : commits.length === 0 ? (
              <p className="py-10 text-[13px] leading-relaxed text-ink-3">No commits recorded for this worktree yet.</p>
            ) : (
              commits.map((c) => (
                <div key={c.sha} className="flex flex-wrap items-start justify-between gap-4 border-b border-line py-4 last:border-b-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug text-ink">{c.message}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        {c.author} · {c.branch} · {new Date(c.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-line bg-surface-2/40 px-2 py-0.5 font-mono text-[10px] text-ink-2">{c.sha}</span>
                    {pendingRollback === c.sha ? (
                      <>
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-warning">Revert this commit?</span>
                        <button onClick={() => handleRollback(c.sha)} className="btn-danger btn-sm">Confirm</button>
                        <button onClick={() => setPendingRollback(null)} className="btn-ghost btn-sm">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setPendingRollback(c.sha)} className="btn-ghost btn-sm" title="Revert commit">
                        <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
                        Revert
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "pulls" && (
          <div className="py-1">
            {loading ? (
              <div className="space-y-2 py-6">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
              </div>
            ) : pulls.length === 0 ? (
              <p className="py-10 text-[13px] leading-relaxed text-ink-3">No pull requests have been opened from this project.</p>
            ) : (
              pulls.map((pr) => (
                <div key={pr.number} className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <GitPullRequest className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[10px] text-ink-3">#{pr.number}</span>
                        <p className="text-[13px] font-medium text-ink">{pr.title}</p>
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        {pr.branch} → {pr.targetBranch} · {pr.author}
                      </p>
                    </div>
                  </div>
                  <span className={cn("badge shrink-0", pr.status === "merged" ? "bg-success-soft text-success" : "bg-accent-soft text-accent")}>
                    {String(pr.status || "").replaceAll("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "branches" && (
          <div className="py-1">
            {loading ? (
              <div className="space-y-2 py-6">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}
              </div>
            ) : branches.length === 0 ? (
              <p className="py-10 text-[13px] leading-relaxed text-ink-3">No branches found for this worktree.</p>
            ) : (
              branches.map((b) => (
                <div key={b.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <GitBranch className={cn("h-3.5 w-3.5 shrink-0", b.isDefault ? "text-success" : "text-accent")} strokeWidth={1.8} />
                    <span className="truncate font-mono text-[11px] text-ink">{b.name}</span>
                    {b.isDefault && <span className="badge bg-success-soft text-success">Default</span>}
                  </div>

                  {currentBranch === b.name ? (
                    <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Current
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setCurrentBranch(b.name)
                        setActionSuccess(`Switched to branch ${b.name}.`)
                        setTimeout(() => setActionSuccess(null), 3000)
                      }}
                      className="btn-secondary btn-sm"
                    >
                      Checkout
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "conflicts" && (
          <div className="space-y-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Merge conflict resolution</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Sample conflict scenario for resolving an incoming agent branch against the base branch before pushing.</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">Sample scenario</p>
                <p className="mt-1 font-mono text-[10px] text-ink-3">src/app/api/checkout/route.ts</p>
              </div>
            </div>

            {!conflictResolved ? (
              <div className="space-y-3">
                <div className="border border-danger/25 bg-danger-soft p-3.5">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-danger">Incoming change · agent branch</p>
                  <pre className="mt-2 overflow-x-auto font-mono text-[10.5px] leading-relaxed text-ink whitespace-pre-wrap">
                    {`+ const idempotencyKey = req.headers.get("Idempotency-Key");\n+ if (!idempotencyKey) throw new Error("Missing idempotency key");`}
                  </pre>
                </div>

                <div className="border border-info/25 bg-info-soft p-3.5">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-info">Current change · base branch</p>
                  <pre className="mt-2 overflow-x-auto font-mono text-[10.5px] leading-relaxed text-ink whitespace-pre-wrap">
                    {`- const rawKey = req.headers.get("X-Idempotency") || "default";`}
                  </pre>
                </div>

                <div className="flex justify-end border-t border-line pt-3">
                  <button onClick={() => setConflictResolved(true)} className="btn-primary">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Accept incoming and mark resolved
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-success/25 bg-success-soft px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-success" strokeWidth={1.8} />
                <p className="mt-3 text-[13px] font-medium text-success">Conflict marked resolved (sample state)</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">Local conflict-resolution state updated for this sample scenario. Push only when your real worktree is clean and synced.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {showPrModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
          <div
            ref={prDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pr-dialog-title"
            className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Pull request</p>
                <h2 id="pr-dialog-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Open pull request</h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{currentBranch} · dispatch to remote</p>
              </div>
              <button onClick={() => setShowPrModal(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close pull request dialog">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="pr-title">Title</label>
                <input
                  id="pr-title"
                  type="text"
                  required
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="feat(checkout): atomic idempotency key validation"
                  className="field"
                />
              </div>

              <div>
                <label className="label" htmlFor="pr-branch">Source branch</label>
                <select id="pr-branch" value={prBranch} onChange={(e) => setPrBranch(e.target.value)} className="select font-mono text-[12px]">
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-line bg-surface-2/20 p-3.5">
                <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                  <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.8} />
                  Sample summary · not generated from the diff
                </p>
                <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-2">
                  <li>Atomic database transactions for deduplication locks</li>
                  <li>Vitest suite added with eight unit assertions</li>
                  <li>No breaking changes to the client payload contract</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setShowPrModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={creatingPr} className="btn-primary">
                  <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {creatingPr ? "Submitting…" : "Submit pull request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
          <div
            ref={branchDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-dialog-title"
            className="panel w-full max-w-sm shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Branch</p>
                <h2 id="branch-dialog-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">New worktree branch</h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">From {currentBranch}</p>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close new branch dialog">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="branch-name">Branch name</label>
                <input
                  id="branch-name"
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/auth-refresh"
                  className="field font-mono text-[12px]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setShowBranchModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
        <FileCode className="h-3 w-3" strokeWidth={1.8} />
        Worktrees are local to this machine · pushes require a configured origin
      </div>
    </div>
  )
}
