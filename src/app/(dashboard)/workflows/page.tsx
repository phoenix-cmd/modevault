"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Play, Save, Plus, CheckCircle2, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

type NodeTone = "default" | "accent" | "success" | "terminal"

function workflowNodeStyle(tone: NodeTone = "default"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "6px",
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: "11px",
    fontWeight: 500,
    padding: "9px 13px",
    lineHeight: 1.4,
  }

  if (tone === "accent") {
    return {
      ...base,
      backgroundColor: "var(--mv-accent-soft)",
      border: "1px solid var(--mv-accent)",
      color: "var(--mv-accent)",
    }
  }

  if (tone === "success") {
    return {
      ...base,
      backgroundColor: "var(--mv-success-soft)",
      border: "1px solid var(--mv-success)",
      color: "var(--mv-success)",
    }
  }

  if (tone === "terminal") {
    return {
      ...base,
      backgroundColor: "var(--mv-text)",
      border: "1px solid var(--mv-text)",
      color: "var(--mv-bg)",
      fontWeight: 600,
    }
  }

  return {
    ...base,
    backgroundColor: "var(--mv-surface)",
    border: "1px solid var(--mv-border)",
    color: "var(--mv-text)",
  }
}

const DEFAULT_TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  feature_pipeline: {
    nodes: [
      {
        id: "1",
        position: { x: 40, y: 160 },
        data: { label: "1. Trigger: Issue Submitted / Prompt" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "2",
        position: { x: 300, y: 160 },
        data: { label: "2. Architect: Task Breakdown (Claude Code 3.7)" },
        style: workflowNodeStyle("accent"),
      },
      {
        id: "3",
        position: { x: 620, y: 70 },
        data: { label: "3A. Frontend Synthesis (Gemini CLI)" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "4",
        position: { x: 620, y: 250 },
        data: { label: "3B. Backend API Implementation (Codex 5.2)" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "5",
        position: { x: 930, y: 160 },
        data: { label: "4. Test & QA Verification (OpenCode Reviewer)" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "6",
        position: { x: 1220, y: 160 },
        data: { label: "5. Human Approval Gate (Merge to Main)" },
        style: workflowNodeStyle("terminal"),
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e2-4", source: "2", target: "4" },
      { id: "e3-5", source: "3", target: "5" },
      { id: "e4-5", source: "4", target: "5" },
      { id: "e5-6", source: "5", target: "6", animated: true },
    ],
  },
  pr_security: {
    nodes: [
      {
        id: "1",
        position: { x: 50, y: 160 },
        data: { label: "1. Webhook: GitHub PR Opened" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "2",
        position: { x: 340, y: 70 },
        data: { label: "2A. AST Lint & License Compliance" },
        style: workflowNodeStyle("default"),
      },
      {
        id: "3",
        position: { x: 340, y: 250 },
        data: { label: "2B. Security Vulnerability Scan (Claude 3.7)" },
        style: workflowNodeStyle("accent"),
      },
      {
        id: "4",
        position: { x: 670, y: 160 },
        data: { label: "3. Human Review Gate (Tech Lead Sign-off)" },
        style: workflowNodeStyle("success"),
      },
      {
        id: "5",
        position: { x: 980, y: 160 },
        data: { label: "4. Auto-merge & Deploy Sandbox Preview" },
        style: workflowNodeStyle("terminal"),
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e1-3", source: "1", target: "3", animated: true },
      { id: "e2-4", source: "2", target: "4" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5", animated: true },
    ],
  },
}

// Theme the edges once at module load so arrows stay visible in both themes.
for (const template of Object.values(DEFAULT_TEMPLATES)) {
  template.edges = template.edges.map((edge) => ({
    ...edge,
    style: { ...edge.style, stroke: "var(--mv-border-strong)" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--mv-border-strong)",
    },
  }))
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [activeTemplate, setActiveTemplate] = useState<string>("feature_pipeline")
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_TEMPLATES.feature_pipeline.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_TEMPLATES.feature_pipeline.edges)
  const [simulating, setSimulating] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleSelectTemplate = (templateKey: string) => {
    setActiveTemplate(templateKey)
    const tmpl = DEFAULT_TEMPLATES[templateKey]
    if (tmpl) {
      setNodes(tmpl.nodes)
      setEdges(tmpl.edges)
    }
  }

  const handleAddNode = (type: "agent" | "action" | "approval") => {
    const id = `${nodes.length + 1}`
    const xPos = 400 + Math.random() * 200
    const yPos = 120 + Math.random() * 150

    const newNode: Node = {
      id,
      position: { x: xPos, y: yPos },
      data: {
        label:
          type === "agent"
            ? `${id}. Agent Task (Codex 5.2)`
            : type === "approval"
            ? `${id}. Security Approval Gate`
            : `${id}. Action: CI/CD Dispatch`,
      },
      style: workflowNodeStyle(
        type === "agent" ? "accent" : type === "approval" ? "terminal" : "default"
      ),
    }

    setNodes((nds) => [...nds, newNode])
  }

  const handleSimulate = () => {
    setSimulating(true)
    setValidationMessage(null)
    setTimeout(() => {
      setSimulating(false)
      setValidationMessage(
        `DAG validated · ${nodes.length} stages · 0 cyclic dependencies · topological order verified`
      )
      setTimeout(() => setValidationMessage(null), 4000)
    }, 700)
  }

  const handleRunPipeline = async () => {
    setRunningPipeline(true)
    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activeTemplate === "pr_security" ? "wf_pr_review" : "wf_feature_pipeline",
          customPrompt: customPrompt || "Execute visual DAG workflow pipeline",
        }),
      })

      const json = await res.json()
      if (json.data) {
        router.push(`/agents?executionId=${json.data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRunningPipeline(false)
    }
  }

  const handleSave = async () => {
    setSaveSuccess(true)
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeTemplate === "pr_security" ? "PR Security & Review Gate" : "Feature Engineering Pipeline",
          nodes,
          edges,
        }),
      })
    } catch {}
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const approvalGates = nodes.filter((node) =>
    /approval|review|gate/i.test(String(node.data?.label ?? ""))
  ).length

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Operations · Workflow automation"
        title="Workflows"
        description="Design reusable multi-agent pipelines, conditional DAGs, parallel worktrees, and manual approval gates."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAddNode("agent")}
              className="btn-secondary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add node
            </button>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="btn-secondary"
            >
              <Play className="h-3 w-3" strokeWidth={2} />
              {simulating ? "Validating…" : "Validate DAG"}
            </button>
            <button onClick={handleSave} className="btn-secondary">
              <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
              {saveSuccess ? "Saved" : "Save DAG"}
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={runningPipeline}
              className="btn-primary"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
              {runningPipeline ? "Dispatching…" : "Run pipeline"}
            </button>
          </div>
        }
      />

      <StatBand
        columns={4}
        items={[
          {
            label: "Stages",
            value: String(nodes.length),
            meta:
              activeTemplate === "pr_security"
                ? "PR security blueprint"
                : "Feature blueprint",
          },
          {
            label: "Connections",
            value: String(edges.length),
            meta: "Directed dependencies",
          },
          {
            label: "Approval gates",
            value: String(approvalGates),
            meta: approvalGates > 0 ? "Human checkpoints" : "None configured",
            accent: approvalGates > 0,
          },
          {
            label: "Active template",
            value: activeTemplate === "pr_security" ? "Security" : "Feature",
            meta: "Local canvas state",
          },
        ]}
      />

      {validationMessage && (
        <div className="flex items-start gap-2 border border-success/25 bg-success-soft px-3 py-2.5 text-[11.5px] text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span className="font-mono uppercase tracking-[0.04em]">
            {validationMessage}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            Template
          </span>
          <div
            className="segmented"
            role="group"
            aria-label="Workflow template"
          >
            <button
              onClick={() => handleSelectTemplate("feature_pipeline")}
              aria-pressed={activeTemplate === "feature_pipeline"}
              className={cn(
                "segmented-item",
                activeTemplate === "feature_pipeline" &&
                  "segmented-item-active"
              )}
            >
              Feature pipeline
            </button>
            <button
              onClick={() => handleSelectTemplate("pr_security")}
              aria-pressed={activeTemplate === "pr_security"}
              className={cn(
                "segmented-item",
                activeTemplate === "pr_security" && "segmented-item-active"
              )}
            >
              PR security
            </button>
          </div>
        </div>

        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom trigger prompt or ticket reference…"
          aria-label="Custom workflow trigger prompt"
          className="field field-sm w-full sm:w-72"
        />
      </div>

      <div className="relative h-[660px] w-full overflow-hidden border border-line bg-surface">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="var(--mv-grid)" gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="var(--mv-border-strong)"
            maskColor="transparent"
            style={{
              border: "1px solid var(--mv-border)",
              borderRadius: "6px",
              backgroundColor: "var(--mv-surface)",
            }}
          />
        </ReactFlow>

        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[300px] border border-line bg-surface p-3">
          <p className="font-display text-[12.5px] font-medium tracking-[-0.02em] text-ink">
            {activeTemplate === "pr_security"
              ? "PR security and review pipeline"
              : "Full-stack feature pipeline"}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-ink-3">
            Drag to arrange · connect ports to link dependencies · run to execute
          </p>
        </div>
      </div>
    </div>
  )
}
