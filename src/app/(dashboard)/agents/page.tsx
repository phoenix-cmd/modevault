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
} from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<"activity" | "diff" | "tasks" | "costs">("diff")
  const [loading, setLoading] = useState(true)

  // Dispatch prompt state
  const [selectedProject, setSelectedProject] = useState(initialProjectId || "")
  const [selectedAgent, setSelectedAgent] = useState("agent_claude_code")
  const [prompt, setPrompt] = useState("")
  const [dispatching, setDispatching] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

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
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt || !selectedProject) return

    setDispatching(true)
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

  const diffArtifact = selectedExecution?.artifacts?.find((a: any) => a.type === "git_diff")

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

          <div className="flex gap-2">
            <input
              type="text"
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Implement atomic idempotency key validation on /api/checkout or fix responsive navbar drawer"
              className="flex-1 rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] placeholder-[#9AA0A8] outline-none focus:border-[#D5222D]/50 focus:bg-white"
            />
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
                  Source Git Diff
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
                    <div className="flex items-center justify-between text-xs text-[#737982]">
                      <span className="font-mono text-[#17191C] font-semibold">
                        {diffArtifact?.path || "src/app/api/checkout/route.ts"}
                      </span>
                      <span className="text-[11px] text-[#1F7A4D] font-medium">
                        +32 additions • -4 deletions
                      </span>
                    </div>

                    {/* Diff viewer with syntax and additions/deletions highlighting */}
                    <div className="rounded-xl border border-[#E8EAED] bg-[#040404] text-[#FDFDFD] font-mono text-[11.5px] p-4 overflow-x-auto leading-relaxed shadow-inner">
                      <pre className="text-zinc-300">
                        {(diffArtifact?.content || "No diff artifact recorded yet.")
                          .split("\n")
                          .map((line: string, idx: number) => {
                            const isAdd = line.startsWith("+") && !line.startsWith("+++")
                            const isDel = line.startsWith("-") && !line.startsWith("---")
                            const isHeader = line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")

                            return (
                              <div
                                key={idx}
                                className={`px-2 py-0.5 rounded-xs ${
                                  isAdd
                                    ? "bg-[#1F7A4D]/25 text-[#5FC08C]"
                                    : isDel
                                    ? "bg-[#D5222D]/25 text-[#F0786E]"
                                    : isHeader
                                    ? "text-[#6E7891] font-semibold"
                                    : "text-zinc-300"
                                }`}
                              >
                                {line}
                              </div>
                            )
                          })}
                      </pre>
                    </div>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[#17191C]">
                      Real-time Execution Telemetry
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
                                Tool: {payload.tool || "ast_inspection"}
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
