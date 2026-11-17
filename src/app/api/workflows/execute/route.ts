import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, projectId, customPrompt } = body

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const workflow = workflowId
      ? await prisma.workflowDefinition.findUnique({ where: { id: workflowId } })
      : null

    const wfName = workflow ? workflow.name : "Custom Visual DAG Workflow"
    const title = customPrompt || `Automated Run: ${wfName}`
    const branch = `workflow/run-${Date.now().toString(36)}`

    // Parse workflow nodes if available
    let nodes: any[] = []
    if (workflow && workflow.nodesJson) {
      try {
        nodes = JSON.parse(workflow.nodesJson)
      } catch {
        nodes = []
      }
    }

    // Generate tasks from workflow nodes
    const taskNodes = nodes.filter((n) => n.type === "agent" || n.type === "action" || n.type === "approval")
    const tasksData = taskNodes.length > 0
      ? taskNodes.map((n, idx) => ({
          title: n.data?.label || `Step ${idx + 1}`,
          description: n.data?.description || `Executing automated workflow node: ${n.id}`,
          agentRole: n.type === "approval" ? "Human Reviewer" : n.type === "action" ? "CI/CD Action" : "AI Agent",
          agentName: n.type === "approval" ? "Tech Lead Gate" : "Claude Code 3.7",
          status: idx === 0 ? "running" : "pending",
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
        status: "running",
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
