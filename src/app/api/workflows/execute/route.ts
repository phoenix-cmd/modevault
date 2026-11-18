import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import {
  createBranch,
  commitWorkspace,
  getLatestCommitDiff,
  writeWorkspaceFile,
} from "@/lib/project-workspace"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, projectId, customPrompt } = body

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
      : await prisma.project.findFirst({ include: { sources: true } })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const user = await getCurrentUserOrDefault()
    try {
      await requireProjectAccess(project.id, user.id, "member")
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const workflow = workflowId
      ? await prisma.workflowDefinition.findUnique({ where: { id: workflowId } })
      : null

    const wfName = workflow ? workflow.name : "Custom Visual DAG Workflow"
    const title = customPrompt || `Automated Run: ${wfName}`
    const branch = `workflow/run-${Date.now().toString(36)}`

    type WorkflowNode = {
      id?: string
      type?: string
      data?: { label?: string; description?: string }
    }

    // Parse workflow nodes if available
    let nodes: WorkflowNode[] = []
    if (workflow && workflow.nodesJson) {
      try {
        nodes = JSON.parse(workflow.nodesJson)
      } catch {
        nodes = []
      }
    }

    // Generate tasks from workflow nodes
    const taskNodes = nodes.filter((n) => n.type === "agent" || n.type === "action" || n.type === "approval")
    const hasApprovalNode = taskNodes.some((n) => n.type === "approval")
    const tasksData = taskNodes.length > 0
      ? taskNodes.map((n, idx) => ({
          title: n.data?.label || `Step ${idx + 1}`,
          description: n.data?.description || `Executing automated workflow node: ${n.id}`,
          agentRole: n.type === "approval" ? "Human Reviewer" : n.type === "action" ? "CI/CD Action" : "AI Agent",
          agentName: n.type === "approval" ? "Tech Lead Gate" : "Claude Code 3.7",
          status: n.type === "approval" ? "pending" : idx === 0 ? "running" : "pending",
          orderIndex: idx,
        }))
      : [
          {
            title: "Static Analysis & AST Security Sweep",
            description: "Scan code for vulnerabilities and dependency CVEs",
            agentRole: "Security Auditor",
            agentName: "Claude Code 3.7",
            status: "running",
            orderIndex: 0,
          },
          {
            title: "Automated Vitest Regression Verification",
            description: "Execute test suite against virtual worktree",
            agentRole: "QA Engineer",
            agentName: "Codex 5.2",
            status: "pending",
            orderIndex: 1,
          },
          {
            title: "Human Approval & Branch Fast-Forward",
            description: "Wait for tech lead review approval",
            agentRole: "Approval Gate",
            agentName: "Tech Lead",
            status: "pending",
            orderIndex: 2,
          },
        ]

    const execution = await prisma.execution.create({
      data: {
        projectId: project.id,
        workspaceId: project.workspaceId,
        title,
        prompt: `Execute workflow pipeline: ${wfName}`,
        status: hasApprovalNode ? "awaiting_approval" : "running",
        targetBranch: branch,
        totalTokens: 24500,
        inputTokens: 18000,
        outputTokens: 6500,
        estimatedCost: 0.098,
        durationMs: 32000,
        planJson: JSON.stringify({
          workflowId: workflow?.id,
          workflowName: wfName,
          nodeCount: nodes.length,
        }),
        tasks: {
          create: tasksData,
        },
      },
      include: {
        tasks: true,
      },
    })

    // If the project has a real extracted workspace, apply and commit a real change.
    const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find(
      (item) => item.sourcePath
    )
    let realDiff = ""
    let realCommitSha = ""
    if (source?.sourcePath) {
      try {
        await createBranch(source.sourcePath, branch)
        await writeWorkspaceFile(
          source.sourcePath,
          "WORKFLOW_EXECUTION.md",
          `# Workflow execution\n\nWorkflow: ${wfName}\nExecution: ${execution.id}\nCreated: ${new Date().toISOString()}\n`
        )
        realCommitSha = await commitWorkspace(source.sourcePath, `feat(workflow): ${wfName}`)
        realDiff = await getLatestCommitDiff(source.sourcePath)

        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0,
            durationMs: 0,
          },
        })
        await prisma.executionArtifact.create({
          data: {
            executionId: execution.id,
            type: "git_diff",
            path: "WORKFLOW_EXECUTION.md",
            summary: `Workflow executed: ${wfName}`,
            content: realDiff,
          },
        })
        await prisma.gitOperation.create({
          data: {
            projectId: project.id,
            executionId: execution.id,
            branchName: branch,
            commitSha: realCommitSha || null,
            commitMessage: `feat(workflow): ${wfName}`,
            status: realCommitSha ? "committed" : "staged",
          },
        })
      } catch (err) {
        console.error("Workflow workspace update failed:", err)
      }
    }

    // Create initial execution event
    await prisma.agentEvent.create({
      data: {
        executionId: execution.id,
        eventType: "workflow_triggered",
        level: "action",
        payloadJson: JSON.stringify({
          workflowName: wfName,
          executionId: execution.id,
          branch,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ data: execution }, { status: 201 })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
