import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import {
  analyzeSourceCodeAst,
  flattenWorkspaceTree,
  listWorkspaceTree,
  readWorkspaceFile,
} from "@/lib/project-workspace"
import { estimateTokenCost, invokeLlmCompletion, resolveUserProviderKey } from "@/lib/llm-provider"
import { idSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const orchestratorPlanSchema = z.object({
  projectId: idSchema.optional(),
  prompt: z.string().trim().min(1).max(20000),
})

function rankWorkspaceFiles(files: string[], prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)

  const scored = files.map((file) => {
    const lower = file.toLowerCase()
    let score = 0
    for (const word of words) {
      if (lower.includes(word)) score += 5
    }
    if (/\.(ts|tsx|js|jsx|py)$/.test(lower)) score += 2
    if (lower.startsWith("src/")) score += 2
    if (lower.includes("package.json") || lower.includes("readme.md")) score += 1
    return { file, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.file)
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, orchestratorPlanSchema)
    if ("response" in parsed) return parsed.response
    const { projectId, prompt } = parsed.data

    let project = null
    if (projectId) {
      await requireProjectAccess(projectId, user.id, "viewer")
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { sources: true },
      })
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      project = await prisma.project.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        include: { sources: true },
        orderBy: { updatedAt: "desc" },
      })
    }

    const sourcePath = project?.sources?.find((s) => s.sourcePath)?.sourcePath || null
    let allFiles: string[] = []
    let primaryAstSummary = null
    if (sourcePath) {
      const tree = await listWorkspaceTree(sourcePath).catch(() => [])
      allFiles = flattenWorkspaceTree(tree)
    }

    const targetFiles =
      allFiles.length > 0
        ? rankWorkspaceFiles(allFiles, prompt)
        : ["MODELVAULT_EXECUTION.md"]

    if (sourcePath && targetFiles[0]) {
      const firstContent = await readWorkspaceFile(sourcePath, targetFiles[0]).catch(() => "")
      if (firstContent) {
        primaryAstSummary = analyzeSourceCodeAst(targetFiles[0], firstContent)
      }
    }

    const targetBranch = `feature/ai-${Date.now().toString(36)}`
    const providerKey = await resolveUserProviderKey(user.id)

    if (providerKey) {
      try {
        const llm = await invokeLlmCompletion({
          provider: providerKey.provider,
          apiKey: providerKey.apiKey,
          model: providerKey.model,
          maxTokens: 900,
          timeoutMs: 12000,
          systemPrompt:
            "You are a software architecture planner. Return ONLY valid JSON with key `stages`: an array of 3-4 objects { id, name, agentName, agentRole, estimatedTokens, description, tasks }.",
          userPrompt: `Goal: ${prompt}\nProject: ${project?.name || "Workspace"}\nFiles: ${allFiles.slice(0, 35).join(", ") || "No workspace files yet"}`,
        })

        const jsonMatch = llm.content.match(/\{[\s\S]*\}/)
        const parsedPlan = jsonMatch
          ? (JSON.parse(jsonMatch[0]) as {
              stages?: Array<{
                id?: string
                name?: string
                agentName?: string
                agentRole?: string
                estimatedTokens?: number
                description?: string
                tasks?: string[]
              }>
            })
          : null

        if (Array.isArray(parsedPlan?.stages) && parsedPlan.stages.length > 0) {
          const stages = parsedPlan.stages.slice(0, 6).map((s, idx) => ({
            id: s.id || `stage-${idx + 1}`,
            name: s.name || `Stage ${idx + 1}`,
            agentName: s.agentName || `${providerKey.provider} (${providerKey.model})`,
            agentRole: s.agentRole || "Engineer",
            estimatedTokens: Number(s.estimatedTokens) || 4000,
            dependencies: idx === 0 ? [] : [`stage-${idx}`],
            description: s.description || "Execute workspace step",
            tasks: Array.isArray(s.tasks) ? s.tasks : [],
          }))

          const totalEstimatedTokens = stages.reduce((sum, s) => sum + s.estimatedTokens, 0)
          const estimatedCost = await estimateTokenCost(
            providerKey.provider,
            providerKey.model,
            Math.round(totalEstimatedTokens * 0.7),
            Math.round(totalEstimatedTokens * 0.3)
          )

          return NextResponse.json({
            data: {
              mode: "live_llm",
              provider: providerKey.provider,
              model: llm.model,
              goal: prompt,
              projectName: project?.name || "Workspace",
              targetBranch,
              targetFiles,
              workspaceFileCount: allFiles.length,
              stages,
              metrics: {
                totalEstimatedTokens,
                estimatedCost,
                estimatedDurationSec: Math.max(8, Math.round(llm.durationMs / 1000) * 4),
                planningLatencyMs: llm.durationMs,
                parallelStages: Math.min(2, stages.length),
              },
            },
          })
        }
      } catch (err) {
        logger.warn("Live LLM planner failed; falling back to AST heuristic", errorContext(err))
      }
    }

    const primaryFile = targetFiles[0] || "MODELVAULT_EXECUTION.md"
    const exportedCount = primaryAstSummary?.exportedSymbols?.length || 0
    const importCount = primaryAstSummary?.importedModules?.length || 0

    const planStages = [
      {
        id: "stage-1-arch",
        name: "Stage 1: Workspace Inspection & AST Decomposition",
        agentName: "Local AST Analyzer",
        agentRole: "Lead Architect",
        estimatedTokens: 0,
        dependencies: [],
        description: `Inspected ${allFiles.length} workspace file(s). Primary target ${primaryFile} (${exportedCount} exports, ${importCount} imports).`,
        tasks: [
          `Scan repository tree (${allFiles.length} files indexed)`,
          `Target files: ${targetFiles.slice(0, 3).join(", ")}`,
        ],
      },
      {
        id: "stage-2-synthesis",
        name: "Stage 2: Branch Creation & Change Synthesis",
        agentName: "Deterministic Workspace Writer",
        agentRole: "Engineer",
        estimatedTokens: 0,
        dependencies: ["stage-1-arch"],
        description: `Create branch ${targetBranch}, record implementation patch against ${primaryFile}, and stage clean commit.`,
        tasks: [
          `Checkout feature branch ${targetBranch}`,
          `Apply workspace update and capture unified Git diff`,
        ],
      },
      {
        id: "stage-3-qa",
        name: "Stage 3: Diff Verification & Approval Gate",
        agentName: "Verification Scanner",
        agentRole: "QA Reviewer",
        estimatedTokens: 0,
        dependencies: ["stage-2-synthesis"],
        description:
          "Run server-side security diff checks and hold changes behind human approval before merging.",
        tasks: [
          "Compute SHA-256 diff digest and scan added lines",
          "Await reviewer approval on Verification Center or Agent Center",
        ],
      },
    ]

    return NextResponse.json({
      data: {
        mode: "heuristic_ast",
        notice:
          "AST Heuristic Template — connect an OpenAI, Anthropic, or Google key in Integrations for live AI planning.",
        goal: prompt,
        projectName: project?.name || "Workspace",
        targetBranch,
        targetFiles,
        workspaceFileCount: allFiles.length,
        stages: planStages,
        metrics: {
          totalEstimatedTokens: 0,
          estimatedCost: 0,
          estimatedDurationSec: 4,
          parallelStages: 1,
        },
      },
    })
  } catch (err: unknown) {
    logger.error("Orchestrator plan POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to generate orchestrator plan")
  }
}
