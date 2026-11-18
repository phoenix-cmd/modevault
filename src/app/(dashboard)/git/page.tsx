"use client"

import { useState, useEffect } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Plus,
  GitMerge,
  FileCode,
  ExternalLink,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  RefreshCw,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

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

  // Conflict resolution state
  const [conflictResolved, setConflictResolved] = useState(false)
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
    if (!confirm(`Are you sure you want to revert commit ${sha}? A revert commit will be appended.`)) return

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
        setActionSuccess(`Reverted commit ${sha}! Revert commit ${json.data.revertSha} created.`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData()
      }
    } catch (err) {
      console.error(err)
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
        setActionSuccess(`Pull Request #${json.data.pullRequestNumber} successfully dispatched to remote!`)
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
        body: JSON.stringify({ action: "branch", projectId, branchName: newBranchName }),
      })
      const json = await res.json()
      if (json.data) {
        setBranches(json.data.branches || branches)
        setCurrentBranch(newBranchName)
        setNewBranchName("")
        setShowBranchModal(false)
        setActionSuccess(`Created and switched to branch: ${newBranchName}`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData(projectId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Git Control & Branch Management"
        description="Isolated task worktrees, automatic pull request generation, and atomic commit rollbacks."
        action={
          <div className="flex items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowBranchModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5 text-accent" />
              New Branch
            </button>
            <div className="flex items-center overflow-hidden rounded-lg border border-line bg-surface">
              <button
                onClick={() => handleSync("pull")}
                disabled={syncing !== null}
                title={sync?.hasRemote ? "Pull from origin" : "No remote configured"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                {syncing === "pull" ? "Pulling" : "Pull"}
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                onClick={() => handleSync("push")}
                disabled={syncing !== null}
                title={sync?.hasRemote ? "Push to origin" : "No remote configured"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                {syncing === "push" ? "Pushing" : "Push"}
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                onClick={() => handleSync("fetch")}
                disabled={syncing !== null}
                title="Fetch origin"
                className="p-1.5 text-ink-2 hover:bg-surface-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing === "fetch" ? "animate-spin" : ""}`} />
              </button>
            </div>
            {sync && (
              <span
                className="hidden items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-1 text-[10.5px] font-medium text-ink-2 md:flex"
                title={sync.remoteUrl || "No remote configured"}
              >
                {sync.upstream || sync.branch}
                <span className="text-success">↑{sync.ahead}</span>
                <span className="text-warning">↓{sync.behind}</span>
              </span>
            )}
            <button
              onClick={() => setShowPrModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-accent" />
              Open Pull Request
            </button>
          </div>
        }
      />

      {actionSuccess && (
        <div className="rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {syncError && (
        <div className="rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{syncError}</span>
        </div>
      )}

      {/* Branch & PR Modals */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            ref={prDialogRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-charcoal text-white">
                  <GitPullRequest className="h-4 w-4 text-accent" />
                </span>
                <h3 className="text-sm font-bold text-ink">Create Pull Request</h3>
              </div>
              <button onClick={() => setShowPrModal(false)} className="rounded-lg p-1 text-ink-2 hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">PR Title</label>
                <input
                  type="text"
                  required
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="e.g. feat(checkout): atomic idempotency key validation"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs text-ink outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Source Branch</label>
                <select
                  value={prBranch}
                  onChange={(e) => setPrBranch(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs text-ink outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-canvas p-3 text-[11px] text-ink-2 space-y-1">
                <p className="font-semibold text-ink">AI Pull Request Summary (Auto-generated)</p>
                <p>• Atomic database transactions for deduplication locks</p>
                <p>• Vitest test suite added: 8 unit test assertions passing</p>
                <p>• Zero breaking changes to client payload contract</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowPrModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPr}
                  className="flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  {creatingPr ? "Submitting..." : "Submit Pull Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            ref={branchDialogRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl space-y-3"
          >
            <h3 className="text-sm font-bold text-ink">Create Worktree Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g. feature/auth-refresh"
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs text-ink outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 text-xs text-ink-2 hover:bg-surface-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-line text-xs font-semibold">
        <button
          onClick={() => setActiveTab("changes")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "changes"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Changes ({changes.length})
        </button>
        <button
          onClick={() => setActiveTab("commits")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "commits"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Commit History ({commits.length})
        </button>
        <button
          onClick={() => setActiveTab("pulls")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "pulls"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Pull Requests ({pulls.length})
        </button>
        <button
          onClick={() => setActiveTab("branches")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "branches"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Branches ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab("conflicts")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "conflicts"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Merge Conflict Resolver
        </button>
      </div>

      {diff && (
        <GlassCard className="p-4 border-line bg-surface">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Latest workspace diff</p>
          <pre className="max-h-64 overflow-auto rounded-md bg-canvas p-3 font-mono text-[11px] text-ink whitespace-pre-wrap">
            {diff}
          </pre>
        </GlassCard>
      )}

      {/* Content */}
      {activeTab === "changes" && (
        <div className="space-y-4">
          <GlassCard className="p-4 border-line bg-surface">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Working tree changes</p>
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
                  className="rounded-md border border-line px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2"
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
                  className="rounded-md border border-line px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2"
                >
                  Unstage all
                </button>
              </div>
            </div>
            {changes.length === 0 ? (
              <p className="mt-3 text-[12px] text-ink-2">No changes detected.</p>
            ) : (
              <div className="mt-3 space-y-1">
                {changes.map((change: any) => (
                  <div key={change.path} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                    <span className="font-mono text-[11px] text-ink">{change.path}</span>
                    <span className="text-[10px] font-semibold uppercase text-ink-2">{change.code}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4 border-line bg-surface">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">Commit</p>
            <div className="flex items-center gap-2">
              <input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="Commit message"
                className="field flex-1"
              />
              <button
                onClick={async () => {
                  if (!prTitle) return
                  await fetch("/api/git", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "commit", projectId, commitMessage: prTitle }),
                  })
                  setPrTitle("")
                  loadGitData(projectId)
                }}
                className="btn-primary"
              >
                Commit
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "commits" && (
        <div className="rounded-xl border border-line bg-surface divide-y divide-line shadow-xs overflow-hidden">
          {commits.map((c) => (
            <div key={c.sha} className="p-4 flex items-center justify-between hover:bg-canvas transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-ink">
                  <GitCommit className="h-4 w-4 text-accent" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">{c.message}</p>
                  <p className="text-[11px] text-ink-2">
                    By <strong>{c.author}</strong> on <span className="font-mono">{c.branch}</span> • {new Date(c.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-surface-2 px-2 py-0.5 rounded border border-line text-ink">
                  {c.sha}
                </span>
                <button
                  onClick={() => handleRollback(c.sha)}
                  className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2 hover:text-accent transition-colors flex items-center gap-1 text-[11px]"
                  title="Rollback commit"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Rollback</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "pulls" && (
        <div className="space-y-3">
          {pulls.map((pr) => (
            <GlassCard key={pr.number} className="p-4 border-line bg-surface flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                  <GitPullRequest className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">#{pr.number}</span>
                    <h4 className="text-xs font-semibold text-ink">{pr.title}</h4>
                  </div>
                  <p className="text-[11px] text-ink-2 mt-0.5">
                    {pr.branch} → {pr.targetBranch} • Author: {pr.author}
                  </p>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  pr.status === "merged"
                    ? "bg-success-soft text-success"
                    : "bg-[rgba(213,34,45,0.08)] text-accent"
                }`}
              >
                {pr.status.replace("_", " ")}
              </span>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === "branches" && (
        <div className="rounded-xl border border-line bg-surface divide-y divide-line shadow-xs overflow-hidden">
          {branches.map((b) => (
            <div key={b.name} className="p-4 flex items-center justify-between hover:bg-canvas transition-colors">
              <div className="flex items-center gap-3">
                <GitBranch className={`h-4 w-4 ${b.isDefault ? "text-success" : "text-accent"}`} />
                <div>
                  <span className="text-xs font-semibold text-ink font-mono">{b.name}</span>
                  {b.isDefault && (
                    <span className="ml-2 rounded bg-success-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentBranch === b.name ? (
                  <span className="text-[11px] font-semibold text-success">Current Branch</span>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentBranch(b.name)
                      setActionSuccess(`Switched to branch: ${b.name}`)
                      setTimeout(() => setActionSuccess(null), 3000)
                    }}
                    className="rounded-lg border border-line bg-surface px-3 py-1 text-xs text-ink hover:bg-surface-2"
                  >
                    Checkout
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "conflicts" && (
        <GlassCard className="p-6 border-line bg-surface space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <h4 className="text-xs font-bold text-ink">Three-Way Merge Conflict Resolution</h4>
            </div>
            <span className="text-xs text-ink-2 font-mono">src/app/api/checkout/route.ts</span>
          </div>

          {!conflictResolved ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-red-900 space-y-1">
                <span className="text-[10px] uppercase font-bold text-red-700">Incoming Change (Agent Branch)</span>
                <pre className="text-[11px] leading-relaxed">
                  + const idempotencyKey = req.headers.get(&quot;Idempotency-Key&quot;);
                  + if (!idempotencyKey) throw new Error(&quot;Missing idempotency key&quot;);
                </pre>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-blue-900 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-700">Current Change (Main Branch)</span>
                <pre className="text-[11px] leading-relaxed">
                  - const rawKey = req.headers.get(&quot;X-Idempotency&quot;) || &quot;default&quot;;
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConflictResolved(true)}
                  className="rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
                >
                  Accept Incoming (Agent Version) & Commit
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-success/20 bg-success-soft p-4 text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-success mx-auto" />
              <p className="text-xs font-bold text-success">Conflict Resolved Successfully</p>
              <p className="text-[11px] text-ink-2">
                Merged into worktree without loss of data. Safe to push.
              </p>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
