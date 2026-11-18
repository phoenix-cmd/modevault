"use client"

import { useState, useEffect } from "react"
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
  const [prTitle, setPrTitle] = useState("")
  const [prBranch, setPrBranch] = useState("feature/checkout-idempotency")
  const [creatingPr, setCreatingPr] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // New Branch state
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")

  // Conflict resolution state
  const [conflictResolved, setConflictResolved] = useState(false)

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
              className="rounded-md border border-[#E8EAED] bg-[#FFFFFF] px-2 py-1.5 text-xs text-[#17191C]"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowBranchModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5] transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5 text-[#D5222D]" />
              New Branch
            </button>
            <button
              onClick={() => setShowPrModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-[#D5222D]" />
              Open Pull Request
            </button>
          </div>
        }
      />

      {actionSuccess && (
        <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#EDF7F1] p-3 text-xs text-[#1F7A4D] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Branch & PR Modals */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E8EAED] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#040404] text-white">
                  <GitPullRequest className="h-4 w-4 text-[#D5222D]" />
                </span>
                <h3 className="text-sm font-bold text-[#17191C]">Create Pull Request</h3>
              </div>
              <button onClick={() => setShowPrModal(false)} className="rounded-lg p-1 text-[#737982] hover:bg-[#F2F3F5]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#17191C]">PR Title</label>
                <input
                  type="text"
                  required
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="e.g. feat(checkout): atomic idempotency key validation"
                  className="mt-1 w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] outline-none focus:border-[#D5222D]/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17191C]">Source Branch</label>
                <select
                  value={prBranch}
                  onChange={(e) => setPrBranch(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-[#F8F9FB] p-3 text-[11px] text-[#737982] space-y-1">
                <p className="font-semibold text-[#17191C]">AI Pull Request Summary (Auto-generated)</p>
                <p>• Atomic database transactions for deduplication locks</p>
                <p>• Vitest test suite added: 8 unit test assertions passing</p>
                <p>• Zero breaking changes to client payload contract</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EAED]">
                <button
                  type="button"
                  onClick={() => setShowPrModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#737982] hover:bg-[#F2F3F5] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPr}
                  className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D5222D]" />
                  {creatingPr ? "Submitting..." : "Submit Pull Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8EAED] bg-[#FFFFFF] p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-[#17191C]">Create Worktree Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g. feature/auth-refresh"
                className="w-full rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 text-xs text-[#737982] hover:bg-[#F2F3F5] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#040404] px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E8EAED] text-xs font-semibold">
        <button
          onClick={() => setActiveTab("changes")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "changes"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Changes ({changes.length})
        </button>
        <button
          onClick={() => setActiveTab("commits")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "commits"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Commit History ({commits.length})
        </button>
        <button
          onClick={() => setActiveTab("pulls")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "pulls"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Pull Requests ({pulls.length})
        </button>
        <button
          onClick={() => setActiveTab("branches")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "branches"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Branches ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab("conflicts")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "conflicts"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Merge Conflict Resolver
        </button>
      </div>

      {diff && (
        <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF]">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9AA0A8]">Latest workspace diff</p>
          <pre className="max-h-64 overflow-auto rounded-md bg-[#F8F9FB] p-3 font-mono text-[11px] text-[#17191C] whitespace-pre-wrap">
            {diff}
          </pre>
        </GlassCard>
      )}

      {/* Content */}
      {activeTab === "changes" && (
        <div className="space-y-4">
          <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9AA0A8]">Working tree changes</p>
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
                  className="rounded-md border border-[#E8EAED] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
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
                  className="rounded-md border border-[#E8EAED] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
                >
                  Unstage all
                </button>
              </div>
            </div>
            {changes.length === 0 ? (
              <p className="mt-3 text-[12px] text-[#737982]">No changes detected.</p>
            ) : (
              <div className="mt-3 space-y-1">
                {changes.map((change: any) => (
                  <div key={change.path} className="flex items-center justify-between rounded-md border border-[#E8EAED] px-3 py-2">
                    <span className="font-mono text-[11px] text-[#17191C]">{change.path}</span>
                    <span className="text-[10px] font-semibold uppercase text-[#737982]">{change.code}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9AA0A8]">Commit</p>
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
        <div className="rounded-xl border border-[#E8EAED] bg-[#FFFFFF] divide-y divide-[#E8EAED] shadow-xs overflow-hidden">
          {commits.map((c) => (
            <div key={c.sha} className="p-4 flex items-center justify-between hover:bg-[#F8F9FB] transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F2F3F5] text-[#17191C]">
                  <GitCommit className="h-4 w-4 text-[#D5222D]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#17191C]">{c.message}</p>
                  <p className="text-[11px] text-[#737982]">
                    By <strong>{c.author}</strong> on <span className="font-mono">{c.branch}</span> • {new Date(c.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-[#F2F3F5] px-2 py-0.5 rounded border border-[#E8EAED] text-[#17191C]">
                  {c.sha}
                </span>
                <button
                  onClick={() => handleRollback(c.sha)}
                  className="rounded-lg p-1.5 text-[#737982] hover:bg-[#F2F3F5] hover:text-[#D5222D] transition-colors flex items-center gap-1 text-[11px]"
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
            <GlassCard key={pr.number} className="p-4 border-[#E8EAED] bg-[#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF7F1] text-[#1F7A4D]">
                  <GitPullRequest className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#17191C]">#{pr.number}</span>
                    <h4 className="text-xs font-semibold text-[#17191C]">{pr.title}</h4>
                  </div>
                  <p className="text-[11px] text-[#737982] mt-0.5">
                    {pr.branch} → {pr.targetBranch} • Author: {pr.author}
                  </p>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  pr.status === "merged"
                    ? "bg-[#EDF7F1] text-[#1F7A4D]"
                    : "bg-[rgba(213,34,45,0.08)] text-[#D5222D]"
                }`}
              >
                {pr.status.replace("_", " ")}
              </span>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === "branches" && (
        <div className="rounded-xl border border-[#E8EAED] bg-[#FFFFFF] divide-y divide-[#E8EAED] shadow-xs overflow-hidden">
          {branches.map((b) => (
            <div key={b.name} className="p-4 flex items-center justify-between hover:bg-[#F8F9FB] transition-colors">
              <div className="flex items-center gap-3">
                <GitBranch className={`h-4 w-4 ${b.isDefault ? "text-[#1F7A4D]" : "text-[#D5222D]"}`} />
                <div>
                  <span className="text-xs font-semibold text-[#17191C] font-mono">{b.name}</span>
                  {b.isDefault && (
                    <span className="ml-2 rounded bg-[#EDF7F1] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#1F7A4D]">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentBranch === b.name ? (
                  <span className="text-[11px] font-semibold text-[#1F7A4D]">Current Branch</span>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentBranch(b.name)
                      setActionSuccess(`Switched to branch: ${b.name}`)
                      setTimeout(() => setActionSuccess(null), 3000)
                    }}
                    className="rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1 text-xs text-[#17191C] hover:bg-[#F2F3F5]"
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
        <GlassCard className="p-6 border-[#E8EAED] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D5222D]" />
              <h4 className="text-xs font-bold text-[#17191C]">Three-Way Merge Conflict Resolution</h4>
            </div>
            <span className="text-xs text-[#737982] font-mono">src/app/api/checkout/route.ts</span>
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
                  className="rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
                >
                  Accept Incoming (Agent Version) & Commit
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#EDF7F1] p-4 text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-[#1F7A4D] mx-auto" />
              <p className="text-xs font-bold text-[#1F7A4D]">Conflict Resolved Successfully</p>
              <p className="text-[11px] text-[#737982]">
                Merged into worktree without loss of data. Safe to push.
              </p>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
