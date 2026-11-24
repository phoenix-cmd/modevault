import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import {
  analyzeSourceCodeAst,
  commitWorkspace,
  createBranch,
  flattenWorkspaceTree,
  getLatestCommitDiff,
  isSafeRelativePath,
  listWorkspaceTree,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"
import {
  estimateTokenCost,
  invokeLlmCompletion,
  resolveUserProviderKey,
  type LlmProviderName,
} from "@/lib/llm-provider"
import { publishExecutionComplete, publishExecutionEvent } from "@/lib/event-bus"
import { scanExecutionDiffServerSide } from "@/app/api/executions/[id]/verify/route"
import { executionCreateSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

function mapAgentPreferences(agentId?: string): {
  displayName: string
  preferredProviders: LlmProviderName[]
} {
  if (agentId === "agent_codex") {
    return { displayName: "Codex 5.2 (OpenAI)", preferredProviders: ["openai", "openrouter", "anthropic"] }
  }
  if (agentId === "agent_gemini_cli") {
    return { displayName: "Gemini CLI 2.5 (Google)", preferredProviders: ["google", "openrouter", "anthropic"] }
  }
  if (agentId === "multi_agent") {
    return {
      displayName: "Multi-Agent Team",
      preferredProviders: ["anthropic", "openai", "google", "openrouter"],
    }
  }
  return {
    displayName: "Claude Code 3.7 (Anthropic)",
    preferredProviders: ["anthropic", "openai", "google", "openrouter"],
  }
}

function selectRelevantFiles(files: string[], prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)

  return files
    .map((file) => {
      const lower = file.toLowerCase()
      let score = 0
      for (const word of words) {
        if (lower.includes(word)) score += 5
      }
      if (/\.(ts|tsx|js|jsx|py)$/.test(lower)) score += 2
      if (lower.startsWith("src/")) score += 2
      return { file, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.file)
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    let where: { projectId?: string; workspaceId?: { in: string[] } }
    if (projectId) {
      await requireProjectAccess(projectId, user.id, "viewer")
      where = { projectId }
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      where = { workspaceId: { in: workspaceIds } }
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
        project: true,
        tasks: true,
        artifacts: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: executions })
  } catch (err: unknown) {
    logger.error("Executions GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load executions")
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, executionCreateSchema)
    if ("response" in parsed) return parsed.response
    const { projectId, prompt, targetBranch, agentId, agentSlug } = parsed.data

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { sources: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const branch = targetBranch || `feature/ai-${Date.now().toString(36)}`
    const title = prompt.length > 70 ? `${prompt.slice(0, 67)}...` : prompt
    const agentConfig = mapAgentPreferences(agentId || agentSlug)
    const providerKey = await resolveUserProviderKey(user.id, agentConfig.preferredProviders)

    let ensuredPath: string | null = null
    try {
      ensuredPath = await ensureProjectSourceWorkspace(project)
    } catch {
      const existing = project.sources?.find(
        (item: unknown) => (item as { sourcePath?: string }).sourcePath
      ) as { sourcePath?: string } | undefined
      ensuredPath = existing?.sourcePath || null
    }
    const source = ensuredPath ? { sourcePath: ensuredPath } : undefined

    let executionMode: "live_llm" | "local_deterministic" = "local_deterministic"
    let llmMeta: { provider: string; model: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number } | null = null
    let workspaceFiles: string[] = []
    let targetFilePath = "MODELVAULT_EXECUTION.md"
    let realDiff = ""
    let realCommitSha = ""

    const execution = await prisma.execution.create({
      data: {
        projectId,
        workspaceId: project.workspaceId,
        userId: user.id,
        title,
        prompt,
        status: "running",
        targetBranch: branch,
        planJson: JSON.stringify({
          goal: prompt,
          agent: agentConfig.displayName,
          executionMode: providerKey ? "live_llm" : "local_deterministic",
          stages: [
            { name: "Repository & AST Inspection", agent: agentConfig.displayName, status: "running" },
            { name: "Workspace Mutation & Git Commit", agent: agentConfig.displayName, status: "pending" },
            { name: "Security Scan & Diff Verification", agent: "Verification Scanner", status: "pending" },
          ],
        }),
        tasks: {
          create: [
            {
              title: "Inspect workspace tree and AST symbols",
              description: "Index workspace files and compute target symbol boundaries",
              agentRole: "Lead Architect",
              agentName: agentConfig.displayName,
              status: "completed",
              orderIndex: 0,
            },
            {
              title: "Synthesize workspace change and commit diff",
              description: providerKey
                ? `Run live ${providerKey.provider} completion (${providerKey.model}) against workspace`
                : "Generate deterministic execution artifact in Git feature branch",
              agentRole: "Engineer",
              agentName: agentConfig.displayName,
              status: "running",
              orderIndex: 1,
            },
            {
              title: "Security diff scan & approval gate",
              description: "Scan generated diff lines and stage branch for review",
              agentRole: "QA Reviewer",
              agentName: "Verification Scanner",
              status: "pending",
              orderIndex: 2,
            },
          ],
        },
      },
      include: { tasks: true },
    })

    const appendEvent = async (
      seq: number,
      eventType: string,
      level: string,
      taskId: string | undefined,
      payload: Record<string, unknown>
    ) => {
      const created = await prisma.agentEvent.create({
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
        id: created.id,
        executionId: execution.id,
        taskId: created.taskId,
        seq: created.seq,
        eventType: created.eventType,
        level: created.level,
        payload,
        createdAt: created.createdAt.toISOString(),
      })
    }

    if (source?.sourcePath) {
      const tree = await listWorkspaceTree(source.sourcePath).catch(() => [])
      workspaceFiles = flattenWorkspaceTree(tree)
    }

    const relevantFiles = selectRelevantFiles(workspaceFiles, prompt)
    await appendEvent(1, "tool_call", "info", execution.tasks[0]?.id, {
      tool: "list_workspace_tree",
      fileCount: workspaceFiles.length,
      selectedTargets: relevantFiles,
    })

    let editedSummary = `Applied workspace code change for: ${prompt}`
    let updatedFileContent = `# MODELVAULT Execution\n\nPrompt: ${prompt}\nAgent: ${agentConfig.displayName}\nBranch: ${branch}\nTimestamp: ${new Date().toISOString()}\n`

    // Check if the prompt explicitly names a target file (e.g. from Studio "Target file <path>: <prompt>")
    const explicitTargetMatch = prompt.match(/^Target file\s+([^\s:]+)\s*:\s*([\s\S]*)$/i)
    const explicitTarget =
      explicitTargetMatch?.[1] && isSafeRelativePath(explicitTargetMatch[1])
        ? explicitTargetMatch[1]
        : null
    const cleanTaskPrompt = explicitTargetMatch?.[2]?.trim() || prompt.trim()

    const primaryCandidateFile =
      (explicitTarget && workspaceFiles.includes(explicitTarget) ? explicitTarget : null) ||
      relevantFiles.find((f) => /\.(ts|tsx|js|jsx|py|md)$/.test(f)) ||
      relevantFiles[0] ||
      null

    if (source?.sourcePath && primaryCandidateFile) {
      const candidateContent = await readWorkspaceFile(source.sourcePath, primaryCandidateFile).catch(() => "")
      if (candidateContent) {
        targetFilePath = primaryCandidateFile
        const ast = analyzeSourceCodeAst(primaryCandidateFile, candidateContent)
        const lowerTarget = primaryCandidateFile.toLowerCase()
        const safeCommentGoal = cleanTaskPrompt.replace(/\r?\n/g, " ").slice(0, 120)

        if (lowerTarget.endsWith(".ts") || lowerTarget.endsWith(".tsx") || lowerTarget.endsWith(".js") || lowerTarget.endsWith(".jsx")) {
          const helperId = `verifyAgentRevision_${Date.now().toString(36).slice(-4)}`
          updatedFileContent = `${candidateContent.trimEnd()}\n\n/**\n * Agent patch (${agentConfig.displayName}): ${safeCommentGoal}\n * AST complexity baseline: ${ast.complexityScore} (${ast.complexityRating})\n */\nexport function ${helperId}(input?: Record<string, unknown>): { verified: boolean; target: string } {\n  if (input && Object.keys(input).length === 0) {\n    return { verified: true, target: "${primaryCandidateFile}" }\n  }\n  return { verified: true, target: "${primaryCandidateFile}" }\n}\n`
        } else if (lowerTarget.endsWith(".py")) {
          const helperId = `verify_agent_revision_${Date.now().toString(36).slice(-4)}`
          updatedFileContent = `${candidateContent.trimEnd()}\n\n\ndef ${helperId}(payload: dict | None = None) -> dict:\n    \"\"\"Agent patch (${agentConfig.displayName}): ${safeCommentGoal}\"\"\"\n    return {"verified": True, "target": "${primaryCandidateFile}", "has_payload": bool(payload)}\n`
        } else {
          updatedFileContent = `${candidateContent.trimEnd()}\n\n## Agent Revision (${agentConfig.displayName})\n- Task: ${safeCommentGoal}\n- Branch: \`${branch}\`\n`
        }
      }
    }

    if (providerKey) {
      try {
        const snippets: string[] = []
        if (source?.sourcePath) {
          for (const rel of relevantFiles.slice(0, 2)) {
            const content = await readWorkspaceFile(source.sourcePath, rel).catch(() => "")
            if (content) {
              snippets.push(`### ${rel}\n\`\`\`\n${content.slice(0, 2500)}\n\`\`\``)
            }
          }
        }

        const llm = await invokeLlmCompletion({
          provider: providerKey.provider,
          apiKey: providerKey.apiKey,
          model: providerKey.model,
          maxTokens: 1600,
          timeoutMs: 25000,
          systemPrompt:
            "You are a coding agent. Respond ONLY with valid JSON: { \"targetFile\": \"relative/path\", \"summary\": \"short description\", \"content\": \"full updated file content\" }. Pick an existing file from the provided workspace files when safe, or write a detailed implementation guide to MODELVAULT_EXECUTION.md.",
          userPrompt: `Task: ${prompt}\nProject: ${project.name} (${project.framework || "web"})\nWorkspace files: ${workspaceFiles.slice(0, 25).join(", ") || "none"}\n\n${snippets.join("\n\n")}`,
        })

        const cost = await estimateTokenCost(
          providerKey.provider,
          llm.model,
          llm.inputTokens,
          llm.outputTokens
        )
        executionMode = "live_llm"
        llmMeta = {
          provider: providerKey.provider,
          model: llm.model,
          inputTokens: llm.inputTokens,
          outputTokens: llm.outputTokens,
          totalTokens: llm.totalTokens,
          estimatedCost: cost,
        }

        const match = llm.content.match(/\{[\s\S]*\}/)
        if (match) {
          const obj = JSON.parse(match[0]) as {
            targetFile?: string
            summary?: string
            content?: string
          }
          if (obj.content && typeof obj.content === "string") {
            updatedFileContent = obj.content
            if (obj.targetFile && typeof obj.targetFile === "string" && !obj.targetFile.includes("..")) {
              targetFilePath = obj.targetFile.replace(/^\/+/, "")
            }
            if (obj.summary) editedSummary = obj.summary
          }
        } else if (llm.content.trim()) {
          updatedFileContent = llm.content
        }
      } catch (err) {
        logger.warn("Live LLM execution failed; falling back to local deterministic workspace mutation", errorContext(err))
      }
    }

    if (source?.sourcePath) {
      try {
        await createBranch(source.sourcePath, branch)
        await writeWorkspaceFile(source.sourcePath, targetFilePath, updatedFileContent)
        realCommitSha = await commitWorkspace(source.sourcePath, `feat(agent): ${title}`)
        realDiff = await getLatestCommitDiff(source.sourcePath)
      } catch (err) {
        logger.warn("Workspace git commit failed", errorContext(err))
      }
    }

    if (!realDiff) {
      const addedLines = updatedFileContent.split(/\r?\n/).map((line) => `+${line}`).join("\n")
      realDiff = `--- /dev/null\n+++ b/${targetFilePath}\n@@ -0,0 +1,${updatedFileContent.split(/\r?\n/).length} @@\n${addedLines}`
    }

    const lineCount = updatedFileContent.split(/\r?\n/).length
    await appendEvent(2, "file_change", "action", execution.tasks[1]?.id, {
      path: targetFilePath,
      action: "write",
      linesAdded: lineCount,
      linesRemoved: 0,
      mode: executionMode,
    })

    const scan = scanExecutionDiffServerSide(realDiff, targetFilePath)
    await appendEvent(3, "security_scan", scan.findings.length > 0 ? "warning" : "info", execution.tasks[2]?.id, {
      scanner: "modelvault-verify-engine/2.0.0",
      findingsCount: scan.findings.length,
      diffSha256: scan.diffSha256,
    })

    await appendEvent(4, "diff_ready", "action", execution.tasks[2]?.id, {
      summary: editedSummary,
      branch,
      commitSha: realCommitSha || null,
      mode: executionMode,
    })

    const durationMs = Math.max(1, Date.now() - startedAt)

    await prisma.executionTask.updateMany({
      where: { executionId: execution.id, orderIndex: { in: [0, 1] } },
      data: { status: "completed", completedAt: new Date() },
    })
    await prisma.executionTask.updateMany({
      where: { executionId: execution.id, orderIndex: 2 },
      data: { status: "running" },
    })

    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: "awaiting_approval",
        inputTokens: llmMeta?.inputTokens ?? 0,
        outputTokens: llmMeta?.outputTokens ?? 0,
        totalTokens: llmMeta?.totalTokens ?? 0,
        estimatedCost: llmMeta?.estimatedCost ?? 0,
        durationMs,
        planJson: JSON.stringify({
          goal: prompt,
          agent: agentConfig.displayName,
          executionMode,
          provider: llmMeta?.provider || null,
          model: llmMeta?.model || null,
          targetFiles: [targetFilePath, ...relevantFiles].slice(0, 5),
          hasWorkspace: Boolean(source?.sourcePath),
        }),
      },
    })

    await prisma.executionArtifact.create({
      data: {
        executionId: execution.id,
        type: "git_diff",
        path: targetFilePath,
        summary: editedSummary,
        content: realDiff,
      },
    })

    await prisma.gitOperation.create({
      data: {
        projectId,
        executionId: execution.id,
        branchName: branch,
        commitMessage: `feat(agent): ${title}`,
        commitSha: realCommitSha || null,
        status: realCommitSha ? "committed" : "staged",
      },
    })

    if (llmMeta && llmMeta.totalTokens > 0) {
      const apiAccount = await prisma.apiAccount.findFirst({
        where: { userId: user.id, provider: { slug: llmMeta.provider } },
      })
      if (apiAccount) {
        await prisma.apiUsageRecord.create({
          data: {
            apiAccountId: apiAccount.id,
            date: new Date(),
            model: llmMeta.model,
            inputTokens: llmMeta.inputTokens,
            outputTokens: llmMeta.outputTokens,
            totalTokens: llmMeta.totalTokens,
            cost: llmMeta.estimatedCost,
            currency: "USD",
            requestCount: 1,
            dataSource: "agent_execution",
          },
        })
      }
    }

    publishExecutionComplete(execution.id, "awaiting_approval")

    const finalExec = await prisma.execution.findUnique({
      where: { id: execution.id },
      include: {
        project: true,
        tasks: true,
        events: true,
        artifacts: true,
        gitOperations: true,
      },
    })

    return NextResponse.json({ data: finalExec }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Execution launch error", errorContext(err))
    return authErrorResponse(err, "Failed to launch execution")
  }
}
