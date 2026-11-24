export interface DagNodeInput {
  id: string
  type?: string
  data?: {
    label?: string
    tone?: string
    description?: string
    [key: string]: unknown
  }
}

export interface DagEdgeInput {
  id?: string
  source: string
  target: string
}

export interface DagValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  order: string[]
  layers: string[][]
  hasApprovalGate: boolean
}

/**
 * Validate a directed graph of workflow nodes and edges using Kahn's topological sort.
 * Detects cycles, self-loops, missing node references, and disconnected islands.
 */
export function validateAndSortDag(
  nodes: DagNodeInput[],
  edges: DagEdgeInput[]
): DagValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      valid: false,
      errors: ["Workflow graph has zero nodes."],
      warnings: [],
      order: [],
      layers: [],
      hasApprovalGate: false,
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id))
  const labelMap = new Map(nodes.map((n) => [n.id, String(n.data?.label || n.id)]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  const connected = new Set<string>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adj.set(node.id, [])
  }

  for (const edge of edges || []) {
    if (!edge.source || !edge.target) continue
    if (edge.source === edge.target) {
      errors.push(`Self-loop detected on node "${labelMap.get(edge.source) || edge.source}".`)
      continue
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      warnings.push(`Ignored edge referencing unknown node (${edge.source} -> ${edge.target}).`)
      continue
    }
    const existingTargets = adj.get(edge.source)!
    if (!existingTargets.includes(edge.target)) {
      existingTargets.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
      connected.add(edge.source)
      connected.add(edge.target)
    }
  }

  if (nodes.length > 1) {
    const isolated = nodes.filter((n) => !connected.has(n.id))
    if (isolated.length > 0) {
      warnings.push(
        `Disconnected node(s): ${isolated.map((n) => labelMap.get(n.id) || n.id).join(", ")}.`
      )
    }
  }

  let frontier = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id)
  const order: string[] = []
  const layers: string[][] = []

  while (frontier.length > 0) {
    layers.push(frontier)
    const nextFrontier: string[] = []
    for (const u of frontier) {
      order.push(u)
      for (const v of adj.get(u) || []) {
        const deg = (inDegree.get(v) || 0) - 1
        inDegree.set(v, deg)
        if (deg === 0) {
          nextFrontier.push(v)
        }
      }
    }
    frontier = nextFrontier
  }

  if (order.length < nodes.length) {
    const cycleNodes = nodes
      .filter((n) => !order.includes(n.id))
      .map((n) => labelMap.get(n.id) || n.id)
    errors.push(`Cycle detected involving: ${cycleNodes.join(", ")}.`)
  }

  const hasApprovalGate = nodes.some((n) => {
    const label = String(n.data?.label || "").toLowerCase()
    return n.type === "approval" || label.includes("approval") || label.includes("gate")
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    order,
    layers,
    hasApprovalGate,
  }
}
