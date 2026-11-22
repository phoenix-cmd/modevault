import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import { idSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const orchestratorPlanSchema = z.object({
  projectId: idSchema.optional(),
  prompt: z.string().trim().min(1).max(20000),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, orchestratorPlanSchema)
    if ("response" in parsed) return parsed.response
    const { projectId, prompt } = parsed.data

    let project = null
    if (projectId) {
      await requireProjectAccess(projectId, user.id, "viewer")
      project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      project = await prisma.project.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { updatedAt: "desc" },
      })
    }

    const isUiRelated = /ui|button|modal|component|page|css|tailwind|style|design/i.test(prompt)
    const isApiRelated = /api|backend|database|prisma|stripe|checkout|auth|endpoint|sql/i.test(prompt)

    const targetFiles: string[] = []
    if (isUiRelated) targetFiles.push("src/components/checkout-button.tsx")
    if (isApiRelated || (!isUiRelated && !isApiRelated)) {
      targetFiles.push("src/app/api/checkout/route.ts")
      targetFiles.push("src/lib/services/api-client.ts")
    }

    const planStages = [
      {
        id: "stage-1-arch",
        name: "Stage 1: Lead Architect — AST & Dependency Decomposition",
        agentName: "Claude Code 3.7",
        agentRole: "Lead Architect",
        estimatedTokens: 12400,
        dependencies: [],
        description: "Analyze TypeScript types, call sites, and AST imports across target repository.",
        tasks: [
          "Scan repository AST for imported symbols",
          "Draft strict interfaces and mutation boundaries",
        ],
      },
      {
        id: "stage-2-backend",
        name: "Stage 2: Backend Engineer — Atomic Logic & State Mutation",
        agentName: "Codex 5.2",
        agentRole: "Backend Engineer",
        estimatedTokens: 16800,
        dependencies: ["stage-1-arch"],
        description: "Implement API route handler, database transaction locks, and error boundaries.",
        tasks: [
          `Implement mutation logic in ${targetFiles[0] || "src/app/api/route.ts"}`,
          "Ensure thread-safe idempotency verification and database TTL locks",
        ],
      },
      {
        id: "stage-3-frontend",
        name: "Stage 3: Frontend Engineer — Reactive State & UI Components",
        agentName: "Gemini CLI 2.5",
        agentRole: "Frontend Engineer",
        estimatedTokens: 11200,
        dependencies: ["stage-1-arch"],
        description: "Build accessible UI components with Motion animations and optimistic updates.",
        tasks: [
          "Render status feedback and loading transitions",
          "Wire idempotency headers into client request dispatcher",
        ],
      },
      {
        id: "stage-4-qa",
        name: "Stage 4: QA & Security Auditor — Automated Vitest Verification",
        agentName: "OpenCode Reviewer",
        agentRole: "QA Reviewer",
        estimatedTokens: 9600,
        dependencies: ["stage-2-backend", "stage-3-frontend"],
        description: "Execute regression tests, check coverage, verify zero breaking changes, and build git diff patch.",
        tasks: [
          "Run test suite: vitest run --coverage",
          "Security scan for unvalidated input parameters and memory leaks",
        ],
      },
    ]

    const totalEstimatedTokens = planStages.reduce((sum, s) => sum + s.estimatedTokens, 0)
    const estimatedCost = parseFloat(((totalEstimatedTokens / 1000000) * 4.25).toFixed(4))
    const estimatedDurationSec = Math.floor(totalEstimatedTokens / 450) + 12

    return NextResponse.json({
      data: {
        goal: prompt,
        projectName: project?.name || "Global Workspace",
        targetBranch: `feature/ai-${Date.now().toString(36)}`,
        targetFiles,
        stages: planStages,
        metrics: {
          totalEstimatedTokens,
          estimatedCost,
          estimatedDurationSec,
          parallelStages: 2,
        },
      },
    })
  } catch (err: unknown) {
    logger.error("Orchestrator plan POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to generate orchestrator plan")
  }
}
