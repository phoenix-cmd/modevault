"use client"

import { useState, useCallback } from "react"
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
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 50, y: 150 },
    data: { label: "1. Trigger: Issue Submitted" },
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
    position: { x: 300, y: 150 },
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
    position: { x: 620, y: 230 },
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
    position: { x: 920, y: 150 },
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
    position: { x: 1220, y: 150 },
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
]

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-3", source: "2", target: "3", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3-5", source: "3", target: "5", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4-5", source: "4", target: "5", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e5-6", source: "5", target: "6", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
]

export default function WorkflowsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [simulating, setSimulating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleSimulate = () => {
    setSimulating(true)
    setTimeout(() => {
      setSimulating(false)
      alert("Workflow DAG validated: 6 stages, 0 cyclic dependencies. Ready for production dispatch.")
    }, 1200)
  }

  const handleSave = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Visual Workflow Automation"
        description="Design reusable multi-agent pipelines, conditional DAGs, parallel worktrees, and manual approval gates."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8EAED] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#17191C] hover:bg-[#F2F3F5] transition-all"
            >
              <Play className="h-3 w-3 fill-[#D5222D] text-[#D5222D]" />
              {simulating ? "Validating DAG..." : "Simulate Flow"}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              {saveSuccess ? "Workflow Saved ✓" : "Save Pipeline"}
            </button>
          </div>
        }
      />

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
        <div className="absolute top-4 left-4 z-10 rounded-lg border border-[#E8EAED] bg-[#FFFFFF]/90 backdrop-blur-md p-3 text-xs shadow-xs space-y-1">
          <p className="font-bold text-[#17191C]">Production Pipeline: Feature Automation</p>
          <p className="text-[11px] text-[#737982]">
            Drag nodes to rearrange • Connect output handles to define execution order
          </p>
        </div>
      </div>
    </div>
  )
}
