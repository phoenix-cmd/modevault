"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useModalA11y } from "@/lib/use-modal-a11y"
import { useMediaQuery } from "@/lib/use-media-query"
import {
  Play,
  CheckCircle2,
  FileCode,
  GitBranch,
  Sparkles,
  Check,
  X,
  MessageSquare,
  Send,
  CheckSquare,
  ChevronLeft,
  ArrowRight,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn, formatNumber } from "@/lib/utils"

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 sm:h-[460px]">
        Loading diff inspector…
      </div>
    ),
  }
)

function executionStatusClass(status: string) {
  if (status === "completed") return "bg-success-soft text-success"
  if (status === "awaiting_approval") return "bg-accent-soft text-accent"
  if (status === "failed") return "bg-danger-soft text-danger"
  return "bg-surface-2 text-ink-3"
}

export default function AgentCenterPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<"diff" | "activity" | "tasks" | "comments" | "costs">("diff")
  const [loading, setLoading] = useState(true)

  // Dispatch prompt & planner state
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("agent_claude_code")
  const [prompt, setPrompt] = useState("")
  const [dispatching, setDispatching] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Multi-Agent Plan preview modal state
  const [planPreview, setPlanPreview] = useState<any | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const planDialogRef = useModalA11y(showPlanModal, () => setShowPlanModal(false))

  // Responsive viewports & Monaco Diff Editor state
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isXlDesktop = useMediaQuery("(min-width: 1280px)")
  const [mobilePane, setMobilePane] = useState<"workspace" | "detail">("workspace")
  const [diffModeOverride, setDiffModeOverride] = useState<boolean | null>(null)
  const diffSideBySide = diffModeOverride ?? isDesktop
  const [diffTheme, setDiffTheme] = useState<"vs-dark" | "light">("vs-dark")
  const pendingEventsRef = useRef<any[]>([])
  const flushRafRef = useRef<number | null>(null)

  useEffect(() => {
    // Match the editor surface to the active site theme and react to theme switches.
    const root = document.documentElement
    const sync = () => setDiffTheme(root.classList.contains("light") ? "light" : "vs-dark")
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Line Comments state
  const [comments, setComments] = useState<any[]>([])
  const [newCommentLine, setNewCommentLine] = useState<number | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [projRes, agentRes, execRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/agents"),
        fetch("/api/executions"),
      ])

      const [projJson, agentJson, execJson] = await Promise.all([
        projRes.json(),
        agentRes.json(),
        execRes.json(),
      ])

      const urlProjectId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("projectId") : null
      if (Array.isArray(projJson?.data)) {
        setProjects(projJson.data)
        setSelectedProject((prev: string) => prev || urlProjectId || projJson.data[0]?.id || "")
      }
      if (Array.isArray(agentJson?.data)) setAgents(agentJson.data)
      if (Array.isArray(execJson?.data)) {
        setExecutions(execJson.data)
        setSelectedExecution((prev: any) => {
          if (prev) return prev
          const first = execJson.data[0] || null
          if (first?.id) loadComments(first.id)
          return first
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async (executionId: string) => {
    try {
      const res = await fetch(`/api/executions/${executionId}/comments`)
      const json = await res.json()
      if (json.data) setComments(json.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedExecution?.id) {
      loadComments(selectedExecution.id)
    }
  }, [selectedExecution?.id])

  // Stream real execution events when an execution is selected, batching frames to avoid layout jitter.
  useEffect(() => {
    if (!selectedExecution?.id) return
    const targetId = selectedExecution.id
    pendingEventsRef.current = []
    const source = new EventSource(`/api/executions/${targetId}/events`)
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.eventType === "done") return
        pendingEventsRef.current.push(payload)
        if (flushRafRef.current === null) {
          flushRafRef.current = window.requestAnimationFrame(() => {
            flushRafRef.current = null
            const batch = pendingEventsRef.current.splice(0)
            if (batch.length === 0) return
            setSelectedExecution((prev: any) => {
              if (!prev || prev.id !== targetId) return prev
              const events = [...(prev.events || [])]
              for (const item of batch) {
                if (!events.some((existing: any) => existing.id === item.id)) {
                  events.push(item)
                }
              }
              return { ...prev, events }
            })
          })
        }
      } catch {
        // Ignore malformed event payloads.
      }
    }
    source.onerror = () => {
      source.close()
    }
    return () => {
      if (flushRafRef.current !== null) {
        window.cancelAnimationFrame(flushRafRef.current)
        flushRafRef.current = null
      }
      source.close()
    }
  }, [selectedExecution?.id])

  // Preview Multi-Agent DAG Plan
  const handlePreviewPlan = async () => {
    if (!prompt) return
    setGeneratingPlan(true)
    try {
      const res = await fetch("/api/orchestrator/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          prompt,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setPlanPreview(json.data)
        setShowPlanModal(true)
      }
    } catch (err) {
      console.error("Plan generation error:", err)
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!prompt || !selectedProject) return

    setDispatching(true)
    setShowPlanModal(false)
    try {
      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          agentId: selectedAgent,
          prompt,
        }),
      })

      const json = await res.json()
      if (json.data) {
        setExecutions((prev) => [json.data, ...prev])
        setSelectedExecution(json.data)
        loadComments(json.data.id)
        setPrompt("")
        setActionSuccess("Coding agent team dispatched and executed task plan!")
        setTimeout(() => setActionSuccess(null), 4000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDispatching(false)
    }
  }

  const handleApprovalAction = async (action: "approve" | "reject" | "request_revision") => {
    if (!selectedExecution) return

    try {
      const res = await fetch(`/api/executions/${selectedExecution.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const json = await res.json()
      if (json.data) {
        setSelectedExecution((prev: any) => ({
          ...prev,
          status: json.data.status,
        }))
        setActionSuccess(
          action === "approve"
            ? "Diff approved! Git commit created and ready for merge."
            : action === "reject"
            ? "Changes rejected and working worktree reset."
            : "Revision requested. Agent notified."
        )
        setTimeout(() => setActionSuccess(null), 4000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExecution || !newCommentText || newCommentLine === null) return

    setSubmittingComment(true)
    try {
      const filePath = diffArtifact?.path || "src/app/api/checkout/route.ts"
      const res = await fetch(`/api/executions/${selectedExecution.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          lineNumber: newCommentLine,
          comment: newCommentText,
          authorName: "Alex Kumar (Tech Lead)",
        }),
      })

      const json = await res.json()
      if (json.data) {
        setComments((prev) => [json.data, ...prev])
        setNewCommentText("")
        setNewCommentLine(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleResolveComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/executions/${selectedExecution.id}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, status: "resolved" }),
      })
      const json = await res.json()
      if (json.data) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status: "resolved" } : c))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const diffArtifact = selectedExecution?.artifacts?.find((a: any) => a.type === "git_diff")

  // Generate original vs modified code for Monaco Diff Editor
  const originalCode = `export interface RequestConfig {
  timeoutMs?: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
    });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json() as T;
  }
}`

  const modifiedCode = `export interface RequestConfig {
  timeoutMs?: number;
  retryAttempts?: number;
  idempotencyKey?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Execute request with exponential backoff and automatic idempotency key generation.
   */
  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const maxRetries = options.retryAttempts ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        };
        const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
          headers,
          signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
        });
        if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
        return await res.json() as T;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 200));
        }
      }
    }
    throw lastError ?? new Error("Request failed after retries");
  }
}`

  const completedCount = executions.filter(
    (execution) => execution.status === "completed"
  ).length
  const awaitingCount = executions.filter(
    (execution) => execution.status === "awaiting_approval"
  ).length
  const recordedTokens = executions.reduce(
    (sum, execution) => sum + Number(execution.totalTokens || 0),
    0
  )
  const estimatedSpend = executions.reduce(
    (sum, execution) => sum + Number(execution.estimatedCost || 0),
    0
  )

  const hasRealDiff = Boolean(diffArtifact?.content)
  const diffPath = diffArtifact?.path || "src/lib/services/api-client.ts"
  const currentPlanStages = Array.isArray(planPreview?.stages) ? planPreview.stages : []
  const executionEvents = Array.isArray(selectedExecution?.events) ? selectedExecution.events : []
  const executionTasks = Array.isArray(selectedExecution?.tasks) ? selectedExecution.tasks : []

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Operations · Agent runs"
        title="Agent Center"
        description="Dispatch instructions, inspect execution plans, and review diffs, comments, telemetry, and recorded spend from real runs in this workspace."
      />

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            { label: "Executions", value: String(executions.length), meta: `${completedCount} completed` },
            {
              label: "Awaiting approval",
              value: String(awaitingCount),
              meta: awaitingCount > 0 ? "Review required" : "Queue clear",
              accent: awaitingCount > 0,
            },
            { label: "Tokens recorded", value: formatNumber(recordedTokens), meta: "Across recorded runs" },
            { label: "Estimated spend", value: `$${estimatedSpend.toFixed(2)}`, meta: "Recorded execution cost" },
          ]}
        />
      )}

      {actionSuccess && (
        <div className="flex items-start gap-2 border border-success/25 bg-success-soft px-3.5 py-3 text-[13px] text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      <div className="segmented w-full xl:hidden" role="group" aria-label="Agent Center workspace view">
        <button
          type="button"
          onClick={() => setMobilePane("workspace")}
          aria-pressed={mobilePane === "workspace"}
          className={cn("segmented-item flex-1", mobilePane === "workspace" && "segmented-item-active")}
        >
          Dispatch &amp; runs ({executions.length})
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("detail")}
          aria-pressed={mobilePane === "detail"}
          className={cn("segmented-item flex-1", mobilePane === "detail" && "segmented-item-active")}
        >
          Execution detail
        </button>
      </div>

      <div
        className={cn(
          "grid items-start gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]",
          mobilePane !== "workspace" && "hidden xl:grid"
        )}
      >
        <section className="border-t border-line pt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Dispatch instruction</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                Target a project and agent, preview a decomposed plan, or run an execution against recorded workspace data.
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {projects.length} project{projects.length === 1 ? "" : "s"} · {agents.length} agent profile{agents.length === 1 ? "" : "s"}
            </span>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4 border-t border-line pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Target project</span>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  aria-label="Target project"
                  className="select"
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <span className="label">Execution agent</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  aria-label="Target agent"
                  className="select"
                >
                  <option value="agent_claude_code">Claude Code 3.7 (Architect)</option>
                  <option value="agent_codex">Codex 5.2 (Backend)</option>
                  <option value="agent_gemini_cli">Gemini CLI 2.5 (Frontend)</option>
                  <option value="multi_agent">Multi-Agent Team (Orchestrated DAG)</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="label">Instruction</span>
              <textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the change, fix, or implementation task to execute against the selected project..."
                className="field min-h-[112px] resize-y leading-relaxed"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="max-w-xl text-[12px] leading-relaxed text-ink-3">
                Preview generates a plan via the orchestrator API. Running creates an execution record and streams recorded events when available.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewPlan}
                  disabled={generatingPlan || !prompt}
                  className="btn-secondary"
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
                  {generatingPlan ? "Planning…" : "Preview plan"}
                </button>
                <button
                  type="submit"
                  disabled={dispatching || !prompt || !selectedProject}
                  className="btn-primary"
                >
                  <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
                  {dispatching ? "Dispatching…" : "Run execution"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="border-t border-line pt-6 xl:border-l xl:border-line xl:pl-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Execution register</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Select a run to inspect plan output, artifacts, comments, and telemetry.</p>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">{String(executions.length).padStart(2, "0")}</span>
          </div>

          <div className="border-y border-line">
            {loading ? (
              <div className="divide-y divide-line">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 px-3 py-4">
                    <div className="skeleton h-3 w-4/5" />
                    <div className="skeleton h-2.5 w-2/3" />
                  </div>
                ))}
              </div>
            ) : executions.length === 0 ? (
              <p className="px-3 py-8 text-[13px] leading-relaxed text-ink-3">
                No executions recorded yet. Dispatch an instruction to create the first run record.
              </p>
            ) : (
              <ul className="max-h-[520px] overflow-y-auto">
                {executions.map((exec, idx) => {
                  const isSelected = selectedExecution?.id === exec.id
                  return (
                    <li key={exec.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExecution(exec)
                          if (!isXlDesktop) {
                            setMobilePane("detail")
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }
                        }}
                        className={cn(
                          "relative block w-full px-3 py-3.5 text-left transition-colors",
                          isSelected ? "bg-surface-2/70" : "hover:bg-surface-2/40"
                        )}
                      >
                        <span className={cn("absolute inset-y-2 left-0 w-[2px] rounded-full bg-accent transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] tabular-nums text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
                              <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">{exec.title}</p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-3">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <GitBranch className="h-3 w-3 shrink-0" strokeWidth={1.7} />
                                <span className="truncate">{exec.targetBranch || "—"}</span>
                              </span>
                              <span className="tabular-nums text-ink-2">${Number(exec.estimatedCost ?? 0).toFixed(3)}</span>
                            </div>
                          </div>
                          <span className={cn("badge shrink-0", executionStatusClass(exec.status))}>
                            {String(exec.status || "unknown").replaceAll("_", " ")}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {showPlanModal && planPreview && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] sm:p-4">
          <div
            ref={planDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-preview-title"
            className="panel flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Orchestrator plan</p>
                <h3 id="plan-preview-title" className="mt-1 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                  {planPreview.goal || "Decomposed execution plan"}
                </h3>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  {planPreview.projectName} · {planPreview.targetBranch}
                </p>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="icon-btn -mr-1 -mt-1" aria-label="Close plan preview">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line border-b border-line bg-surface-2/20">
              {[
                { label: "Est. tokens", value: formatNumber(Number(planPreview.metrics?.totalEstimatedTokens || 0)) },
                { label: "Est. cost", value: `$${Number(planPreview.metrics?.estimatedCost || 0).toFixed(4)}` },
                { label: "Est. runtime", value: `~${Number(planPreview.metrics?.estimatedDurationSec || 0)}s` },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-3">
                  <p className="metric-label truncate">{metric.label}</p>
                  <p className="mt-1.5 font-mono text-[14px] font-medium tracking-[-0.03em] text-ink tabular-nums sm:text-[18px]">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="hidden grid-cols-[3rem_minmax(0,1fr)_10rem] items-center gap-4 border-b border-line px-5 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 sm:grid">
                <span>Step</span>
                <span>Stage &amp; scope</span>
                <span>Agent</span>
              </div>
              <ul>
                {currentPlanStages.map((stage: any, i: number) => (
                  <li key={stage.id || i} className="flex flex-col gap-2 border-b border-line px-4 py-3.5 last:border-b-0 sm:grid sm:grid-cols-[3rem_minmax(0,1fr)_10rem] sm:gap-4 sm:px-5">
                    <span className="pt-0.5 font-mono text-[10px] tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{stage.name}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{stage.description}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-accent">{stage.agentName}</p>
                      {stage.agentRole && <p className="mt-1 truncate text-[11px] text-ink-3">{stage.agentRole}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface/80 px-4 py-3 sm:px-5">
              <button type="button" onClick={() => setShowPlanModal(false)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={() => handleDispatch()} className="btn-primary">
                <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
                Confirm and launch
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={cn("border-t border-line pt-6", mobilePane !== "detail" && "hidden xl:block")}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => setMobilePane("workspace")}
              className="btn-secondary btn-sm xl:hidden"
              aria-label="Back to execution register"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Runs
            </button>
            <div>
              <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Execution detail</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Review artifacts, discussion, runtime telemetry, task stages, and cost records for the selected run.</p>
            </div>
          </div>
          {selectedExecution && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              <span>{selectedExecution.targetBranch || "—"}</span>
              <span>·</span>
              <span className="tabular-nums">{formatNumber(Number(selectedExecution.totalTokens || 0))} tokens</span>
              <span>·</span>
              <span className="tabular-nums">${Number(selectedExecution.estimatedCost || 0).toFixed(4)}</span>
            </div>
          )}
        </div>

        {selectedExecution ? (
          <div className="border border-line bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">{selectedExecution.title}</h3>
                  <span className={cn("badge", executionStatusClass(selectedExecution.status))}>
                    {String(selectedExecution.status || "unknown").replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-2">{selectedExecution.prompt}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/verify"
                  className="btn-secondary btn-sm"
                >
                  Open Verification Center
                </Link>
                {selectedExecution.status === "awaiting_approval" && (
                  <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    <button onClick={() => handleApprovalAction("reject")} className="btn-ghost btn-sm">Reject</button>
                    <button onClick={() => handleApprovalAction("request_revision")} className="btn-secondary btn-sm">Request revision</button>
                    <button onClick={() => handleApprovalAction("approve")} className="btn-primary btn-sm">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Approve and merge
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex overflow-x-auto border-b border-line px-3 sm:px-4">
              {[
                { id: "diff" as const, label: "Diff review" },
                { id: "comments" as const, label: "Comments" },
                { id: "activity" as const, label: "Activity" },
                { id: "tasks" as const, label: "Task graph" },
                { id: "costs" as const, label: "Costs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={cn(
                    "-mb-px shrink-0 border-b-2 px-3 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors",
                    activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-ink-3 hover:text-ink"
                  )}
                >
                  {tab.label}
                  {tab.id === "comments" && comments.length > 0 && (
                    <span className="ml-1.5 tabular-nums text-ink-3">{comments.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === "diff" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.8} />
                        <span className="truncate font-mono text-[11px] text-ink">{diffPath}</span>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.08em] text-success">+32 / −4</span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
                        {hasRealDiff
                          ? "Artifact diff content is recorded for this run. Editor preview below remains a read-only comparison view."
                          : "Sample diff preview (editor). Recorded artifact content is not available for this run."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setDiffModeOverride(!diffSideBySide)} className="btn-secondary btn-sm">
                        {diffSideBySide ? "Inline view" : "Side by side"}
                      </button>
                      <button
                        onClick={() => setDiffTheme(diffTheme === "vs-dark" ? "light" : "vs-dark")}
                        className="btn-secondary btn-sm"
                      >
                        {diffTheme === "vs-dark" ? "Light editor" : "Dark editor"}
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("comments")
                          setNewCommentLine(15)
                        }}
                        className="btn-primary btn-sm"
                      >
                        <MessageSquare className="h-3 w-3" strokeWidth={2.2} />
                        Add note
                      </button>
                    </div>
                  </div>

                  <div className="h-[340px] overflow-hidden border border-line bg-canvas sm:h-[460px]">
                    {(isXlDesktop || mobilePane === "detail") && (
                      <DiffEditor
                        height="100%"
                        language="typescript"
                        original={originalCode}
                        modified={modifiedCode}
                        theme={diffTheme}
                        keepCurrentOriginalModel
                        keepCurrentModifiedModel
                        options={{
                          renderSideBySide: diffSideBySide,
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: isDesktop ? 12.5 : 12,
                          lineNumbersMinChars: isDesktop ? 4 : 3,
                          glyphMargin: isDesktop,
                          folding: isDesktop,
                          wordWrap: isDesktop ? "off" : "on",
                          fontFamily: "var(--font-jetbrains), monospace",
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                    <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">Review comments</h4>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                      {comments.filter((c) => c.status === "open").length} open · {comments.length} total
                    </span>
                  </div>

                  <form onSubmit={handleAddComment} className="grid gap-3 border border-line bg-surface-2/30 p-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-end">
                    <label className="block">
                      <span className="label">Line</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newCommentLine ?? ""}
                        onChange={(e) => setNewCommentLine(parseInt(e.target.value, 10))}
                        placeholder="18"
                        className="field field-sm font-mono"
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="label">Comment</span>
                      <input
                        type="text"
                        required
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a suggestion, request a guard, or prompt a revision…"
                        className="field field-sm"
                      />
                    </label>
                    <button type="submit" disabled={submittingComment || !newCommentText || newCommentLine === null} className="btn-primary btn-sm">
                      <Send className="h-3 w-3" strokeWidth={2.2} />
                      Post
                    </button>
                  </form>

                  <ul className="border-t border-line">
                    {comments.length === 0 ? (
                      <li className="py-8 text-[13px] leading-relaxed text-ink-3">No review comments recorded for this run yet.</li>
                    ) : (
                      comments.map((c) => (
                        <li key={c.id} className={cn("border-b border-line py-3.5 last:border-b-0", c.status === "resolved" && "opacity-60")}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[13px] font-medium text-ink">{c.authorName}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Line {c.lineNumber}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{c.filePath}</span>
                            </div>
                            {c.status !== "resolved" ? (
                              <button
                                onClick={() => handleResolveComment(c.id)}
                                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-success transition-opacity hover:opacity-70"
                              >
                                <CheckSquare className="h-3 w-3" strokeWidth={1.8} />
                                Resolve
                              </button>
                            ) : (
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-success">Resolved</span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{c.comment}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                    <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">Execution telemetry</h4>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{executionEvents.length} events</span>
                  </div>

                  <div className="space-y-2">
                    {executionEvents.length === 0 ? (
                      <p className="py-6 text-[13px] leading-relaxed text-ink-3">No telemetry events recorded or streamed for this run.</p>
                    ) : (
                      executionEvents.map((ev: any, i: number) => {
                        let payload: any = {}
                        if (ev.payloadJson) {
                          try {
                            payload = JSON.parse(ev.payloadJson)
                          } catch {
                            payload = {}
                          }
                        } else if (ev.payload && typeof ev.payload === "object") {
                          payload = ev.payload
                        }

                        return (
                          <div key={ev.id || i} className="border border-line bg-surface-2/20 p-3">
                            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
                              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-accent">{ev.eventType}</span>
                              <span className="font-mono text-[10px] tabular-nums text-ink-3">SEQ {ev.seq ?? i + 1}</span>
                            </div>

                            {ev.eventType === "terminal" ? (
                              <div className="mt-2 border border-line bg-canvas p-2.5 font-mono text-[11px] leading-relaxed">
                                <p className="text-ink-3">$ {payload.command}</p>
                                <p className="whitespace-pre-wrap text-success">{payload.output}</p>
                              </div>
                            ) : ev.eventType === "file_change" ? (
                              <p className="mt-2 font-mono text-[11px] text-ink-2">
                                {payload.path}
                                <span className="ml-2 text-success">+{payload.linesAdded}</span>
                                <span className="ml-1 text-danger">−{payload.linesRemoved}</span>
                              </p>
                            ) : (
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink-2">
                                {JSON.stringify(payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                    <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">
                      Orchestration graph &amp; task stages
                    </h4>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                      {executionTasks.length} stages
                    </span>
                  </div>

                  {executionTasks.length === 0 ? (
                    <p className="py-8 text-[13px] leading-relaxed text-ink-3">
                      No orchestrated task stages recorded for this run.
                    </p>
                  ) : (
                    <>
                      {/* Desktop: Multi-agent pipeline connector view */}
                      <div className="hidden flex-wrap items-stretch gap-y-4 border-t border-line pt-4 lg:flex">
                        {executionTasks.map((t: any, i: number) => (
                          <div key={t.id || i} className="flex items-center">
                            <div className="flex h-full w-[240px] flex-col justify-between border border-line bg-surface-2/25 p-3.5">
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] tabular-nums text-accent">
                                    STAGE {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <span
                                    className={cn(
                                      "badge shrink-0",
                                      t.status === "completed"
                                        ? "bg-success-soft text-success"
                                        : "bg-surface-2 text-ink-3"
                                    )}
                                  >
                                    {String(t.status || "pending").replaceAll("_", " ")}
                                  </span>
                                </div>
                                <p className="mt-2 text-[13px] font-medium leading-snug text-ink">{t.title}</p>
                                {t.description && (
                                  <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-ink-2">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                              {(t.agentName || t.agentRole) && (
                                <p className="mt-3 border-t border-line/70 pt-2 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
                                  {t.agentName || "Agent"}
                                  {t.agentRole ? ` · ${t.agentRole}` : ""}
                                </p>
                              )}
                            </div>
                            {i < executionTasks.length - 1 && (
                              <div className="flex items-center px-2 text-ink-3" aria-hidden="true">
                                <span className="h-px w-4 bg-line-strong" />
                                <ArrowRight className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Mobile & Tablet: Structured vertical task timeline */}
                      <ol className="relative space-y-4 border-t border-line pt-4 pl-6 before:absolute before:bottom-4 before:left-2.5 before:top-6 before:w-px before:bg-line-strong lg:hidden">
                        {executionTasks.map((t: any, i: number) => (
                          <li key={t.id || i} className="relative border border-line bg-surface-2/20 p-3.5">
                            <span
                              className={cn(
                                "absolute -left-[19px] top-4 h-2.5 w-2.5 border border-canvas",
                                t.status === "completed" ? "bg-success" : "bg-accent"
                              )}
                              aria-hidden="true"
                            />
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                                  Stage {String(i + 1).padStart(2, "0")}
                                  {t.agentName ? ` · ${t.agentName}` : ""}
                                </span>
                                <p className="mt-1 text-[13px] font-medium text-ink">{t.title}</p>
                              </div>
                              <span
                                className={cn(
                                  "badge shrink-0",
                                  t.status === "completed" ? "bg-success-soft text-success" : "bg-surface-2 text-ink-3"
                                )}
                              >
                                {String(t.status || "pending").replaceAll("_", " ")}
                              </span>
                            </div>
                            {t.agentRole && (
                              <p className="mt-1 font-mono text-[10px] text-ink-3">{t.agentRole}</p>
                            )}
                            {t.description && (
                              <details className="mt-2">
                                <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 select-none">
                                  Stage details
                                </summary>
                                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{t.description}</p>
                              </details>
                            )}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              )}

              {activeTab === "costs" && (
                <div className="space-y-4">
                  <div className="border-b border-line pb-3">
                    <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">Resource ledger</h4>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Recorded token accounting for this execution</p>
                  </div>

                  <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                    {[
                      { label: "Input tokens", value: formatNumber(Number(selectedExecution.inputTokens || 0)), meta: "Recorded input" },
                      { label: "Output tokens", value: formatNumber(Number(selectedExecution.outputTokens || 0)), meta: "Recorded output" },
                      { label: "Total tokens", value: formatNumber(Number(selectedExecution.totalTokens || 0)), meta: "Billed/recorded volume" },
                      { label: "Estimated cost", value: `$${Number(selectedExecution.estimatedCost || 0).toFixed(4)}`, meta: "Recorded estimate" },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-surface px-4 py-4">
                        <p className="metric-label">{metric.label}</p>
                        <p className="mt-2 font-mono text-[20px] font-medium tracking-[-0.04em] tabular-nums text-ink">{metric.value}</p>
                        <p className="mt-1 text-[10.5px] text-ink-3">{metric.meta}</p>
                      </div>
                    ))}
                  </div>
                  {Number(selectedExecution.totalTokens || 0) === 0 && Number(selectedExecution.estimatedCost || 0) === 0 && (
                    <p className="text-[12.5px] leading-relaxed text-ink-3">
                      No token/cost values are recorded for this run. Values will reflect stored execution records when available.
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedExecution.status === "awaiting_approval" && (
              <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm sm:hidden">
                <button onClick={() => handleApprovalAction("reject")} className="btn-ghost btn-sm flex-1">
                  Reject
                </button>
                <button onClick={() => handleApprovalAction("request_revision")} className="btn-secondary btn-sm flex-1">
                  Revise
                </button>
                <button onClick={() => handleApprovalAction("approve")} className="btn-primary btn-sm w-full">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Approve and merge
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-line-strong bg-surface/60 px-6 py-14">
            <p className="text-[14px] font-medium text-ink">No execution selected</p>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">
              Select a run from the execution register to review its diff preview, comments, telemetry, task stages, and recorded cost ledger. If no runs exist, dispatch an instruction to create one.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
