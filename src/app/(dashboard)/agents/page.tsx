"use client"

import { useEffect, useState, Suspense } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import { useSearchParams } from "next/navigation"
import {
  Play,
  CheckCircle2,
  Terminal,
  FileCode,
  GitBranch,
  Sparkles,
  Check,
  X,
  MessageSquare,
  Send,
  CheckSquare,
} from "lucide-react"
import { DiffEditor } from "@monaco-editor/react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn, formatNumber } from "@/lib/utils"

function executionStatusClass(status: string) {
  if (status === "completed") return "bg-success-soft text-success"
  if (status === "awaiting_approval") return "bg-accent-soft text-accent"
  if (status === "failed") return "bg-danger-soft text-danger"
  return "bg-surface-2 text-ink-3"
}

export default function AgentCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          Loading agent runs…
        </div>
      }
    >
      <AgentCenterContent />
    </Suspense>
  )
}

function AgentCenterContent() {
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get("projectId")

  const [projects, setProjects] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<"diff" | "activity" | "tasks" | "comments" | "costs">("diff")
  const [loading, setLoading] = useState(true)

  // Dispatch prompt & planner state
  const [selectedProject, setSelectedProject] = useState(initialProjectId || "")
  const [selectedAgent, setSelectedAgent] = useState("agent_claude_code")
  const [prompt, setPrompt] = useState("")
  const [dispatching, setDispatching] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Multi-Agent Plan preview modal state
  const [planPreview, setPlanPreview] = useState<any | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const planDialogRef = useModalA11y(showPlanModal, () => setShowPlanModal(false))

  // Monaco Diff Editor state
  const [diffSideBySide, setDiffSideBySide] = useState(true)
  const [diffTheme, setDiffTheme] = useState<"vs-dark" | "light">("vs-dark")

  useEffect(() => {
    // Match the editor surface to the active site theme on first mount.
    setDiffTheme(
      document.documentElement.classList.contains("dark") ? "vs-dark" : "light"
    )
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

      if (projJson.data) {
        setProjects(projJson.data)
        if (!selectedProject && projJson.data.length > 0) {
          setSelectedProject(initialProjectId || projJson.data[0].id)
        }
      }
      if (agentJson.data) setAgents(agentJson.data)
      if (execJson.data) {
        setExecutions(execJson.data)
        if (!selectedExecution && execJson.data.length > 0) {
          setSelectedExecution(execJson.data[0])
          loadComments(execJson.data[0].id)
        }
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

  // Stream real execution events when an execution is selected.
  useEffect(() => {
    if (!selectedExecution?.id) return
    const source = new EventSource(`/api/executions/${selectedExecution.id}/events`)
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.eventType === "done") return
        setSelectedExecution((prev: any) => {
          if (!prev || prev.id !== selectedExecution.id) return prev
          const events = [...(prev.events || [])]
          if (!events.some((item: any) => item.id === payload.id)) {
            events.push(payload)
          }
          return { ...prev, events }
        })
      } catch {
        // Ignore malformed event payloads.
      }
    }
    source.onerror = () => {
      source.close()
    }
    return () => {
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

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Operations · Agent runs"
        title="Agents"
        description="Dispatch coding work to a single agent or an orchestrated team, then review diffs, telemetry, and spend."
      />

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            {
              label: "Executions",
              value: String(executions.length),
              meta: `${completedCount} completed`,
            },
            {
              label: "Awaiting approval",
              value: String(awaitingCount),
              meta: awaitingCount > 0 ? "Review required" : "Queue clear",
              accent: awaitingCount > 0,
            },
            {
              label: "Tokens recorded",
              value: formatNumber(recordedTokens),
              meta: "Across recorded runs",
            },
            {
              label: "Estimated spend",
              value: `$${estimatedSpend.toFixed(2)}`,
              meta: "Agent runtime cost",
            },
          ]}
        />
      )}

      {actionSuccess && (
        <div className="flex items-start gap-2 border border-success/25 bg-success-soft px-3 py-2.5 text-[12px] text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Dispatch instruction */}
      <section className="border-t border-line pt-5">
        <form onSubmit={handleDispatch} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                Dispatch instruction
              </h2>
              <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                Route work to a single agent or an orchestrated team
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                aria-label="Target project"
                className="select select-sm w-auto"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                aria-label="Target agent"
                className="select select-sm w-auto"
              >
                <option value="agent_claude_code">Claude Code 3.7 (Architect)</option>
                <option value="agent_codex">Codex 5.2 (Backend)</option>
                <option value="agent_gemini_cli">Gemini CLI 2.5 (Frontend)</option>
                <option value="multi_agent">Multi-Agent Team (Orchestrated DAG)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Implement atomic idempotency key validation on /api/checkout, or fix the responsive navbar drawer"
              className="field flex-1"
            />
            <button
              type="button"
              onClick={handlePreviewPlan}
              disabled={generatingPlan || !prompt}
              className="btn-secondary"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
              {generatingPlan ? "Planning…" : "Preview DAG"}
            </button>
            <button
              type="submit"
              disabled={dispatching}
              className="btn-primary"
            >
              <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
              {dispatching ? "Dispatching…" : "Run execution"}
            </button>
          </div>
        </form>
      </section>

      {/* Plan preview modal */}
      {showPlanModal && planPreview && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={planDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-preview-title"
            className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3
                  id="plan-preview-title"
                  className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink"
                >
                  Decomposed plan DAG
                </h3>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                  {planPreview.projectName} · {planPreview.targetBranch}
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="icon-btn -mr-1.5 -mt-1"
                aria-label="Close plan preview"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[
                {
                  label: "Est. tokens",
                  value: formatNumber(planPreview.metrics.totalEstimatedTokens),
                },
                {
                  label: "Est. cost",
                  value: `$${planPreview.metrics.estimatedCost}`,
                },
                {
                  label: "Est. runtime",
                  value: `~${planPreview.metrics.estimatedDurationSec}s`,
                },
              ].map((metric) => (
                <div key={metric.label} className="px-4 py-3">
                  <p className="metric-label">{metric.label}</p>
                  <p className="mt-1.5 font-mono text-[17px] font-medium tracking-[-0.03em] text-ink tabular-nums">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <ul className="max-h-64 overflow-y-auto">
              {planPreview.stages.map((stage: any) => (
                <li
                  key={stage.id}
                  className="border-b border-line px-5 py-3 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[12.5px] font-medium text-ink">
                      {stage.name}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">
                      {stage.agentName}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                    {stage.description}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDispatch()}
                className="btn-primary"
              >
                <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
                Confirm and launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executions and selected run */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="border-t border-line pt-5 lg:col-span-4">
          <div className="flex items-baseline justify-between gap-3 pb-4">
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                Recorded executions
              </h2>
              <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                Agent runs in this workspace
              </p>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">
              {String(executions.length).padStart(2, "0")}
            </span>
          </div>

          <div className="border-t border-line">
            {executions.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-ink-3">
                No executions recorded yet.
              </p>
            ) : (
              executions.map((exec) => {
                const isSelected = selectedExecution?.id === exec.id
                return (
                  <button
                    type="button"
                    key={exec.id}
                    onClick={() => setSelectedExecution(exec)}
                    className={cn(
                      "relative block w-full border-b border-line px-3 py-3.5 text-left transition-colors last:border-b-0",
                      isSelected
                        ? "bg-surface-2"
                        : "hover:bg-surface-2/50"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-px bg-accent transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink">
                        {exec.title}
                      </p>
                      <span
                        className={cn(
                          "badge shrink-0",
                          executionStatusClass(exec.status)
                        )}
                      >
                        {exec.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[9.5px] text-ink-3">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <GitBranch className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{exec.targetBranch}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-2">
                        ${exec.estimatedCost?.toFixed(3) || "0.150"}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <div className="lg:col-span-8">
          {selectedExecution ? (
            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                      {selectedExecution.title}
                    </h2>
                    <span
                      className={cn(
                        "badge",
                        executionStatusClass(selectedExecution.status)
                      )}
                    >
                      {selectedExecution.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                    <span className="text-ink-2">{selectedExecution.targetBranch}</span>
                    <span className="px-1.5">·</span>
                    {formatNumber(selectedExecution.totalTokens || 38400)} tokens
                    <span className="px-1.5">·</span>$
                    {selectedExecution.estimatedCost?.toFixed(4) || "0.1850"}
                  </p>
                </div>

                {selectedExecution.status === "awaiting_approval" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleApprovalAction("reject")}
                      className="btn-ghost btn-sm"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprovalAction("request_revision")}
                      className="btn-secondary btn-sm"
                    >
                      Request revision
                    </button>
                    <button
                      onClick={() => handleApprovalAction("approve")}
                      className="btn-primary btn-sm"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Approve and merge
                    </button>
                  </div>
                )}
              </div>

              <div className="flex overflow-x-auto border-b border-line px-2">
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
                      "-mb-px shrink-0 border-b py-3 px-3 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] transition-colors",
                      activeTab === tab.id
                        ? "border-accent text-accent"
                        : "border-transparent text-ink-3 hover:text-ink"
                    )}
                  >
                    {tab.label}
                    {tab.id === "comments" && comments.length > 0 && (
                      <span className="ml-1.5 tabular-nums text-ink-3">
                        {comments.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5">
                {activeTab === "diff" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileCode
                          className="h-3.5 w-3.5 shrink-0 text-accent"
                          strokeWidth={1.8}
                        />
                        <span className="truncate font-mono text-[10.5px] text-ink">
                          {diffArtifact?.path || "src/lib/services/api-client.ts"}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-success">
                          +32 / −4
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setDiffSideBySide(!diffSideBySide)}
                          className="btn-secondary btn-sm"
                        >
                          {diffSideBySide ? "Inline view" : "Side by side"}
                        </button>
                        <button
                          onClick={() =>
                            setDiffTheme(
                              diffTheme === "vs-dark" ? "light" : "vs-dark"
                            )
                          }
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

                    <div className="overflow-hidden border border-line">
                      <DiffEditor
                        height="440px"
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
                          fontSize: 12.5,
                          fontFamily: "var(--font-jetbrains), monospace",
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Line comments */}
                {activeTab === "comments" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                      <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">
                        Review comments
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                        {comments.filter((c) => c.status === "open").length} open
                        threads
                      </span>
                    </div>

                    <form
                      onSubmit={handleAddComment}
                      className="space-y-3 border border-line bg-surface-2/40 p-3"
                    >
                      <label className="flex items-center gap-2">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                          Line
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newCommentLine ?? ""}
                          onChange={(e) =>
                            setNewCommentLine(parseInt(e.target.value, 10))
                          }
                          placeholder="18"
                          className="field field-sm w-24 font-mono"
                        />
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          required
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Add a suggestion, require a guard check, or prompt a revision…"
                          className="field field-sm flex-1"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newCommentText}
                          className="btn-primary btn-sm"
                        >
                          <Send className="h-3 w-3" strokeWidth={2.2} />
                          Post
                        </button>
                      </div>
                    </form>

                    <ul className="border-t border-line">
                      {comments.length === 0 && (
                        <li className="py-8 text-center text-[12px] text-ink-3">
                          No review comments on this run yet.
                        </li>
                      )}
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className={cn(
                            "border-b border-line py-3 last:border-b-0",
                            c.status === "resolved" && "opacity-60"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-medium text-ink">
                                {c.authorName}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                                Line {c.lineNumber}
                              </span>
                            </div>
                            {c.status !== "resolved" ? (
                              <button
                                onClick={() => handleResolveComment(c.id)}
                                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-success transition-opacity hover:opacity-70"
                              >
                                <CheckSquare className="h-3 w-3" strokeWidth={1.8} />
                                Resolve
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-success">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                            {c.comment}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                      <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">
                        Execution telemetry
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                        {(selectedExecution.events || []).length} events
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(selectedExecution.events || []).length === 0 && (
                        <p className="py-6 text-center text-[12px] text-ink-3">
                          No telemetry has been streamed for this run.
                        </p>
                      )}
                      {(selectedExecution.events || []).map(
                        (ev: any, i: number) => {
                          let payload: any = {}
                          try {
                            payload = JSON.parse(ev.payloadJson)
                          } catch {
                            // Ignore malformed event payloads.
                          }

                          return (
                            <div
                              key={i}
                              className="border border-line bg-surface-2/40 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-accent">
                                  {ev.eventType}
                                </span>
                                <span className="font-mono text-[9px] tabular-nums text-ink-3">
                                  SEQ {ev.seq}
                                </span>
                              </div>

                              {ev.eventType === "terminal" ? (
                                <div className="mt-2 border border-line bg-canvas p-2 font-mono text-[10.5px] leading-relaxed">
                                  <p className="text-ink-3">$ {payload.command}</p>
                                  <p className="whitespace-pre-wrap text-success">
                                    {payload.output}
                                  </p>
                                </div>
                              ) : ev.eventType === "file_change" ? (
                                <p className="mt-1.5 font-mono text-[10.5px] text-ink-2">
                                  {payload.path}
                                  <span className="ml-2 text-success">
                                    +{payload.linesAdded}
                                  </span>
                                  <span className="ml-1 text-danger">
                                    −{payload.linesRemoved}
                                  </span>
                                </p>
                              ) : (
                                <p className="mt-1.5 break-all font-mono text-[10.5px] text-ink-2">
                                  {JSON.stringify(payload)}
                                </p>
                              )}
                            </div>
                          )
                        }
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "tasks" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                      <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">
                        Task dependency graph
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                        {(selectedExecution.tasks || []).length} stages
                      </span>
                    </div>

                    <ul className="border-t border-line">
                      {(selectedExecution.tasks || []).length === 0 && (
                        <li className="py-8 text-center text-[12px] text-ink-3">
                          No orchestrated tasks recorded for this run.
                        </li>
                      )}
                      {(selectedExecution.tasks || []).map(
                        (t: any, i: number) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[12.5px] font-medium text-ink">
                                  {t.title}
                                </p>
                                <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
                                  {t.agentName} · {t.agentRole}
                                </p>
                              </div>
                            </div>

                            <span
                              className={cn(
                                "badge shrink-0",
                                t.status === "completed"
                                  ? "bg-success-soft text-success"
                                  : "bg-surface-2 text-ink-3"
                              )}
                            >
                              {t.status}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {activeTab === "costs" && (
                  <div className="space-y-4">
                    <div className="border-b border-line pb-3">
                      <h4 className="font-display text-[14px] font-medium tracking-[-0.02em] text-ink">
                        Resource ledger
                      </h4>
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                        Token accounting for this execution
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
                      {[
                        {
                          label: "Input tokens",
                          value: formatNumber(
                            selectedExecution.inputTokens || 28000
                          ),
                          meta: "Repository context",
                        },
                        {
                          label: "Output tokens",
                          value: formatNumber(
                            selectedExecution.outputTokens || 10400
                          ),
                          meta: "Generated code",
                        },
                        {
                          label: "Total tokens",
                          value: formatNumber(
                            selectedExecution.totalTokens || 38400
                          ),
                          meta: "Billed volume",
                        },
                        {
                          label: "Estimated cost",
                          value: `$${(
                            selectedExecution.estimatedCost || 0.185
                          ).toFixed(4)}`,
                          meta: "Runtime spend",
                        },
                      ].map((metric) => (
                        <div key={metric.label} className="bg-surface px-4 py-4">
                          <p className="metric-label">{metric.label}</p>
                          <p className="mt-2 font-mono text-[20px] font-medium tracking-[-0.04em] tabular-nums text-ink">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-[10.5px] text-ink-3">
                            {metric.meta}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="border border-dashed border-line bg-surface px-6 py-14 text-center">
              <p className="text-[12.5px] font-medium text-ink">
                No execution selected
              </p>
              <p className="mt-1 text-[12px] text-ink-3">
                Choose a run from the list to review its diff, comments, and
                telemetry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
