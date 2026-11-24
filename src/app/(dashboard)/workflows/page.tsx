"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import type { Edge, Node } from "@xyflow/react"
import {
  Play,
  Save,
  Plus,
  CheckCircle2,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Workflow,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Trash2,
  ArrowRight,
  X,
  AlertTriangle,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
import { validateAndSortDag, type DagEdgeInput, type DagNodeInput } from "@/lib/dag-engine"
import { useMediaQuery } from "@/lib/use-media-query"
import { useModalA11y } from "@/lib/use-modal-a11y"
import { cn } from "@/lib/utils"

const WorkflowCanvas = dynamic(
  () => import("@/components/workflows/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Loading workflow canvas…
      </div>
    ),
  }
)

type NodeTone = "default" | "accent" | "success" | "terminal"

interface GraphSnapshot {
  nodes: Node[]
  edges: Edge[]
}

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

function makeEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}-${Date.now()}`,
    source,
    target,
    markerEnd: { type: "arrowclosed" } as Edge["markerEnd"],
    animated: true,
    style: { stroke: "var(--mv-border-strong)" },
  }
}

function cloneSnapshot(nodes: Node[], edges: Edge[]): GraphSnapshot {
  return {
    nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
    edges: edges.map((e) => ({ ...e })),
  }
}

const DEFAULT_TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  feature_pipeline: {
    nodes: [
      { id: "1", position: { x: 450, y: 0 }, data: { label: "Feature request trigger", tone: "terminal" }, style: workflowNodeStyle("terminal") },
      { id: "2", position: { x: 250, y: 100 }, data: { label: "System architect", tone: "accent" }, style: workflowNodeStyle("accent") },
      { id: "3", position: { x: 650, y: 100 }, data: { label: "Context librarian", tone: "default" }, style: workflowNodeStyle() },
      { id: "4", position: { x: 450, y: 220 }, data: { label: "Parallel: code generation", tone: "default" }, style: workflowNodeStyle() },
      { id: "5", position: { x: 200, y: 340 }, data: { label: "Backend logic (Codex)", tone: "default" }, style: workflowNodeStyle() },
      { id: "6", position: { x: 700, y: 340 }, data: { label: "Frontend UI (Gemini)", tone: "default" }, style: workflowNodeStyle() },
      { id: "7", position: { x: 450, y: 460 }, data: { label: "Verification agent", tone: "default" }, style: workflowNodeStyle() },
      { id: "8", position: { x: 450, y: 560 }, data: { label: "Approval gate", tone: "accent" }, style: workflowNodeStyle("accent") },
      { id: "9", position: { x: 450, y: 660 }, data: { label: "Merge & deploy", tone: "success" }, style: workflowNodeStyle("success") },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e1-3", source: "1", target: "3", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e2-4", source: "2", target: "4", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e3-4", source: "3", target: "4", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e4-5", source: "4", target: "5", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e4-6", source: "4", target: "6", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e5-7", source: "5", target: "7", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e6-7", source: "6", target: "7", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e7-8", source: "7", target: "8", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "e8-9", source: "8", target: "9", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
    ],
  },
  pr_security: {
    nodes: [
      { id: "p1", position: { x: 450, y: 0 }, data: { label: "GitHub PR webhook", tone: "terminal" }, style: workflowNodeStyle("terminal") },
      { id: "p2", position: { x: 450, y: 120 }, data: { label: "Diff analyzer agent", tone: "default" }, style: workflowNodeStyle() },
      { id: "p3", position: { x: 450, y: 240 }, data: { label: "Security scan CLI", tone: "accent" }, style: workflowNodeStyle("accent") },
      { id: "p4", position: { x: 450, y: 360 }, data: { label: "Vulnerability detected?", tone: "accent" }, style: workflowNodeStyle("accent") },
      { id: "p5", position: { x: 250, y: 480 }, data: { label: "Block and notify", tone: "terminal" }, style: workflowNodeStyle("terminal") },
      { id: "p6", position: { x: 650, y: 480 }, data: { label: "Approve and merge", tone: "success" }, style: workflowNodeStyle("success") },
    ],
    edges: [
      { id: "ep1-2", source: "p1", target: "p2", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "ep2-3", source: "p2", target: "p3", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "ep3-4", source: "p3", target: "p4", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "ep4-5", source: "p4", target: "p5", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
      { id: "ep4-6", source: "p4", target: "p6", markerEnd: { type: "arrowclosed" } as Edge["markerEnd"] },
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
  const isTabletOrUp = useMediaQuery("(min-width: 768px)")
  const isXlUp = useMediaQuery("(min-width: 1280px)")

  const [activeTemplate, setActiveTemplate] = useState<string>("feature_pipeline")
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_TEMPLATES.feature_pipeline.nodes)
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_TEMPLATES.feature_pipeline.edges)

  const [past, setPast] = useState<GraphSnapshot[]>([])
  const [future, setFuture] = useState<GraphSnapshot[]>([])
  const dragSnapshotRef = useRef<GraphSnapshot | null>(null)
  const labelEditSnapshotRef = useRef<GraphSnapshot | null>(null)

  const [simulating, setSimulating] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [workflowName, setWorkflowName] = useState("")
  const [savedWorkflows, setSavedWorkflows] = useState<
    Array<{ id: string; name: string; nodesJson: string; edgesJson: string; isTemplate?: boolean }>
  >([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedSavedId, setSelectedSavedId] = useState<string>("")
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectTargetId, setConnectTargetId] = useState<string>("")

  const [viewModeOverride, setViewModeOverride] = useState<"stages" | "canvas" | null>(null)
  const effectiveViewMode = viewModeOverride ?? (isTabletOrUp ? "canvas" : "stages")

  const [inspectorOverride, setInspectorOverride] = useState<boolean | null>(null)
  const inspectorOpen = inspectorOverride ?? isXlUp

  const mobileSheetOpen = !isTabletOrUp && Boolean(selectedNodeId)
  const mobileSheetRef = useModalA11y(mobileSheetOpen, () => setSelectedNodeId(null))

  const pushHistory = useCallback((snapshot: GraphSnapshot) => {
    setPast((prev) => [...prev.slice(-39), cloneSnapshot(snapshot.nodes, snapshot.edges)])
    setFuture([])
  }, [])

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast
      const previous = prevPast[prevPast.length - 1]
      setFuture((prevFuture) => [cloneSnapshot(nodes, edges), ...prevFuture.slice(0, 39)])
      setNodes(previous.nodes)
      setEdges(previous.edges)
      return prevPast.slice(0, -1)
    })
  }, [nodes, edges])

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture
      const next = prevFuture[0]
      setPast((prevPast) => [...prevPast.slice(-39), cloneSnapshot(nodes, edges)])
      setNodes(next.nodes)
      setEdges(next.edges)
      return prevFuture.slice(1)
    })
  }, [nodes, edges])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      } else if ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y") {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleUndo, handleRedo])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : []
  const incomingCount = selectedNode ? edges.filter((e) => e.target === selectedNode.id).length : 0
  const connectableTargets = selectedNode
    ? nodes.filter((n) => n.id !== selectedNode.id && !edges.some((e) => e.source === selectedNode.id && e.target === n.id))
    : []

  const updateSelectedNodeLabel = (nextLabel: string) => {
    if (!selectedNodeId) return
    if (labelEditSnapshotRef.current) {
      pushHistory(labelEditSnapshotRef.current)
      labelEditSnapshotRef.current = null
    }
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, label: nextLabel } } : n))
    )
  }

  const updateSelectedNodeTone = (nextTone: NodeTone) => {
    if (!selectedNodeId) return
    pushHistory({ nodes, edges })
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...n.data, tone: nextTone }, style: workflowNodeStyle(nextTone) }
          : n
      )
    )
  }

  const handleConnectEdge = useCallback(
    (source: string, target: string) => {
      if (!source || !target || source === target) return
      setEdges((eds) => {
        if (eds.some((e) => e.source === source && e.target === target)) return eds
        pushHistory({ nodes, edges: eds })
        return [...eds, makeEdge(source, target)]
      })
    },
    [nodes, pushHistory]
  )

  const handleRemoveEdge = (edgeId: string) => {
    pushHistory({ nodes, edges })
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
  }

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return
    pushHistory({ nodes, edges })
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId))
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const handleSelectTemplate = (templateKey: string) => {
    const tmpl = DEFAULT_TEMPLATES[templateKey]
    if (!tmpl) return
    pushHistory({ nodes, edges })
    setActiveTemplate(templateKey)
    setSelectedNodeId(null)
    const cloned = cloneSnapshot(tmpl.nodes, tmpl.edges)
    setNodes(cloned.nodes)
    setEdges(cloned.edges)
  }

  const handleAddNode = (type: "agent" | "action" | "approval") => {
    pushHistory({ nodes, edges })
    const numericIds = nodes.map((n) => parseInt(n.id.replace(/\D/g, ""), 10) || 0)
    const nextId = `n-${Math.max(0, ...numericIds) + 1}-${Date.now().toString().slice(-3)}`
    const xPos = 320 + (nodes.length % 3) * 140
    const yPos = 100 + Math.min(nodes.length, 6) * 85
    const tone: NodeTone = type === "agent" ? "accent" : type === "approval" ? "success" : "default"

    const newNode: Node = {
      id: nextId,
      position: { x: xPos, y: yPos },
      data: { label: `New ${type} node`, tone },
      style: workflowNodeStyle(tone),
    }

    setNodes((nds) => nds.concat(newNode))
    setSelectedNodeId(nextId)
  }

  const loadSavedWorkflows = useCallback(async () => {
    try {
      const [res, projRes] = await Promise.all([
        fetch("/api/workflows"),
        fetch("/api/projects").catch(() => null),
      ])
      const json = await res.json()
      const projJson = projRes ? await projRes.json().catch(() => null) : null
      if (res.ok && Array.isArray(json?.data)) {
        setSavedWorkflows(json.data.filter((w: { isTemplate?: boolean }) => !w.isTemplate))
      }
      if (Array.isArray(projJson?.data)) {
        setProjects(projJson.data)
        if (projJson.data.length > 0) {
          setSelectedProjectId((cur) => cur || projJson.data[0].id)
        }
      }
    } catch {
      // Ignore load errors
    }
  }, [])

  useEffect(() => {
    loadSavedWorkflows()
  }, [loadSavedWorkflows])

  const handleLoadSavedWorkflow = (wfId: string) => {
    setSelectedSavedId(wfId)
    const found = savedWorkflows.find((w) => w.id === wfId)
    if (!found) return
    try {
      const parsedNodes = JSON.parse(found.nodesJson || "[]") as Node[]
      const parsedEdges = JSON.parse(found.edgesJson || "[]") as Edge[]
      if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
        pushHistory({ nodes, edges })
        setNodes(parsedNodes)
        setEdges(Array.isArray(parsedEdges) ? parsedEdges : [])
        setWorkflowName(found.name)
        setSelectedNodeId(null)
      }
    } catch {
      // Ignore malformed graph JSON
    }
  }

  const handleDeleteSavedWorkflow = async (wfId: string) => {
    try {
      const res = await fetch(`/api/workflows?id=${encodeURIComponent(wfId)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        if (selectedSavedId === wfId) setSelectedSavedId("")
        await loadSavedWorkflows()
      }
    } catch {
      // Ignore
    }
  }

  const handleSimulate = () => {
    setSimulating(true)
    setValidationMessage(null)
    const result = validateAndSortDag(
      nodes as unknown as DagNodeInput[],
      edges as unknown as DagEdgeInput[]
    )
    setSimulating(false)
    if (!result.valid) {
      setValidationMessage(`DAG validation failed: ${result.errors.join(" ")}`)
    } else if (result.warnings.length > 0) {
      setValidationMessage(
        `DAG valid (${result.layers.length} layers, ${result.order.length} nodes) — Warning: ${result.warnings.join(" ")}`
      )
    } else {
      setValidationMessage(
        `DAG valid: ${result.order.length} nodes sorted into ${result.layers.length} topological execution layer(s).`
      )
    }
    window.setTimeout(() => setValidationMessage(null), 5000)
  }

  const handleRunPipeline = async () => {
    setRunningPipeline(true)
    setRunError(null)
    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedSavedId || activeTemplate,
          workflowName: workflowName.trim() || templateLabel,
          ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
          customPrompt,
          nodes,
          edges,
        }),
      })
      const json = await res.json()
      const execId = json.data?.executionId || json.data?.id
      if (res.ok && execId) {
        router.push(`/agents?executionId=${encodeURIComponent(execId)}`)
      } else {
        setRunError(json.error || "Failed to start pipeline")
      }
    } catch {
      setRunError("Failed to dispatch workflow execution")
    } finally {
      setRunningPipeline(false)
    }
  }

  const handleSave = async () => {
    setRunError(null)
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedSavedId ? { id: selectedSavedId } : {}),
          name: workflowName.trim() || `${activeTemplate} build`,
          nodes,
          edges,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRunError(json.error || "Failed to save workflow")
        return
      }
      setSaveSuccess(true)
      if (json.data?.id) setSelectedSavedId(json.data.id)
      await loadSavedWorkflows()
      window.setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setRunError("Failed to save workflow")
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

  const inspectorControls = (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Template &amp; trigger</h3>
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
            <span className="label">Target project</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              aria-label="Target project for workflow execution"
              className="select select-sm"
            >
              {projects.length === 0 && <option value="">Default workspace project</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Workflow name</span>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder={`${activeTemplate} build`}
              aria-label="Workflow name"
              className="field field-sm"
            />
          </label>

          {savedWorkflows.length > 0 && (
            <div className="space-y-1.5">
              <span className="label">Saved workflows ({savedWorkflows.length})</span>
              <div className="flex gap-1.5">
                <select
                  value={selectedSavedId}
                  onChange={(e) => handleLoadSavedWorkflow(e.target.value)}
                  aria-label="Load saved workflow"
                  className="select select-sm flex-1 text-[11.5px]"
                >
                  <option value="">Select saved graph…</option>
                  {savedWorkflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
                {selectedSavedId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedWorkflow(selectedSavedId)}
                    className="icon-btn shrink-0 hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                    title="Delete saved workflow"
                    aria-label="Delete saved workflow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

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
          <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Add nodes</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Insert stages into the workflow graph or timeline.</p>
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
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Node inspector</h3>
        {selectedNode ? (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              <span>ID {selectedNode.id}</span>
              <span>
                {outgoingEdges.length} out · {incomingCount} in
              </span>
            </div>

            <label className="block">
              <span className="label">Stage label</span>
              <input
                type="text"
                value={String(selectedNode.data?.label || "")}
                onFocus={() => {
                  labelEditSnapshotRef.current = cloneSnapshot(nodes, edges)
                }}
                onChange={(e) => updateSelectedNodeLabel(e.target.value)}
                onBlur={() => {
                  labelEditSnapshotRef.current = null
                }}
                className="field field-sm font-mono"
              />
            </label>

            <div>
              <span className="label">Node role</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "default", label: "Standard" },
                    { id: "accent", label: "Agent / Gate" },
                    { id: "success", label: "Approval" },
                    { id: "terminal", label: "Trigger" },
                  ] as const
                ).map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => updateSelectedNodeTone(tone.id)}
                    aria-pressed={(selectedNode.data?.tone || "default") === tone.id}
                    className={cn(
                      "btn-secondary btn-sm justify-center",
                      (selectedNode.data?.tone || "default") === tone.id && "border-accent bg-accent-soft text-accent"
                    )}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <span className="label">Outgoing connections ({outgoingEdges.length})</span>
              {outgoingEdges.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {outgoingEdges.map((edge) => {
                    const targetNode = nodes.find((n) => n.id === edge.target)
                    return (
                      <li key={edge.id} className="flex items-center justify-between gap-2 border border-line bg-canvas px-2.5 py-1.5 font-mono text-[10.5px]">
                        <span className="truncate text-ink-2">→ {String(targetNode?.data?.label || edge.target)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEdge(edge.id)}
                          className="shrink-0 text-ink-3 hover:text-danger"
                          aria-label={`Disconnect from ${String(targetNode?.data?.label || edge.target)}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {connectableTargets.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={connectTargetId || connectableTargets[0]?.id || ""}
                    onChange={(e) => setConnectTargetId(e.target.value)}
                    aria-label="Connect to downstream stage"
                    className="select select-sm flex-1 font-mono text-[11px]"
                  >
                    {connectableTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {String(target.data?.label || target.id)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const target = connectTargetId || connectableTargets[0]?.id
                      if (target) {
                        handleConnectEdge(selectedNode.id, target)
                        setConnectTargetId("")
                      }
                    }}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    Link
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleDeleteSelectedNode}
              className="btn-ghost btn-sm w-full justify-start text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove node
            </button>
          </div>
        ) : (
          <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
            Select any node on the canvas or stage list to edit its label, role, and connections.
          </p>
        )}
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
        </dl>
        <div className="flex items-center gap-2 border-t border-line pt-3 text-[11.5px] text-ink-3">
          <GitBranch className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
          <span>Run dispatches to <span className="font-mono text-ink-2">/api/workflows/execute</span>.</span>
        </div>
      </section>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Orchestration · Workflow builder"
        title="Workflows"
        description="Compose, validate, and execute topological DAG agent pipelines across interactive canvas or responsive stage views."
        badge={
          <span className="badge bg-surface-2 text-ink-2">
            Topological DAG Runner · In-process execution
          </span>
        }
        action={
          <>
            <button
              type="button"
              onClick={handleUndo}
              disabled={past.length === 0}
              className="btn-secondary btn-sm"
              aria-label="Undo workflow edit"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="btn-secondary btn-sm"
              aria-label="Redo workflow edit"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="hidden sm:inline">Redo</span>
            </button>
            <button
              onClick={() => setInspectorOverride(!inspectorOpen)}
              className="btn-secondary btn-sm hidden md:inline-flex"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
              {inspectorOpen ? "Hide inspector" : "Inspector"}
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "btn-secondary btn-sm",
                saveSuccess && "border-success/30 bg-success-soft text-success"
              )}
            >
              {saveSuccess ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Save className="h-3.5 w-3.5" strokeWidth={1.8} />}
              {saveSuccess ? "Saved" : "Save"}
            </button>
            <button onClick={handleSimulate} disabled={simulating} className="btn-secondary btn-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
              {simulating ? "Validating…" : "Validate"}
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

      {runError && (
        <div className="flex items-center justify-between gap-3 border border-danger/30 bg-danger-soft px-3.5 py-3 text-[12.5px] text-danger">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {runError}
          </span>
          <button type="button" onClick={() => setRunError(null)} className="icon-btn" aria-label="Dismiss error">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="segmented w-full md:hidden" role="group" aria-label="Mobile workflow view">
        <button
          type="button"
          onClick={() => setViewModeOverride("stages")}
          aria-pressed={effectiveViewMode === "stages"}
          className={cn("segmented-item flex-1", effectiveViewMode === "stages" && "segmented-item-active")}
        >
          Stages ({nodes.length})
        </button>
        <button
          type="button"
          onClick={() => setViewModeOverride("canvas")}
          aria-pressed={effectiveViewMode === "canvas"}
          className={cn("segmented-item flex-1", effectiveViewMode === "canvas" && "segmented-item-active")}
        >
          Canvas view
        </button>
      </div>

      <div
        className={cn(
          "grid gap-8 xl:items-start",
          inspectorOpen ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-1"
        )}
      >
        <section className="space-y-4 border-t border-line pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
                {effectiveViewMode === "stages" ? "Pipeline stages & controls" : "Pipeline canvas"}
              </h2>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
                {effectiveViewMode === "stages"
                  ? "Inspect execution flow in sequence, configure any stage, or switch to Canvas view to drag nodes visually."
                  : "Drag nodes, connect dependencies, and inspect the live DAG structure before validation or execution."}
              </p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {templateLabel} · {nodeCountLabel(nodes.length)} · {edgeCountLabel(edges.length)}
            </div>
          </div>

          {!isTabletOrUp && effectiveViewMode === "stages" ? (
            <div className="space-y-5">
              {/* Mobile template + quick add controls */}
              <div className="space-y-3 border border-line bg-surface p-4">
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
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Optional trigger prompt…"
                  aria-label="Custom workflow trigger prompt"
                  className="field field-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleAddNode("agent")} className="btn-secondary btn-sm justify-center">
                    + Agent
                  </button>
                  <button onClick={() => handleAddNode("action")} className="btn-secondary btn-sm justify-center">
                    + Action
                  </button>
                  <button onClick={() => handleAddNode("approval")} className="btn-secondary btn-sm justify-center">
                    + Gate
                  </button>
                </div>
              </div>

              {/* Structured vertical pipeline timeline */}
              <ol className="relative space-y-3 pl-6 before:absolute before:bottom-4 before:left-2.5 before:top-4 before:w-px before:bg-line-strong">
                {nodes.map((node, index) => {
                  const targets = edges
                    .filter((e) => e.source === node.id)
                    .map((e) => String(nodes.find((n) => n.id === e.target)?.data?.label || e.target))
                  const tone = (node.data?.tone as NodeTone) || "default"
                  return (
                    <li key={node.id} className="relative border border-line bg-surface p-3.5">
                      <span
                        className={cn(
                          "absolute -left-[19px] top-4 h-2.5 w-2.5 border border-canvas",
                          tone === "accent"
                            ? "bg-accent"
                            : tone === "success"
                              ? "bg-success"
                              : "bg-ink-3"
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                            Step {String(index + 1).padStart(2, "0")} · {tone}
                          </span>
                          <p className="mt-1 font-mono text-[12.5px] font-medium text-ink">
                            {String(node.data?.label || node.id)}
                          </p>
                          {targets.length > 0 && (
                            <p className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[10px] text-ink-3">
                              <ArrowRight className="h-3 w-3 text-accent" />
                              <span>{targets.join(", ")}</span>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className="btn-secondary btn-sm shrink-0"
                        >
                          Configure
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile/Tablet inline legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface px-3.5 py-2.5 xl:hidden">
                <div className="flex items-center gap-2 text-ink">
                  {activeTemplate === "pr_security" ? <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} /> : <Workflow className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />}
                  <span className="font-display text-[13px] font-medium">{templateLabel}</span>
                </div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                  Tap node to configure
                </span>
              </div>

              <div className="relative h-[460px] w-full overflow-hidden border border-line bg-sidebar md:h-[580px] xl:h-[660px]">
                <WorkflowCanvas
                  nodes={nodes}
                  edges={edges}
                  onNodesUpdate={setNodes}
                  onEdgesUpdate={setEdges}
                  onConnectEdge={handleConnectEdge}
                  onNodeSelect={setSelectedNodeId}
                  onDragCommitStart={() => {
                    dragSnapshotRef.current = cloneSnapshot(nodes, edges)
                  }}
                  onDragCommitEnd={() => {
                    const start = dragSnapshotRef.current
                    dragSnapshotRef.current = null
                    if (!start) return
                    const moved = start.nodes.some((orig) => {
                      const curr = nodes.find((n) => n.id === orig.id)
                      return curr && (curr.position.x !== orig.position.x || curr.position.y !== orig.position.y)
                    })
                    if (moved) pushHistory(start)
                  }}
                  showMiniMap={isTabletOrUp}
                />

                <div className="pointer-events-none absolute left-4 top-4 z-10 hidden max-w-[320px] border border-line bg-surface/95 px-3.5 py-3 backdrop-blur-[1px] xl:block">
                  <div className="flex items-center gap-2 text-ink">
                    {activeTemplate === "pr_security" ? <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} /> : <Workflow className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />}
                    <p className="font-display text-[13px] font-medium tracking-[-0.02em]">{templateLabel}</p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{templateDescription}</p>
                  <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                    Drag nodes · connect ports · validate · save · run
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {isTabletOrUp && inspectorOpen && (
          <aside className="border-t border-line pt-6 xl:border-l xl:border-t-0 xl:pl-8">
            {inspectorControls}
          </aside>
        )}
      </div>

      {/* Mobile Node Configuration Drawer */}
      {mobileSheetOpen && selectedNode && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-[1px] md:hidden">
          <div
            ref={mobileSheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-node-sheet-title"
            className="max-h-[85dvh] w-full overflow-y-auto border-t border-line bg-surface p-5 shadow-float"
          >
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                  Node configuration
                </p>
                <h2 id="mobile-node-sheet-title" className="mt-0.5 font-display text-[16px] font-medium text-ink">
                  {String(selectedNode.data?.label || selectedNode.id)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="icon-btn"
                aria-label="Close node configuration"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {inspectorControls}
          </div>
        </div>
      )}
    </div>
  )
}
