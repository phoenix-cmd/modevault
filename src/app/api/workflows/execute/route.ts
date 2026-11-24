import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import {
  commitWorkspace,
  createBranch,
  flattenWorkspaceTree,
  getLatestCommitDiff,
  listWorkspaceTree,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import { validateAndSortDag, type DagEdgeInput, type DagNodeInput } from "@/lib/dag-engine"
import { estimateTokenCost, invokeLlmCompletion, resolveUserProviderKey } from "@/lib/llm-provider"
import { publishExecutionComplete, publishExecutionEvent } from "@/lib/event-bus"
import { scanExecutionDiffServerSide } from "@/app/api/executions/[id]/verify/route"
import { parseJson, workflowExecuteSchema } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

function classifyNodeRole(label: string, tone?: string, nodeType?: string) {
  const lower = label.toLowerCase()
  if (nodeType === "approval" || tone === "success" || lower.includes("approval") || lower.includes("gate") || lower.includes("merge")) {
    return "approval"
  }
  if (lower.includes("security") || lower.includes("scan") || lower.includes("test") || lower.includes("verify")) {
    return "security_scan"
  }
  if (tone === "terminal" || lower.includes("trigger") || lower.includes("webhook")) {
    return "trigger"
  }
  return "agent"
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, workflowExecuteSchema)
    if ("response" in parsed) return parsed.response
    const {
      workflowId,
      workflowName,
      projectId,
      customPrompt,
      nodes: submittedNodes,
      edges: submittedEdges,
    } = parsed.data

    let project
    if (projectId) {
      project = await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "member")
      project = await prisma.project.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        include: { sources: true },
        orderBy: { updatedAt: "desc" },
      })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const workflow = workflowId
      ? await prisma.workflowDefinition.findUnique({ where: { id: workflowId } })
      : null

    let nodes: DagNodeInput[] = Array.isArray(submittedNodes)
      ? (submittedNodes as unknown as DagNodeInput[])
      : []
    let edges: DagEdgeInput[] = Array.isArray(submittedEdges)
      ? (submittedEdges as unknown as DagEdgeInput[])
      : []

    if (nodes.length === 0 && workflow?.nodesJson) {
      try {
        nodes = JSON.parse(workflow.nodesJson)
      } catch {
        nodes = []
      }
    }
    if (edges.length === 0 && workflow?.edgesJson) {
      try {
        edges = JSON.parse(workflow.edgesJson)
      } catch {
        edges = []
      }
    }

    if (nodes.length === 0) {
      nodes = [
        { id: "n-1", type: "trigger", data: { label: "Workflow trigger", tone: "terminal" } },
        { id: "n-2", type: "agent", data: { label: "Workspace & AST analyzer", tone: "accent" } },
        { id: "n-3", type: "action", data: { label: "Security diff verification", tone: "default" } },
        { id: "n-4", type: "approval", data: { label: "Human approval gate", tone: "success" } },
      ]
      edges = [
        { id: "e-1", source: "n-1", target: "n-2" },
        { id: "e-2", source: "n-2", target: "n-3" },
        { id: "e-3", source: "n-3", target: "n-4" },
      ]
    }

    const dag = validateAndSortDag(nodes, edges)
    if (!dag.valid) {
      return NextResponse.json(
        { error: `Invalid workflow DAG: ${dag.errors.join(" ")}` },
        { status: 422 }
      )
    }

    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    const orderedNodes = dag.order.map((id) => nodeById.get(id)!).filter(Boolean)

    const wfName = workflow?.name || workflowName || "Topological DAG Pipeline"
    const title = customPrompt?.trim() ? `${customPrompt.trim().slice(0, 64)}` : `Workflow: ${wfName}`
    const branch = `workflow/run-${Date.now().toString(36)}`

    const providerKey = await resolveUserProviderKey(user.id)
    const tasksData = orderedNodes.map((node, idx) => {
      const label = String(node.data?.label || node.id)
      const kind = classifyNodeRole(label, node.data?.tone, node.type)
      const upstreamEdges = edges.filter((e) => e.target === node.id).map((e) => e.source)
      return {
        title: label,
        description: String(node.data?.description || `Topological stage (${kind})`),
        agentRole:
          kind === "approval"
            ? "Approval Gate"
            : kind === "security_scan"
              ? "Security Auditor"
              : kind === "trigger"
                ? "Trigger"
                : "AI Agent",
        agentName:
          kind === "approval"
            ? "Reviewer Gate"
            : providerKey && kind === "agent"
              ? `${providerKey.provider} (${providerKey.model})`
              : "Topological Runner",
        status: "pending",
        orderIndex: idx,
        dependenciesJson: JSON.stringify(upstreamEdges),
      }
    })

    const execution = await prisma.execution.create({
      data: {
        projectId: project.id,
        workspaceId: project.workspaceId,
        userId: user.id,
        title,
        prompt: customPrompt?.trim() || `Execute DAG pipeline: ${wfName}`,
        status: "running",
        targetBranch: branch,
        planJson: JSON.stringify({
          workflowId: workflow?.id || workflowId || null,
          workflowName: wfName,
          executionMode: providerKey ? "live_llm" : "local_deterministic",
          nodeCount: orderedNodes.length,
          layers: dag.layers,
        }),
        tasks: { create: tasksData },
      },
      include: { tasks: { orderBy: { orderIndex: "asc" } } },
    })

    const source = project.sources?.find((s) => s.sourcePath)
    let workspaceFiles: string[] = []
    if (source?.sourcePath) {
      const tree = await listWorkspaceTree(source.sourcePath).catch(() => [])
      workspaceFiles = flattenWorkspaceTree(tree)
    }

    let seq = 0
    const emit = async (
      taskId: string | undefined,
      eventType: string,
      level: string,
      payload: Record<string, unknown>
    ) => {
      seq += 1
      const ev = await prisma.agentEvent.create({
        data: {
          executionId: execution.id,
          taskId,
          seq,
          eventType,
          level,
          payloadJson: JSON.stringify(payload),
        },
      })
      publishExecutionEvent(execution.id, {
        id: ev.id,
        executionId: execution.id,
        taskId: ev.taskId,
        seq: ev.seq,
        eventType: ev.eventType,
        level: ev.level,
        payload,
        createdAt: ev.createdAt.toISOString(),
      })
    }

    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCost = 0
    let llmSummary = ""
    let pausedAtApproval = false
    let committedSha = ""
    let realDiff = ""
    const artifactPath = "WORKFLOW_EXECUTION.md"

    // Step 1: Execute topological order until first approval gate
    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i]
      const task = execution.tasks[i]
      const label = String(node.data?.label || node.id)
      const kind = classifyNodeRole(label, node.data?.tone, node.type)

      if (kind === "approval") {
        pausedAtApproval = true
        await prisma.executionTask.update({
          where: { id: task.id },
          data: { status: "running", startedAt: new Date() },
        })
        await emit(task.id, "approval_request", "action", {
          nodeId: node.id,
          label,
          layerIndex: dag.layers.findIndex((layer) => layer.includes(node.id)),
          message: "Pipeline paused at human approval gate",
        })
        break
      }

      await prisma.executionTask.update({
        where: { id: task.id },
        data: { status: "completed", startedAt: new Date(), completedAt: new Date() },
      })

      if (kind === "trigger") {
        await emit(task.id, "workflow_triggered", "action", {
          workflowName: wfName,
          nodeId: node.id,
          branch,
          layers: dag.layers.length,
        })
      } else if (kind === "agent") {
        if (providerKey && !llmSummary) {
          try {
            const res = await invokeLlmCompletion({
              provider: providerKey.provider,
              apiKey: providerKey.apiKey,
              model: providerKey.model,
              maxTokens: 700,
              timeoutMs: 12000,
              systemPrompt: "Provide a concise engineering step summary for a workflow node execution.",
              userPrompt: `Workflow: ${wfName}\nNode: ${label}\nGoal: ${customPrompt || wfName}\nProject: ${project.name} (${workspaceFiles.length} files)`,
            })
            llmSummary = res.content
            totalInputTokens += res.inputTokens
            totalOutputTokens += res.outputTokens
            totalCost += await estimateTokenCost(providerKey.provider, res.model, res.inputTokens, res.outputTokens)
          } catch (err) {
            logger.warn("Workflow node LLM call skipped", errorContext(err))
          }
        }

        await emit(task.id, "tool_call", "info", {
          nodeId: node.id,
          label,
          workspaceFilesIndexed: workspaceFiles.length,
          usedLiveLlm: Boolean(llmSummary),
        })
      } else if (kind === "security_scan") {
        const preliminaryDiff = realDiff || `+ Workflow verification for ${wfName}`
        const scan = scanExecutionDiffServerSide(preliminaryDiff, artifactPath)
        await emit(task.id, "security_scan", scan.findings.length > 0 ? "warning" : "info", {
          nodeId: node.id,
          label,
          findings: scan.findings.length,
          diffSha256: scan.diffSha256,
        })
      }
    }

    const reportLines = [
      `# Workflow Execution: ${wfName}`,
      ``,
      `- **Execution ID:** ${execution.id}`,
      `- **Branch:** ${branch}`,
      `- **Topological Order:** ${orderedNodes.map((n) => String(n.data?.label || n.id)).join(" -> ")}`,
      `- **Trigger Prompt:** ${customPrompt || "(template default)"}`,
      llmSummary ? `\n## Agent Output\n${llmSummary}\n` : "",
    ].join("\n")

    if (source?.sourcePath) {
      try {
        await createBranch(source.sourcePath, branch)
        await writeWorkspaceFile(source.sourcePath, artifactPath, reportLines)
        committedSha = await commitWorkspace(source.sourcePath, `feat(workflow): ${wfName}`)
        realDiff = await getLatestCommitDiff(source.sourcePath)
      } catch (err) {
        logger.warn("Workflow git commit failed", errorContext(err))
      }
    }

    if (!realDiff) {
      const added = reportLines.split(/\r?\n/).map((line) => `+${line}`).join("\n")
      realDiff = `--- /dev/null\n+++ b/${artifactPath}\n@@ -0,0 +1,${reportLines.split(/\r?\n/).length} @@\n${added}`
    }

    await prisma.executionArtifact.create({
      data: {
        executionId: execution.id,
        type: "git_diff",
        path: artifactPath,
        summary: `Workflow executed topologically (${orderedNodes.length} stages)`,
        content: realDiff,
      },
    })

    await prisma.gitOperation.create({
      data: {
        projectId: project.id,
        executionId: execution.id,
        branchName: branch,
        commitSha: committedSha || null,
        commitMessage: `feat(workflow): ${wfName}`,
        status: committedSha ? "committed" : "staged",
      },
    })

    const finalStatus = pausedAtApproval ? "awaiting_approval" : "completed"
    const durationMs = Math.max(1, Date.now() - startedAt)

    const updated = await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: finalStatus,
        completedAt: finalStatus === "completed" ? new Date() : null,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        estimatedCost: parseFloat(totalCost.toFixed(6)),
        durationMs,
      },
      include: { tasks: { orderBy: { orderIndex: "asc" } } },
    })

    publishExecutionComplete(execution.id, finalStatus)

    return NextResponse.json(
      {
        data: {
          ...updated,
          executionId: updated.id,
          dagValidation: dag,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    logger.error("Workflow execution failed", errorContext(err))
    return authErrorResponse(err, "Workflow execution failed")
  }
}
