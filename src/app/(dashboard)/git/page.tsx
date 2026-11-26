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

  const [conflicts, setConflicts] = useState<Array<{ path: string; content: string }>>([])
  const [editingConflictPath, setEditingConflictPath] = useState<string | null>(null)
  const [editingConflictContent, setEditingConflictContent] = useState<string>("")
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [hasGithubRemote, setHasGithubRemote] = useState(false)
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
        setConflicts(json.data.conflicts || [])
        setHasGithubToken(Boolean(json.data.hasGithubToken))
        setHasGithubRemote(Boolean(json.data.hasGithubRemote))
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
    setSyncError(null)
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
      if (!res.ok) {
        setSyncError(json.error || `Failed to revert commit ${sha}`)
        setTimeout(() => setSyncError(null), 6000)
        return
      }
      if (json.data) {
        setActionSuccess(`Reverted commit ${sha}. Revert commit ${json.data.revertSha} created.`)
        setTimeout(() => setActionSuccess(null), 4000)
        loadGitData()
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Revert failed")
    } finally {
      setPendingRollback(null)
    }
  }

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingPr(true)
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pr",
          projectId,
          branchName: prBranch || currentBranch,
          prTitle: prTitle || `PR: ${prBranch || currentBranch}`,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || "Failed to create pull request")
        return
      }
      if (json.data) {
        setShowPrModal(false)
        setPrTitle("")
        setActionSuccess(
          json.data.notice
            ? `${json.data.message} (#${json.data.pullRequestNumber}) — ${json.data.notice}`
            : `${json.data.message}`
        )
        setTimeout(() => setActionSuccess(null), 6000)
        loadGitData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingPr(false)
    }
  }

  const handleCheckoutBranch = async (branchName: string) => {
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          projectId,
          branchName,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || `Failed to checkout ${branchName}`)
        return
      }
      setCurrentBranch(branchName)
      setActionSuccess(`Checked out branch ${branchName}.`)
      setTimeout(() => setActionSuccess(null), 3000)
      loadGitData(projectId)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Checkout failed")
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

  const handleFileAction = async (
    action: "stage" | "unstage" | "discard",
    files?: string[]
  ) => {
    if (!projectId) return
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, projectId, files }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || `Failed to ${action} files`)
        return
      }
      setActionSuccess(
        files && files.length === 1
          ? `${action === "stage" ? "Staged" : action === "unstage" ? "Unstaged" : "Discarded"} ${files[0]}`
          : `${action === "stage" ? "Staged" : action === "unstage" ? "Unstaged" : "Discarded"} worktree changes`
      )
      setTimeout(() => setActionSuccess(null), 3500)
      await loadGitData(projectId)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : `Failed to ${action}`)
    }
  }

  const handleResolveConflict = async (
    file: string,
    strategy: "ours" | "theirs" | "manual",
    content?: string
  ) => {
    if (!projectId) return
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_conflict",
          projectId,
          file,
          strategy,
          content,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || `Failed to resolve conflict in ${file}`)
        return
      }
      setEditingConflictPath(null)
      setEditingConflictContent("")
      setActionSuccess(json.data?.message || `Resolved conflict in ${file}`)
      setTimeout(() => setActionSuccess(null), 4000)
      await loadGitData(projectId)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to resolve conflict")
    }
  }

  const handleMergePr = async (pr: { id?: string; branch: string; targetBranch?: string }) => {
    if (!projectId) return
    setSyncError(null)
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge",
          projectId,
          branchName: pr.branch,
          targetBranch: pr.targetBranch || "main",
          operationId: pr.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSyncError(json.error || `Failed to merge ${pr.branch}`)
        return
      }
      setActionSuccess(json.data?.message || `Merged ${pr.branch}`)
      setTimeout(() => setActionSuccess(null), 4000)
      await loadGitData(projectId)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to merge branch")
    }
  }

  const tabs = [
    { id: "changes" as const, label: "Changes", count: changes.length },
    { id: "commits" as const, label: "Commits", count: commits.length },
    { id: "pulls" as const, label: "Pull requests", count: pulls.length },
    { id: "branches" as const, label: "Branches", count: branches.length },
    { id: "conflicts" as const, label: "Conflicts", count: conflicts.length },
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Active project"
              className="select select-sm w-full sm:w-auto sm:max-w-[200px]"
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

            <div className="inline-flex min-h-[40px] items-center overflow-hidden border border-line bg-surface sm:h-8 sm:min-h-0">
              <button
                onClick={() => handleSync("pull")}
                disabled={syncing !== null || !projectId}
                title={sync?.hasRemote ? "Pull from origin" : "No remote configured"}
                className="inline-flex h-full items-center gap-1.5 px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.8} />
                {syncing === "pull" ? "Pulling" : "Pull"}
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                onClick={() => handleSync("push")}
                disabled={syncing !== null || !projectId}
                title={sync?.hasRemote ? "Push to origin" : "No remote configured"}
                className="inline-flex h-full items-center gap-1.5 px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
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
                className="icon-btn h-full rounded-none sm:h-8 sm:w-8"
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="metric-label">Unified workspace diff</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Recorded from active worktree</p>
            </div>
            <div className="mt-2 max-h-72 overflow-auto border border-line bg-surface-2/20 py-2 font-mono text-[11px] leading-relaxed">
              {diff.split("\n").map((line, idx) => {
                const isAdd = line.startsWith("+") && !line.startsWith("+++")
                const isDel = line.startsWith("-") && !line.startsWith("---")
                const isHunk = line.startsWith("@@")
                return (
                  <div
                    key={idx}
                    className={cn(
                      "whitespace-pre px-3",
                      isAdd
                        ? "bg-success-soft/45 text-success"
                        : isDel
                        ? "bg-danger-soft/45 text-danger"
                        : isHunk
                        ? "bg-accent-soft/40 text-accent"
                        : "text-ink-2"
                    )}
                  >
                    {line || " "}
                  </div>
                )
              })}
            </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleFileAction("stage")}
                    className="btn-secondary btn-sm"
                    disabled={!projectId || changes.length === 0}
                  >
                    Stage all
                  </button>
                  <button
                    onClick={() => handleFileAction("unstage")}
                    className="btn-ghost btn-sm"
                    disabled={!projectId || changes.length === 0}
                  >
                    Unstage all
                  </button>
                  <button
                    onClick={() =>
                      handleFileAction(
                        "discard",
                        changes.map((c: { path: string }) => c.path)
                      )
                    }
                    className="btn-ghost btn-sm text-danger hover:text-danger"
                    disabled={!projectId || changes.length === 0}
                  >
                    Discard all
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
                    <li key={change.path} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "badge font-mono text-[9.5px]",
                            change.staged ? "bg-success-soft text-success" : "bg-surface-2 text-ink-3"
                          )}
                        >
                          {change.code?.trim() || "M"} · {change.staged ? "Staged" : "Unstaged"}
                        </span>
                        <span className="truncate font-mono text-[11px] text-ink">{change.path}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {change.staged ? (
                          <button
                            type="button"
                            onClick={() => handleFileAction("unstage", [change.path])}
                            className="btn-ghost btn-sm"
                          >
                            Unstage
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFileAction("stage", [change.path])}
                            className="btn-secondary btn-sm"
                          >
                            Stage
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFileAction("discard", [change.path])}
                          className="btn-ghost btn-sm text-danger hover:text-danger"
                        >
                          Discard
                        </button>
                      </div>
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
                        {c.author} · {c.branch} · {new Date(c.timestamp).toLocaleString()} ·{" "}
                        <span className="text-ink-2">
                          {c.filesChanged ?? 0} file(s)
                        </span>{" "}
                        (<span className="text-success">+{c.additions ?? 0}</span> /{" "}
                        <span className="text-danger">-{c.deletions ?? 0}</span>)
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
                <div key={pr.id || pr.number} className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <GitPullRequest className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[10px] text-ink-3">#{pr.number}</span>
                        {pr.url && pr.url.startsWith("https://") ? (
                          <a href={pr.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-accent hover:underline">
                            {pr.title}
                          </a>
                        ) : (
                          <p className="text-[13px] font-medium text-ink">{pr.title}</p>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        {pr.branch} → {pr.targetBranch} · {pr.author}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-surface-2 text-ink-3">
                      {pr.isRemote ? "Remote PR" : "Local PR Draft (Not Pushed)"}
                    </span>
                    <span className={cn("badge shrink-0", pr.status === "merged" ? "bg-success-soft text-success" : "bg-accent-soft text-accent")}>
                      {String(pr.status || "").replaceAll("_", " ")}
                    </span>
                    {pr.status !== "merged" && (
                      <button
                        type="button"
                        onClick={() => handleMergePr(pr)}
                        className="btn-secondary btn-sm"
                      >
                        Merge into {pr.targetBranch || "main"}
                      </button>
                    )}
                  </div>
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
                      onClick={() => handleCheckoutBranch(b.name)}
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
                <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Worktree merge conflicts</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                  Live unmerged conflict markers detected by <span className="font-mono">git diff --diff-filter=U</span>.
                </p>
              </div>
              <span className={cn("badge", conflicts.length > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
                {conflicts.length > 0 ? `${conflicts.length} conflicted file(s)` : "Clean worktree"}
              </span>
            </div>

            {conflicts.length === 0 ? (
              <div className="border border-line bg-surface-2/20 px-4 py-10 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-success" strokeWidth={1.8} />
                <p className="mt-3 text-[13px] font-medium text-ink">No merge conflicts detected</p>
                <p className="mt-1 text-[12px] text-ink-3">
                  All tracked files in <span className="font-mono">{currentBranch}</span> are free of unmerged conflict markers.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict) => {
                  const isEditing = editingConflictPath === conflict.path
                  return (
                    <div key={conflict.path} className="border border-warning/30 bg-warning-soft/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-medium text-ink">{conflict.path}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResolveConflict(conflict.path, "ours")}
                            className="btn-secondary btn-sm"
                          >
                            Accept current (ours)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveConflict(conflict.path, "theirs")}
                            className="btn-secondary btn-sm"
                          >
                            Accept incoming (theirs)
                          </button>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleResolveConflict(conflict.path, "manual", editingConflictContent)
                                }
                                className="btn-primary btn-sm"
                              >
                                Save &amp; mark resolved
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingConflictPath(null)
                                  setEditingConflictContent("")
                                }}
                                className="btn-ghost btn-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingConflictPath(conflict.path)
                                setEditingConflictContent(conflict.content)
                              }}
                              className="btn-ghost btn-sm"
                            >
                              Edit manually
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editingConflictContent}
                          onChange={(e) => setEditingConflictContent(e.target.value)}
                          rows={10}
                          aria-label={`Resolve conflict in ${conflict.path}`}
                          className="field mt-2 w-full font-mono text-[11px] leading-relaxed"
                        />
                      ) : (
                        <pre className="mt-2 max-h-64 overflow-auto border border-line bg-canvas p-3 font-mono text-[10.5px] leading-relaxed text-ink-2">
                          {conflict.content}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {showPrModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] sm:p-4">
          <div
            ref={prDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pr-dialog-title"
            className="panel max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Pull request</p>
                  <span className={cn("badge", hasGithubToken && hasGithubRemote ? "bg-success-soft text-success" : "bg-surface-2 text-ink-3")}>
                    {hasGithubToken && hasGithubRemote
                      ? "Live GitHub API"
                      : "Local PR draft — connect GitHub token"}
                  </span>
                </div>
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
                  Diff summary · derived from current branch state
                </p>
                <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-2">
                  <li>
                    {changes.length > 0
                      ? `${changes.length} working tree file(s) modified (${changes.map((c) => c.path).slice(0, 3).join(", ")})`
                      : `Branch ${prBranch || currentBranch} ready for review against main`}
                  </li>
                  <li>
                    {commits[0]?.message
                      ? `Latest commit (${commits[0].sha}): ${commits[0].message}`
                      : "All tracked commits verified in worktree"}
                  </li>
                  <li>
                    {diff
                      ? `Captured patch size: ${diff.split(/\r?\n/).filter((l) => l.startsWith("+") && !l.startsWith("+++")).length} additions, ${diff.split(/\r?\n/).filter((l) => l.startsWith("-") && !l.startsWith("---")).length} deletions`
                      : "Working directory clean — branch head commit will be proposed"}
                  </li>
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
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] sm:p-4">
          <div
            ref={branchDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-dialog-title"
            className="panel max-h-[90dvh] w-full max-w-sm overflow-y-auto shadow-float"
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
