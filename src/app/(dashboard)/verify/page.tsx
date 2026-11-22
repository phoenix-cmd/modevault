"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Terminal,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn, formatNumber } from "@/lib/utils"

interface DiffFinding {
  id: string
  rule: string
  severity: "high" | "medium"
  lineNumber: number
  snippet: string
  reason: string
  guidance: string
}

interface ExecutionTask {
  id?: string
  title: string
  description?: string | null
  agentRole?: string | null
  agentName?: string | null
  status?: string | null
}

interface ExecutionArtifact {
  id?: string
  type: string
  path?: string | null
  content?: string | null
}

interface ExecutionRecord {
  id: string
  title: string
  status: string
  targetBranch?: string | null
  totalTokens?: number | null
  estimatedCost?: number | null
  durationMs?: number | null
  project?: { id: string; name: string } | null
  tasks?: ExecutionTask[]
  artifacts?: ExecutionArtifact[]
}

interface ReviewComment {
  id: string
  filePath: string
  lineNumber: number
  comment: string
  authorName: string
  status: string
}

function inspectDiffContent(diffText: string): {
  addedLineCount: number
  findings: DiffFinding[]
} {
  if (!diffText) return { addedLineCount: 0, findings: [] }

  const lines = diffText.split("\n")
  const findings: DiffFinding[] = []
  let addedLineCount = 0

  lines.forEach((rawLine, index) => {
    if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) return
    addedLineCount += 1
    const content = rawLine.slice(1)
    const lineNum = index + 1

    if (/(\$queryRawUnsafe|\$executeRawUnsafe)/.test(content)) {
      findings.push({
        id: `raw-sql-${lineNum}`,
        rule: "SQL-UNSAFE-RAW",
        severity: "high",
        lineNumber: lineNum,
        snippet: content.trim(),
        reason: "Unparameterized Prisma raw SQL helper allows string interpolation in queries.",
        guidance: "Replace with tagged template $queryRaw`...` / $executeRaw`...` so parameters bind safely.",
      })
    } else if (/dangerouslySetInnerHTML/.test(content)) {
      findings.push({
        id: `xss-inner-${lineNum}`,
        rule: "DOM-INNER-HTML",
        severity: "high",
        lineNumber: lineNum,
        snippet: content.trim(),
        reason: "Direct HTML injection into React nodes risks cross-site scripting when untrusted values reach markup.",
        guidance: "Render structured JSX text nodes or sanitize explicitly before binding.",
      })
    } else if (/\b(eval|new Function)\s*\(/.test(content)) {
      findings.push({
        id: `dynamic-eval-${lineNum}`,
        rule: "DYNAMIC-CODE-EXEC",
        severity: "high",
        lineNumber: lineNum,
        snippet: content.trim(),
        reason: "Dynamic JavaScript evaluation executes arbitrary strings with caller privileges.",
        guidance: "Replace dynamic evaluation with structured parsing or explicit handler dispatch.",
      })
    } else if (/(sk-live-|sk-ant-|ghp_|AKIA[0-9A-Z]{16})/.test(content)) {
      findings.push({
        id: `secret-literal-${lineNum}`,
        rule: "HARDCODED-SECRET",
        severity: "high",
        lineNumber: lineNum,
        snippet: content.trim().slice(0, 96),
        reason: "Literal credential prefix matched in added diff line.",
        guidance: "Move secrets into environment configuration or encrypted integration credentials.",
      })
    } else if (/Math\.random\s*\(\)/.test(content) && /(token|secret|key|idempotency|password)/i.test(content)) {
      findings.push({
        id: `weak-rng-${lineNum}`,
        rule: "NON-CRYPTO-RNG",
        severity: "medium",
        lineNumber: lineNum,
        snippet: content.trim(),
        reason: "Math.random() is not cryptographically unpredictable for tokens or security keys.",
        guidance: "Use crypto.randomUUID() or crypto.randomBytes().",
      })
    }
  })

  return { addedLineCount, findings }
}

export default function VerifyCenterPage() {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [activeTab, setActiveTab] = useState<"findings" | "evidence" | "review">("findings")
  const [loading, setLoading] = useState(true)
  const [actionBanner, setActionBanner] = useState<string | null>(null)
  const [noteLine, setNoteLine] = useState<number>(1)
  const [noteText, setNoteText] = useState("")
  const [postingNote, setPostingNote] = useState(false)

  const loadExecutions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/executions")
      const json = await res.json()
      const rows: ExecutionRecord[] = Array.isArray(json?.data) ? json.data : []
      setExecutions(rows)
      setSelectedId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id || ""))
    } catch (err) {
      console.error("Failed to load executions for verification:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/executions")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const rows: ExecutionRecord[] = Array.isArray(json?.data) ? json.data : []
        setExecutions(rows)
        setSelectedId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id || ""))
      })
      .catch((err) => console.error("Failed to load executions for verification:", err))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selected = executions.find((e) => e.id === selectedId) || null
  const activeExecutionId = selected?.id

  useEffect(() => {
    let active = true
    if (!activeExecutionId) {
      Promise.resolve().then(() => {
        if (active) setComments([])
      })
      return () => {
        active = false
      }
    }
    fetch(`/api/executions/${activeExecutionId}/comments`)
      .then((r) => r.json())
      .then((j) => {
        if (active && Array.isArray(j?.data)) setComments(j.data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [activeExecutionId])

  const diffArtifact = selected?.artifacts?.find((a) => a.type === "git_diff") || null
  const diffText = String(diffArtifact?.content || "")

  const inspection = useMemo(() => inspectDiffContent(diffText), [diffText])

  const handleDecision = async (action: "approve" | "request_revision" | "reject") => {
    if (!selected) return
    try {
      const res = await fetch(`/api/executions/${selected.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (json?.data) {
        setExecutions((prev) =>
          prev.map((ex) => (ex.id === selected.id ? { ...ex, status: json.data.status } : ex))
        )
        setActionBanner(
          action === "approve"
            ? "Execution verified and approved for merge."
            : action === "request_revision"
            ? "Revision requested; execution flagged for agent follow-up."
            : "Execution rejected."
        )
        window.setTimeout(() => setActionBanner(null), 4000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !noteText.trim()) return
    setPostingNote(true)
    try {
      const res = await fetch(`/api/executions/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: diffArtifact?.path || "workspace.diff",
          lineNumber: noteLine || 1,
          comment: noteText.trim(),
          authorName: "Verification Reviewer",
        }),
      })
      const json = await res.json()
      if (json?.data) {
        setComments((prev) => [json.data as ReviewComment, ...prev])
        setNoteText("")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPostingNote(false)
    }
  }

  const awaitingCount = executions.filter((e) => e.status === "awaiting_approval").length
  const withDiffCount = executions.filter(
    (e) => Array.isArray(e.artifacts) && e.artifacts.some((a) => a.type === "git_diff" && a.content)
  ).length
  const openComments = comments.filter((c) => c.status !== "resolved").length

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Workspace · MODELVAULT Verify"
        title="Verification Center"
        description="Inspect execution evidence, deterministic lexical diff patterns, test outputs, and human approval sign-offs across agent runs."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadExecutions} className="btn-secondary btn-sm">
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              Refresh runs
            </button>
            <Link href="/agents" className="btn-primary btn-sm">
              Open Agent Center
            </Link>
          </div>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            { label: "Recorded runs", value: String(executions.length), meta: "In workspace database" },
            {
              label: "Awaiting decision",
              value: String(awaitingCount),
              meta: awaitingCount > 0 ? "Review required" : "Queue clear",
              accent: awaitingCount > 0,
            },
            { label: "Diff artifacts", value: String(withDiffCount), meta: "With captured patch" },
            {
              label: "Lexical flags",
              value: diffText ? String(inspection.findings.length) : "—",
              meta: diffText ? `${inspection.addedLineCount} added lines checked` : "No patch on selection",
            },
          ]}
        />
      )}

      {/* Explicit Scan Scope Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.8} />
          <span>
            Evidence scope: stored workspace execution records + local lexical check on captured git_diff artifacts.
          </span>
        </div>
        <span className="text-ink-3">Not an external SAST/DAST certification</span>
      </div>

      {actionBanner && (
        <div className="flex items-center justify-between gap-3 border border-success/35 bg-success-soft px-4 py-3 text-[13px] text-success">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {actionBanner}
          </span>
          <button onClick={() => setActionBanner(null)} className="icon-btn h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Run Queue */}
        <aside className="border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
              Execution queue
            </h2>
            <span className="font-mono text-[10px] text-ink-3">
              {String(executions.length).padStart(2, "0")}
            </span>
          </div>

          <div className="border-y border-line">
            {loading ? (
              <div className="space-y-3 p-3">
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
              </div>
            ) : executions.length === 0 ? (
              <p className="px-3 py-8 text-[12.5px] text-ink-3">
                No execution runs recorded yet. Dispatch a run in Agent Center first.
              </p>
            ) : (
              <ul className="max-h-[580px] divide-y divide-line overflow-y-auto">
                {executions.map((ex) => {
                  const active = ex.id === selectedId
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(ex.id)}
                        className={cn(
                          "relative block w-full px-3 py-3 text-left transition-colors",
                          active ? "bg-surface-2/80" : "hover:bg-surface-2/40"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-1.5 left-0 w-[2px] bg-accent",
                            active ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-[12.5px] font-medium text-ink">
                            {ex.title}
                          </p>
                          <span
                            className={cn(
                              "badge shrink-0",
                              ex.status === "completed"
                                ? "bg-success-soft text-success"
                                : ex.status === "awaiting_approval"
                                ? "bg-accent-soft text-accent"
                                : "bg-surface-2 text-ink-3"
                            )}
                          >
                            {String(ex.status || "pending").replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-ink-3">
                          <span className="flex items-center gap-1 truncate">
                            <GitBranch className="h-3 w-3 shrink-0" />
                            {ex.targetBranch || "—"}
                          </span>
                          <span>{formatNumber(Number(ex.totalTokens || 0))} tkn</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Main Inspection Surface */}
        <section className="min-w-0">
          {!selected ? (
            <div className="border border-dashed border-line-strong bg-surface px-6 py-14">
              <p className="text-[14px] font-medium text-ink">No run selected</p>
              <p className="mt-1 text-[13px] text-ink-3">
                Select an execution from the left queue to inspect its diff artifact, recorded task evidence, and approval controls.
              </p>
            </div>
          ) : (
            <div className="border border-line bg-surface">
              {/* Header & Approval Controls */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                    {selected.project?.name || "Workspace project"} · {selected.targetBranch || "branch"}
                  </p>
                  <h2 className="mt-1 font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
                    {selected.title}
                  </h2>
                </div>

                {selected.status === "awaiting_approval" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleDecision("reject")} className="btn-ghost btn-sm">
                      Reject
                    </button>
                    <button onClick={() => handleDecision("request_revision")} className="btn-secondary btn-sm">
                      Request revision
                    </button>
                    <button onClick={() => handleDecision("approve")} className="btn-primary btn-sm">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Verify &amp; Approve
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto border-b border-line px-4">
                {[
                  { id: "findings" as const, label: `Diff inspection (${inspection.findings.length})` },
                  { id: "evidence" as const, label: `Build & task evidence (${selected.tasks?.length || 0})` },
                  { id: "review" as const, label: `Patch & notes (${openComments})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={activeTab === tab.id}
                    className={cn(
                      "-mb-px shrink-0 border-b-2 px-3 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] transition-colors",
                      activeTab === tab.id
                        ? "border-accent text-accent"
                        : "border-transparent text-ink-3 hover:text-ink"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === "findings" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                      <span>Artifact: {diffArtifact?.path || "None recorded"}</span>
                      <span>
                        Added lines scanned: {inspection.addedLineCount} · Matches: {inspection.findings.length}
                      </span>
                    </div>

                    {!diffText ? (
                      <div className="border border-dashed border-line-strong bg-canvas p-6 text-[13px] text-ink-3">
                        No <code className="font-mono text-ink-2">git_diff</code> artifact was stored on this execution run, so lexical diff checks did not run.
                      </div>
                    ) : inspection.findings.length === 0 ? (
                      <div className="flex items-start gap-3 border border-success/30 bg-success-soft p-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <div>
                          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-success">
                            0 local lexical pattern findings
                          </p>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                            Inspected {inspection.addedLineCount} added line(s) in the captured patch for raw SQL queries, unsafe DOM HTML injection, dynamic eval, literal key prefixes, and weak RNG tokens. Full dependency/type checks remain under build verification.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inspection.findings.map((f) => (
                          <div
                            key={f.id}
                            className="space-y-2 border border-danger/35 bg-danger-soft/40 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold text-danger">
                                {f.severity === "high" ? (
                                  <ShieldAlert className="h-4 w-4" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                )}
                                {f.rule}
                              </span>
                              <span className="font-mono text-[10.5px] text-ink-3">
                                Patch line {f.lineNumber}
                              </span>
                            </div>
                            <pre className="overflow-x-auto border border-line bg-canvas px-3 py-2 font-mono text-[11px] text-warning">
                              {f.snippet}
                            </pre>
                            <p className="text-[12.5px] text-ink-2">{f.reason}</p>
                            <p className="font-mono text-[11px] text-success">
                              Remediation: {f.guidance}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "evidence" && (
                  <div className="space-y-4">
                    <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                      Orchestrated tasks ({selected.tasks?.length || 0})
                    </h3>
                    {!selected.tasks?.length ? (
                      <p className="text-[13px] text-ink-3">No task stages attached to this run.</p>
                    ) : (
                      <ul className="divide-y divide-line border-y border-line">
                        {selected.tasks.map((task, i) => (
                          <li key={task.id || i} className="flex items-start justify-between gap-4 py-3.5">
                            <div>
                              <p className="text-[13px] font-medium text-ink">{task.title}</p>
                              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                                {task.agentName} · {task.agentRole}
                              </p>
                              {task.description && (
                                <p className="mt-1 text-[12px] text-ink-2">{task.description}</p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "badge shrink-0",
                                task.status === "completed"
                                  ? "bg-success-soft text-success"
                                  : "bg-surface-2 text-ink-3"
                              )}
                            >
                              {String(task.status || "pending")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="border-t border-line pt-4">
                      <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                        <Terminal className="h-3.5 w-3.5 text-accent" />
                        Recorded telemetry &amp; budget
                      </p>
                      <div className="grid grid-cols-3 divide-x divide-line border border-line bg-canvas">
                        <div className="p-3">
                          <span className="metric-label">Total tokens</span>
                          <p className="mt-1 font-mono text-[16px] text-ink tabular-nums">
                            {formatNumber(Number(selected.totalTokens || 0))}
                          </p>
                        </div>
                        <div className="p-3">
                          <span className="metric-label">Est. cost</span>
                          <p className="mt-1 font-mono text-[16px] text-ink tabular-nums">
                            ${Number(selected.estimatedCost || 0).toFixed(4)}
                          </p>
                        </div>
                        <div className="p-3">
                          <span className="metric-label">Duration</span>
                          <p className="mt-1 font-mono text-[16px] text-ink tabular-nums">
                            {selected.durationMs ? `${(selected.durationMs / 1000).toFixed(1)}s` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "review" && (
                  <div className="space-y-5">
                    {diffText ? (
                      <pre className="max-h-72 overflow-auto border border-line bg-canvas p-4 font-mono text-[11px] leading-relaxed text-ink-2">
                        {diffText}
                      </pre>
                    ) : (
                      <p className="border border-dashed border-line-strong bg-canvas p-4 text-[12.5px] text-ink-3">
                        No patch content captured on this run.
                      </p>
                    )}

                    <form onSubmit={handlePostNote} className="grid gap-3 border border-line bg-canvas p-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-end">
                      <label className="block">
                        <span className="label">Line</span>
                        <input
                          type="number"
                          min={1}
                          value={noteLine}
                          onChange={(e) => setNoteLine(Number(e.target.value) || 1)}
                          className="field field-sm font-mono"
                        />
                      </label>
                      <label className="block">
                        <span className="label">Verification note</span>
                        <input
                          type="text"
                          required
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Record finding, remediation instruction, or approval note…"
                          className="field field-sm"
                        />
                      </label>
                      <button type="submit" disabled={postingNote || !noteText.trim()} className="btn-primary btn-sm">
                        <MessageSquare className="h-3 w-3" />
                        Add note
                      </button>
                    </form>

                    <ul className="divide-y divide-line border-y border-line">
                      {comments.length === 0 ? (
                        <li className="py-6 text-[12.5px] text-ink-3">
                          No verification notes recorded on this run yet.
                        </li>
                      ) : (
                        comments.map((c) => (
                          <li key={c.id} className="py-3">
                            <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-3">
                              <span className="font-medium text-ink">{c.authorName}</span>
                              <span>
                                {c.filePath}:{c.lineNumber} · {c.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[12.5px] text-ink-2">{c.comment}</p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
