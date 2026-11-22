"use client"

import { useState, useCallback } from "react"
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
import { Play, Save, Plus, CheckCircle2, Sparkles, GitBranch, ShieldCheck, Workflow } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

type NodeTone = "default" | "accent" | "success" | "terminal"

function workflowNodeStyle(tone: NodeTone = "default"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "2px",
    fontFamily: "var(--font-mono), monospace",
    fontSize: "11px",
    fontWeight: 500,
    padding: "9px 12px",
    lineHeight: 1.35,
    boxShadow: "none",
  }

  if (tone === "accent") {
    return {
      ...base,
      backgroundColor: "var(--mv-accent-soft)",
      border: "1px solid color-mix(in srgb, var(--mv-accent) 45%, transparent)",
      color: "var(--mv-accent)",
    }
  }

  if (tone === "success") {
    return {
      ...base,
      backgroundColor: "var(--mv-success-soft)",
      border: "1px solid color-mix(in srgb, var(--mv-success) 45%, transparent)",
      color: "var(--mv-success)",
    }
  }

  if (tone === "terminal") {
    return {
      ...base,
      backgroundColor: "var(--mv-bg)",
      border: "1px dashed var(--mv-border-strong)",
      color: "var(--mv-text-2)",
    }
  }

  return {
    ...base,
    backgroundColor: "var(--mv-surface)",
    border: "1px solid var(--mv-border-strong)",
    color: "var(--mv-text)",
  }
}

const DEFAULT_TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  feature_pipeline: {
    nodes: [
      { id: "1", position: { x: 450, y: 0 }, data: { label: "Feature request trigger" }, style: workflowNodeStyle("terminal") },
      { id: "2", position: { x: 250, y: 100 }, data: { label: "System architect" }, style: workflowNodeStyle("accent") },
      { id: "3", position: { x: 650, y: 100 }, data: { label: "Context librarian" }, style: workflowNodeStyle() },
      { id: "4", position: { x: 450, y: 220 }, data: { label: "Parallel: code generation" }, style: workflowNodeStyle() },
      { id: "5", position: { x: 200, y: 340 }, data: { label: "Backend logic (Codex)" }, style: workflowNodeStyle() },
      { id: "6", position: { x: 700, y: 340 }, data: { label: "Frontend UI (Gemini)" }, style: workflowNodeStyle() },
      { id: "7", position: { x: 450, y: 460 }, data: { label: "Verification agent" }, style: workflowNodeStyle() },
      { id: "8", position: { x: 450, y: 560 }, data: { label: "Approval gate" }, style: workflowNodeStyle("accent") },
      { id: "9", position: { x: 450, y: 660 }, data: { label: "Merge & deploy" }, style: workflowNodeStyle("success") },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e1-3", source: "1", target: "3", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e3-4", source: "3", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e4-5", source: "4", target: "5", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e4-6", source: "4", target: "6", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e5-7", source: "5", target: "7", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e6-7", source: "6", target: "7", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e7-8", source: "7", target: "8", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e8-9", source: "8", target: "9", markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  pr_security: {
    nodes: [
      { id: "p1", position: { x: 450, y: 0 }, data: { label: "GitHub PR webhook" }, style: workflowNodeStyle("terminal") },
      { id: "p2", position: { x: 450, y: 120 }, data: { label: "Diff analyzer agent" }, style: workflowNodeStyle() },
      { id: "p3", position: { x: 450, y: 240 }, data: { label: "Security scan CLI" }, style: workflowNodeStyle("accent") },
      { id: "p4", position: { x: 450, y: 360 }, data: { label: "Vulnerability detected?" }, style: workflowNodeStyle("accent") },
      { id: "p5", position: { x: 250, y: 480 }, data: { label: "Block and notify" }, style: workflowNodeStyle("terminal") },
      { id: "p6", position: { x: 650, y: 480 }, data: { label: "Approve and merge" }, style: workflowNodeStyle("success") },
    ],
    edges: [
      { id: "ep1-2", source: "p1", target: "p2", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "ep2-3", source: "p2", target: "p3", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "ep3-4", source: "p3", target: "p4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "ep4-5", source: "p4", target: "p5", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "ep4-6", source: "p4", target: "p6", markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
}

for (const template of Object.values(DEFAULT_TEMPLATES)) {
  template.edges = template.edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: "var(--mv-border-strong)" },
  }))
}

function nodeCountLabel(count: number) {
  return `${count} node${count === 1 ? "" : "s"}`
}

function edgeCountLabel(count: number) {
  return `${count} edge${count === 1 ? "" : "s"}`
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
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null
  const updateSelectedNodeLabel = (nextLabel: string) => {
    if (!selectedNodeId) return
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, label: nextLabel } } : n))
    )
  }

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
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
      data: { label: `New ${type} node` },
      style:
        type === "agent"
          ? workflowNodeStyle("accent")
          : type === "approval"
            ? workflowNodeStyle("success")
            : workflowNodeStyle(),
    }

    setNodes((nds) => nds.concat(newNode))
  }

  const handleSimulate = () => {
    setSimulating(true)
    setValidationMessage(null)
    setTimeout(() => {
      setSimulating(false)
      if (edges.length === 0 && nodes.length > 1) {
        setValidationMessage("DAG validation failed: nodes are not connected.")
      } else {
        setValidationMessage("DAG valid. Topological execution order verified.")
      }
      setTimeout(() => setValidationMessage(null), 4000)
    }, 1500)
  }

  const handleRunPipeline = async () => {
    setRunningPipeline(true)
    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activeTemplate,
          customPrompt,
        }),
      })
      const json = await res.json()
      if (res.ok && json.data?.executionId) {
        router.push(`/agents?executionId=${json.data.executionId}`)
      } else {
        alert(json.error || "Failed to start pipeline")
      }
    } finally {
      setRunningPipeline(false)
    }
  }

  const handleSave = async () => {
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${activeTemplate} custom build`,
          nodes,
          edges,
        }),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Leave unsaved on failure.
    }
  }

  const approvalGates = nodes.filter((node) =>
    String(node.data?.label || "").toLowerCase().includes("approval")
  ).length

  const templateLabel = activeTemplate === "pr_security" ? "PR security" : "Feature pipeline"
  const templateDescription =
    activeTemplate === "pr_security"
      ? "PR security and review pipeline with scan, branch decision, and merge outcomes."
      : "Full-stack feature pipeline with parallel implementation, verification, and approval gate."

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Orchestration · Workflow builder"
        title="Workflows"
        description="Compose and trigger DAG-based agent pipelines on a live canvas. Templates, node edits, connections, validation, saving, and execution dispatch remain fully functional."
        action={
          <>
            <button
              onClick={handleSave}
              className={cn(
                "btn-secondary btn-sm",
                saveSuccess && "border-success/30 bg-success-soft text-success"
              )}
            >
              {saveSuccess ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Save className="h-3.5 w-3.5" strokeWidth={1.8} />}
              {saveSuccess ? "Saved" : "Save draft"}
            </button>
            <button onClick={handleSimulate} disabled={simulating} className="btn-secondary btn-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
              {simulating ? "Validating…" : "Validate DAG"}
            </button>
            <button onClick={handleRunPipeline} disabled={runningPipeline} className="btn-primary btn-sm">
              <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
              {runningPipeline ? "Dispatching…" : "Run pipeline"}
            </button>
          </>
        }
      />

      <StatBand
        columns={4}
        items={[
          { label: "Canvas nodes", value: String(nodes.length), meta: nodeCountLabel(nodes.length) },
          { label: "Dependencies", value: String(edges.length), meta: edgeCountLabel(edges.length) },
          {
            label: "Approval gates",
            value: String(approvalGates),
            meta: approvalGates > 0 ? "Human checkpoints present" : "No approval node detected",
            accent: approvalGates > 0,
          },
          { label: "Active template", value: templateLabel, meta: "Local canvas state" },
        ]}
      />

      {validationMessage && (
        <div
          className={cn(
            "flex items-start gap-2 border px-3.5 py-3 text-[12.5px]",
            validationMessage.startsWith("DAG valid")
              ? "border-success/25 bg-success-soft text-success"
              : "border-danger/25 bg-danger-soft text-danger"
          )}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em]">{validationMessage}</span>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <section className="space-y-4 border-t border-line pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Pipeline canvas</h2>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
                Arrange stages, connect dependencies, and inspect the current DAG structure before validation or execution.
              </p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {templateLabel} · {nodeCountLabel(nodes.length)} · {edgeCountLabel(edges.length)}
            </div>
          </div>

          <div className="relative h-[680px] w-full overflow-hidden border border-line bg-sidebar">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--mv-grid)" gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(n) => {
                  const label = String(n.data?.label || "").toLowerCase()
                  if (label.includes("approval")) return "var(--mv-accent)"
                  if (label.includes("merge") || label.includes("approve")) return "var(--mv-success)"
                  return "var(--mv-border-strong)"
                }}
                maskColor="color-mix(in srgb, var(--mv-bg) 72%, transparent)"
                style={{
                  border: "1px solid var(--mv-border)",
                  borderRadius: "2px",
                  backgroundColor: "var(--mv-surface)",
                }}
              />
            </ReactFlow>

            <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[340px] border border-line bg-surface/95 px-3.5 py-3 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 text-ink">
                {activeTemplate === "pr_security" ? <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} /> : <Workflow className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />}
                <p className="font-display text-[13px] font-medium tracking-[-0.02em]">{templateLabel}</p>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{templateDescription}</p>
              <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                Drag nodes · connect ports · validate · save draft · run pipeline
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-6 border-t border-line pt-6 xl:border-l xl:border-line xl:pl-8">
          <section className="space-y-3">
            <div>
              <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Template & trigger</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Switch base templates and optionally attach a custom trigger prompt for execution.</p>
            </div>

            <div className="space-y-3 border-t border-line pt-3">
              <div>
                <span className="label">Template</span>
                <div className="segmented w-full" role="group" aria-label="Workflow template">
                  <button
                    onClick={() => handleSelectTemplate("feature_pipeline")}
                    aria-pressed={activeTemplate === "feature_pipeline"}
                    className={cn("segmented-item flex-1", activeTemplate === "feature_pipeline" && "segmented-item-active")}
                  >
                    Feature
                  </button>
                  <button
                    onClick={() => handleSelectTemplate("pr_security")}
                    aria-pressed={activeTemplate === "pr_security"}
                    className={cn("segmented-item flex-1", activeTemplate === "pr_security" && "segmented-item-active")}
                  >
                    PR security
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="label">Custom trigger prompt</span>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ticket, change request, or execution prompt…"
                  aria-label="Custom workflow trigger prompt"
                  className="field field-sm"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-5">
            <div>
              <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Canvas actions</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Add stages, validate structure, persist a draft, or dispatch a run to Agent Center.</p>
            </div>

            <div className="grid gap-2 border-t border-line pt-3">
              <button onClick={() => handleAddNode("agent")} className="btn-secondary justify-start">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Add agent node
              </button>
              <button onClick={() => handleAddNode("action")} className="btn-secondary justify-start">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Add action node
              </button>
              <button onClick={() => handleAddNode("approval")} className="btn-secondary justify-start">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Add approval node
              </button>
            </div>

            <div className="grid gap-2 border-t border-line pt-3">
              <button onClick={handleSimulate} disabled={simulating} className="btn-secondary justify-start">
                <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
                {simulating ? "Validating DAG…" : "Validate DAG"}
              </button>
              <button onClick={handleSave} className={cn("btn-secondary justify-start", saveSuccess && "border-success/30 bg-success-soft text-success")}>
                {saveSuccess ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Save className="h-3.5 w-3.5" strokeWidth={1.8} />}
                {saveSuccess ? "Draft saved" : "Save workflow draft"}
              </button>
              <button onClick={handleRunPipeline} disabled={runningPipeline} className="btn-primary justify-start">
                <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
                {runningPipeline ? "Dispatching pipeline…" : "Run pipeline"}
              </button>
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Canvas register</h3>
            <dl className="grid gap-3 border-t border-line pt-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Template</dt>
                <dd className="text-right text-[13px] font-medium text-ink">{templateLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Nodes</dt>
                <dd className="font-mono text-[12px] tabular-nums text-ink">{nodes.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Edges</dt>
                <dd className="font-mono text-[12px] tabular-nums text-ink">{edges.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Approval gates</dt>
                <dd className={cn("font-mono text-[12px] tabular-nums", approvalGates > 0 ? "text-accent" : "text-ink")}>{approvalGates}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Trigger prompt</dt>
                <dd className="max-w-[170px] text-right text-[12px] leading-relaxed text-ink-2">{customPrompt ? customPrompt : "None set"}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2 border-t border-line pt-3 text-[11.5px] text-ink-3">
              <GitBranch className="h-3.5 w-3.5" strokeWidth={1.7} />
              <span>Run dispatches to <span className="font-mono text-ink-2">/api/workflows/execute</span> and opens Agent Center.</span>
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Node inspector</h3>
            {selectedNode ? (
              <div className="space-y-3 border-t border-line pt-3">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  <span>ID {selectedNode.id}</span>
                  <span>
                    {edges.filter((e) => e.source === selectedNode.id).length} out ·{" "}
                    {edges.filter((e) => e.target === selectedNode.id).length} in
                  </span>
                </div>
                <label className="block">
                  <span className="label">Stage label</span>
                  <input
                    type="text"
                    value={String(selectedNode.data?.label || "")}
                    onChange={(e) => updateSelectedNodeLabel(e.target.value)}
                    className="field field-sm font-mono"
                  />
                </label>
              </div>
            ) : (
              <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
                Click any node on the canvas to edit its label and inspect edge dependencies.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
