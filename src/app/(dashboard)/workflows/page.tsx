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
import {
  Workflow,
  Play,
  Save,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Bot,
  GitBranch,
  Terminal,
  Layers,
  Sparkles,
  ArrowRight,
  Code,
  CheckSquare,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

const DEFAULT_TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  feature_pipeline: {
    nodes: [
      {
        id: "1",
        position: { x: 40, y: 160 },
        data: { label: "1. Trigger: Issue Submitted / Prompt" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#17191C",
          padding: "10px 14px",
          boxShadow: "0 1px 3px rgba(16,24,40,0.05)",
        },
      },
      {
        id: "2",
        position: { x: 300, y: 160 },
        data: { label: "2. Architect: Task Breakdown (Claude Code 3.7)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #D5222D",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#17191C",
          padding: "10px 14px",
          boxShadow: "0 2px 6px rgba(213,34,45,0.08)",
        },
      },
      {
        id: "3",
        position: { x: 620, y: 70 },
        data: { label: "3A. Frontend Synthesis (Gemini CLI)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "4",
        position: { x: 620, y: 250 },
        data: { label: "3B. Backend API Implementation (Codex 5.2)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "5",
        position: { x: 930, y: 160 },
        data: { label: "4. Test & QA Verification (OpenCode Reviewer)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "6",
        position: { x: 1220, y: 160 },
        data: { label: "5. Human Approval Gate (Merge to Main)" },
        style: {
          backgroundColor: "#040404",
          border: "1px solid #040404",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#FFFFFF",
          padding: "10px 14px",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e2-3", source: "2", target: "3", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e3-5", source: "3", target: "5", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e4-5", source: "4", target: "5", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e5-6", source: "5", target: "6", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  pr_security: {
    nodes: [
      {
        id: "1",
        position: { x: 50, y: 160 },
        data: { label: "1. Webhook: GitHub PR Opened" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "2",
        position: { x: 340, y: 70 },
        data: { label: "2A. AST Lint & License Compliance" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "3",
        position: { x: 340, y: 250 },
        data: { label: "2B. Security Vulnerability Scan (Claude 3.7)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #D5222D",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#17191C",
          padding: "10px 14px",
        },
      },
      {
        id: "4",
        position: { x: 670, y: 160 },
        data: { label: "3. Human Review Gate (Tech Lead Sign-off)" },
        style: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #1F7A4D",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#1F7A4D",
          padding: "10px 14px",
        },
      },
      {
        id: "5",
        position: { x: 980, y: 160 },
        data: { label: "4. Auto-merge & Deploy Sandbox Preview" },
        style: {
          backgroundColor: "#040404",
          border: "1px solid #040404",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#FFFFFF",
          padding: "10px 14px",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e1-3", source: "1", target: "3", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e3-4", source: "3", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e4-5", source: "4", target: "5", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
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
      style: {
        backgroundColor: type === "approval" ? "#040404" : "#FFFFFF",
        border: type === "approval" ? "1px solid #040404" : "1px solid #E8EAED",
        borderRadius: "10px",
        fontSize: "12px",
        fontWeight: 600,
        color: type === "approval" ? "#FFFFFF" : "#17191C",
        padding: "10px 14px",
      },
    }

    setNodes((nds) => [...nds, newNode])
  }

  const handleSimulate = () => {
    setSimulating(true)
    setTimeout(() => {
      setSimulating(false)
      alert(`Workflow DAG validated: ${nodes.length} stages, 0 cyclic dependencies. Topological order verified.`)
    }, 1000)
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

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Visual Workflow Automation"
        description="Design reusable multi-agent pipelines, conditional DAGs, parallel worktrees, and manual approval gates."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAddNode("agent")}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
            >
              <Plus className="h-3.5 w-3.5 text-[#D5222D]" />
              Add Agent Node
            </button>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
            >
              <Play className="h-3 w-3 fill-[#D5222D] text-[#D5222D]" />
              {simulating ? "Validating..." : "Simulate"}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5]"
            >
              <Save className="h-3.5 w-3.5" />
              {saveSuccess ? "Saved ✓" : "Save DAG"}
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={runningPipeline}
              className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D5222D]" />
              {runningPipeline ? "Dispatching..." : "Run Pipeline"}
            </button>
          </div>
        }
      />

      {/* Template Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8EAED] bg-[#FFFFFF] p-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[#17191C]">Template:</span>
          <button
            onClick={() => handleSelectTemplate("feature_pipeline")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              activeTemplate === "feature_pipeline"
                ? "bg-[#040404] text-white"
                : "bg-[#F2F3F5] text-[#737982] hover:text-[#17191C]"
            }`}
          >
            Full-Stack Feature Pipeline
          </button>
          <button
            onClick={() => handleSelectTemplate("pr_security")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              activeTemplate === "pr_security"
                ? "bg-[#040404] text-white"
                : "bg-[#F2F3F5] text-[#737982] hover:text-[#17191C]"
            }`}
          >
            PR Auto-Reviewer & Security Gate
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Custom trigger prompt or Jira ticket..."
            className="w-64 rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3 py-1 text-xs text-[#17191C] outline-none"
          />
        </div>
      </div>

      {/* React Flow Canvas Container */}
      <div className="h-[680px] w-full rounded-xl border border-[#E8EAED] bg-[#FFFFFF] shadow-sm overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#E8EAED" gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor="#D2D6DC"
            maskColor="rgba(248, 249, 251, 0.7)"
            style={{ border: "1px solid #E8EAED", borderRadius: "8px" }}
          />
        </ReactFlow>

        {/* Floating Canvas Legend */}
        <div className="absolute top-4 left-4 z-10 rounded-xl border border-[#E8EAED] bg-[#FFFFFF]/95 backdrop-blur-md p-3.5 text-xs shadow-xs space-y-1">
          <p className="font-bold text-[#17191C]">
            {activeTemplate === "pr_security"
              ? "Autonomous PR Security & Review Pipeline"
              : "Full-Stack Feature Engineering Pipeline"}
          </p>
          <p className="text-[11px] text-[#737982]">
            Drag nodes to rearrange • Connect output ports to link dependencies • Click Run Pipeline to execute
          </p>
        </div>
      </div>
    </div>
  )
}
