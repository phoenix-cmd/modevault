"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  FileCode,
  GitBranch,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Eye,
  Coins,
  ArrowUpRight,
  MessageSquare,
  Send,
  Sliders,
  CheckSquare,
} from "lucide-react"
import { DiffEditor } from "@monaco-editor/react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { formatCurrency, formatNumber } from "@/lib/utils"

export default function AgentCenterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#737982]">Loading Agent Command Center...</div>}>
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

  // Monaco Diff Editor state
  const [diffSideBySide, setDiffSideBySide] = useState(true)
  const [diffTheme, setDiffTheme] = useState<"vs-dark" | "light">("vs-dark")

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

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Agent Command Center"
        description="Autonomous coding agent execution, live AST mutations, terminal streams, and pull request diff reviews."
      />

      {actionSuccess && (
        <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#EDF7F1] p-3 text-xs text-[#1F7A4D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        </div>
      )}

      {/* Top Section: Dispatch Instruction to Agent Team */}
      <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] shadow-xs">
        <form onSubmit={handleDispatch} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#040404] text-white">
                <Bot className="h-3.5 w-3.5 text-[#D5222D]" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#17191C]">
                Dispatch Coding Instruction
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {/* Project selector */}
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-2.5 py-1 text-xs text-[#17191C] outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Agent selector */}
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-2.5 py-1 text-xs text-[#17191C] outline-none"
              >
                <option value="agent_claude_code">Claude Code 3.7 (Architect)</option>
                <option value="agent_codex">Codex 5.2 (Backend)</option>
                <option value="agent_gemini_cli">Gemini CLI 2.5 (Frontend)</option>
                <option value="multi_agent">Multi-Agent Team (Orchestrated DAG)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Implement atomic idempotency key validation on /api/checkout or fix responsive navbar drawer"
              className="flex-1 rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] placeholder-[#9AA0A8] outline-none focus:border-[#D5222D]/50 focus:bg-white"
            />
            <button
              type="button"
              onClick={handlePreviewPlan}
              disabled={generatingPlan || !prompt}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-3.5 py-2 text-xs font-semibold text-[#17191C] hover:bg-[#E8EAED] transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D5222D]" />
              <span>{generatingPlan ? "Planning..." : "Preview DAG"}</span>
            </button>
            <button
              type="submit"
              disabled={dispatching}
              className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-[#D5222D] text-[#D5222D]" />
              <span>{dispatching ? "Executing Plan..." : "Execute"}</span>
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Plan Preview Modal */}
      {showPlanModal && planPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E8EAED] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#040404] text-white">
                  <Sparkles className="h-4 w-4 text-[#D5222D]" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#17191C]">Decomposed Multi-Agent Plan DAG</h3>
                  <p className="text-[11px] text-[#737982]">Target: {planPreview.projectName} • Branch: {planPreview.targetBranch}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="rounded-lg p-1 text-[#737982] hover:bg-[#F2F3F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-3 text-center">
                <p className="text-[10px] text-[#737982] font-semibold uppercase">Est. Tokens</p>
                <p className="text-base font-bold font-mono text-[#17191C] mt-0.5">
                  {formatNumber(planPreview.metrics.totalEstimatedTokens)}
                </p>
              </div>
              <div className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-3 text-center">
                <p className="text-[10px] text-[#737982] font-semibold uppercase">Est. Cost</p>
                <p className="text-base font-bold font-mono text-[#17191C] mt-0.5">
                  ${planPreview.metrics.estimatedCost}
                </p>
              </div>
              <div className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-3 text-center">
                <p className="text-[10px] text-[#737982] font-semibold uppercase">Est. Runtime</p>
                <p className="text-base font-bold font-mono text-[#17191C] mt-0.5">
                  ~{planPreview.metrics.estimatedDurationSec}s
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {planPreview.stages.map((stage: any, idx: number) => (
                <div key={stage.id} className="rounded-lg border border-[#E8EAED] bg-[#FFFFFF] p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#17191C]">{stage.name}</span>
                    <span className="font-mono text-[11px] text-[#D5222D] font-medium">{stage.agentName}</span>
                  </div>
                  <p className="text-[11px] text-[#737982]">{stage.description}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EAED]">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#737982] hover:bg-[#F2F3F5] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDispatch()}
                className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
              >
                <Play className="h-3.5 w-3.5 fill-[#D5222D] text-[#D5222D]" />
                Confirm & Launch Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Split: Left (Executions List) & Right (Execution Detail & Diff) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Executions History */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#737982] px-1">
            <span className="font-semibold text-[#17191C]">Recorded Executions</span>
            <span>{executions.length} runs</span>
          </div>

          <div className="space-y-2">
            {executions.map((exec) => {
              const isSelected = selectedExecution?.id === exec.id
              return (
                <div
                  key={exec.id}
                  onClick={() => setSelectedExecution(exec)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-[#17191C] bg-[#FFFFFF] shadow-sm ring-1 ring-[#17191C]/5"
                      : "border-[#E8EAED] bg-[#FFFFFF] hover:border-[#D2D6DC]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-[#17191C] line-clamp-2 leading-snug">
                      {exec.title}
                    </p>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                        exec.status === "completed"
                          ? "bg-[#EDF7F1] text-[#1F7A4D] border border-[#1F7A4D]/20"
                          : exec.status === "awaiting_approval"
                          ? "bg-[rgba(213,34,45,0.08)] text-[#D5222D] border border-[rgba(213,34,45,0.2)]"
                          : "bg-[#F2F3F5] text-[#737982]"
                      }`}
                    >
                      {exec.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#737982]">
                    <span className="flex items-center gap-1 font-mono">
                      <GitBranch className="h-3 w-3 text-[#9AA0A8]" />
                      {exec.targetBranch}
                    </span>
                    <span className="font-mono text-[#17191C]">
                      ${exec.estimatedCost?.toFixed(3) || "0.150"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Execution Workspace */}
        <div className="lg:col-span-8">
          {selectedExecution ? (
            <GlassCard className="p-0 border-[#E8EAED] bg-[#FFFFFF] shadow-xs overflow-hidden">
              {/* Header with Title and Approval Actions */}
              <div className="p-5 border-b border-[#E8EAED] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#17191C]">
                      {selectedExecution.title}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedExecution.status === "completed"
                          ? "bg-[#EDF7F1] text-[#1F7A4D]"
                          : selectedExecution.status === "awaiting_approval"
                          ? "bg-[rgba(213,34,45,0.08)] text-[#D5222D]"
                          : "bg-[#F2F3F5] text-[#737982]"
                      }`}
                    >
                      {selectedExecution.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737982] mt-1 font-mono">
                    Branch: {selectedExecution.targetBranch} • Tokens: {formatNumber(selectedExecution.totalTokens || 38400)} • Cost: ${selectedExecution.estimatedCost?.toFixed(4) || "0.1850"}
                  </p>
                </div>

                {/* Review Approval Controls */}
                {selectedExecution.status === "awaiting_approval" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprovalAction("reject")}
                      className="rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#737982] hover:bg-[#F2F3F5] hover:text-[#17191C]"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprovalAction("request_revision")}
                      className="rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => handleApprovalAction("approve")}
                      className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 text-[#1F7A4D]" />
                      Approve & Merge
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#E8EAED] bg-[#F8F9FB] px-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`py-3 px-3 border-b-2 transition-colors ${
                    activeTab === "diff"
                      ? "border-[#D5222D] text-[#17191C]"
                      : "border-transparent text-[#737982] hover:text-[#17191C]"
                  }`}
                >
                  Monaco Diff Review
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "comments"
                      ? "border-[#D5222D] text-[#17191C]"
                      : "border-transparent text-[#737982] hover:text-[#17191C]"
                  }`}
                >
                  <span>Line Comments</span>
                  {comments.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#17191C] text-[9px] text-white">
                      {comments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`py-3 px-3 border-b-2 transition-colors ${
                    activeTab === "activity"
                      ? "border-[#D5222D] text-[#17191C]"
                      : "border-transparent text-[#737982] hover:text-[#17191C]"
                  }`}
                >
                  Agent Activity & Terminal
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`py-3 px-3 border-b-2 transition-colors ${
                    activeTab === "tasks"
                      ? "border-[#D5222D] text-[#17191C]"
                      : "border-transparent text-[#737982] hover:text-[#17191C]"
                  }`}
                >
                  Orchestrated Task Graph
                </button>
                <button
                  onClick={() => setActiveTab("costs")}
                  className={`py-3 px-3 border-b-2 transition-colors ${
                    activeTab === "costs"
                      ? "border-[#D5222D] text-[#17191C]"
                      : "border-transparent text-[#737982] hover:text-[#17191C]"
                  }`}
                >
                  Resource Ledger
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5">
                {activeTab === "diff" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#737982] pb-2 border-b border-[#E8EAED]">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#D5222D]" />
                        <span className="font-mono text-[#17191C] font-semibold">
                          {diffArtifact?.path || "src/lib/services/api-client.ts"}
                        </span>
                        <span className="text-[11px] text-[#1F7A4D] font-medium">
                          +32 additions • -4 deletions
                        </span>
                      </div>

                      {/* Diff Editor Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDiffSideBySide(!diffSideBySide)}
                          className="rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#E8EAED]"
                        >
                          {diffSideBySide ? "Inline View" : "Side-by-Side"}
                        </button>
                        <button
                          onClick={() => setDiffTheme(diffTheme === "vs-dark" ? "light" : "vs-dark")}
                          className="rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#17191C] hover:bg-[#E8EAED]"
                        >
                          {diffTheme === "vs-dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("comments")
                            setNewCommentLine(15)
                          }}
                          className="flex items-center gap-1 rounded-lg bg-[#040404] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#202020]"
                        >
                          <MessageSquare className="h-3 w-3 text-[#D5222D]" />
                          Add Review Note
                        </button>
                      </div>
                    </div>

                    {/* Full Monaco Diff Editor Component */}
                    <div className="rounded-xl border border-[#E8EAED] overflow-hidden shadow-xs">
                      <DiffEditor
                        height="440px"
                        language="typescript"
                        original={originalCode}
                        modified={modifiedCode}
                        theme={diffTheme}
                        options={{
                          renderSideBySide: diffSideBySide,
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12.5,
                          fontFamily: "var(--font-geist-mono), monospace",
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Line Comments Tab */}
                {activeTab === "comments" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                      <h4 className="text-xs font-semibold text-[#17191C]">
                        Line-Level Review Comments & Directives
                      </h4>
                      <span className="text-xs text-[#737982] font-mono">
                        {comments.filter((c) => c.status === "open").length} open threads
                      </span>
                    </div>

                    {/* New Comment Box */}
                    <form onSubmit={handleAddComment} className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#17191C]">Comment on Line:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newCommentLine ?? ""}
                          onChange={(e) => setNewCommentLine(parseInt(e.target.value, 10))}
                          placeholder="e.g. 18"
                          className="w-20 rounded-md border border-[#E8EAED] bg-white px-2 py-1 text-xs font-mono outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Add suggestion, require guard check, or prompt agent revision..."
                          className="flex-1 rounded-lg border border-[#E8EAED] bg-white px-3 py-1.5 text-xs outline-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newCommentText}
                          className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] disabled:opacity-50"
                        >
                          <Send className="h-3 w-3 text-[#D5222D]" />
                          Post
                        </button>
                      </div>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-xl border p-3 text-xs space-y-1.5 transition-colors ${
                            c.status === "resolved"
                              ? "border-[#E8EAED] bg-[#F8F9FB] opacity-60"
                              : "border-[#17191C]/20 bg-white shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#17191C]">{c.authorName}</span>
                              <span className="font-mono text-[11px] rounded bg-[#F2F3F5] px-1.5 py-0.5 text-[#737982]">
                                Line {c.lineNumber}
                              </span>
                            </div>
                            {c.status !== "resolved" ? (
                              <button
                                onClick={() => handleResolveComment(c.id)}
                                className="flex items-center gap-1 text-[11px] font-medium text-[#1F7A4D] hover:underline"
                              >
                                <CheckSquare className="h-3 w-3" />
                                Resolve
                              </button>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-[#1F7A4D]">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-[#17191C] leading-relaxed">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[#17191C]">
                      Real-time Execution Telemetry & Terminal Logs
                    </h4>
                    <div className="space-y-2">
                      {(selectedExecution.events || []).map((ev: any, i: number) => {
                        let payload: any = {}
                        try {
                          payload = JSON.parse(ev.payloadJson)
                        } catch (e) {}

                        return (
                          <div
                            key={i}
                            className="rounded-lg border border-[#E8EAED] bg-[#F8F9FB] p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold uppercase text-[#D5222D]">
                                {ev.eventType}
                              </span>
                              <span className="text-[10px] text-[#9AA0A8]">
                                Seq #{ev.seq}
                              </span>
                            </div>

                            {ev.eventType === "terminal" ? (
                              <div className="mt-1 rounded bg-[#040404] p-2 text-[11px] font-mono text-zinc-300">
                                <p className="text-[#6E7891]">$ {payload.command}</p>
                                <p className="text-[#5FC08C] whitespace-pre-wrap">{payload.output}</p>
                              </div>
                            ) : ev.eventType === "file_change" ? (
                              <p className="text-[#17191C] font-mono text-[11px]">
                                Modified: <strong>{payload.path}</strong> (+{payload.linesAdded}, -{payload.linesRemoved})
                              </p>
                            ) : (
                              <p className="text-[#737982] font-mono text-[11px]">
                                Payload: {JSON.stringify(payload)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === "tasks" && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[#17191C]">
                      Multi-Agent Task Dependency Graph
                    </h4>
                    <div className="space-y-2.5">
                      {(selectedExecution.tasks || []).map((t: any, i: number) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-[#E8EAED] bg-[#FFFFFF] p-3 flex items-center justify-between shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F2F3F5] text-xs font-bold text-[#17191C]">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-[#17191C]">
                                {t.title}
                              </p>
                              <p className="text-[11px] text-[#737982]">
                                Agent: <strong>{t.agentName}</strong> ({t.agentRole})
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              t.status === "completed"
                                ? "bg-[#EDF7F1] text-[#1F7A4D]"
                                : "bg-[#F2F3F5] text-[#737982]"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "costs" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-4 space-y-1">
                      <p className="text-xs text-[#737982]">Input Token Consumption</p>
                      <p className="text-xl font-bold font-mono text-[#17191C]">
                        {formatNumber(selectedExecution.inputTokens || 28000)}
                      </p>
                      <p className="text-[11px] text-[#9AA0A8]">Repository AST & Context</p>
                    </div>

                    <div className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-4 space-y-1">
                      <p className="text-xs text-[#737982]">Output Token Generation</p>
                      <p className="text-xl font-bold font-mono text-[#17191C]">
                        {formatNumber(selectedExecution.outputTokens || 10400)}
                      </p>
                      <p className="text-[11px] text-[#9AA0A8]">Synthesized Source Code & Tests</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E8EAED] bg-[#FFFFFF] p-12 text-center text-xs text-[#737982]">
              Select an execution from the left panel to review its code changes and agent telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
