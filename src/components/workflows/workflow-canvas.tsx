"use client"

import { useCallback } from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesUpdate: (updater: (prev: Node[]) => Node[]) => void
  onEdgesUpdate: (updater: (prev: Edge[]) => Edge[]) => void
  onConnectEdge: (source: string, target: string) => void
  onNodeSelect: (nodeId: string | null) => void
  onDragCommitStart: () => void
  onDragCommitEnd: () => void
  showMiniMap: boolean
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesUpdate,
  onEdgesUpdate,
  onConnectEdge,
  onNodeSelect,
  onDragCommitStart,
  onDragCommitEnd,
  showMiniMap,
}: WorkflowCanvasProps) {
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesUpdate((prev) => changes.applyTo(prev))
    },
    [onNodesUpdate]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesUpdate((prev) => changes.applyTo(prev))
    },
    [onEdgesUpdate]
  )

  const handleConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        onConnectEdge(params.source, params.target)
      }
    },
    [onConnectEdge]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodeClick={(_e, node) => onNodeSelect(node.id)}
      onPaneClick={() => onNodeSelect(null)}
      onNodeDragStart={() => onDragCommitStart()}
      onNodeDragStop={() => onDragCommitEnd()}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--mv-grid)" gap={20} size={1} />
      <Controls showInteractive={false} />
      {showMiniMap && (
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
      )}
    </ReactFlow>
  )
}
