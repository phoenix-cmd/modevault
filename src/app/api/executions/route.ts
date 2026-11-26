import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { decryptSecret } from "@/lib/crypto"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"
import { syncAndListCodingBindings, type EnrichedCodingBinding } from "@/lib/coding-bindings"
import { runCodingAgentLoop } from "@/lib/agent-loop"
import { evaluateReplenishmentForAccount } from "@/lib/replenishment"
import { resolveUserProviderKey, type LlmProviderName } from "@/lib/llm-provider"
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

async function resolveBindingKey(
  userId: string,
  binding: EnrichedCodingBinding | undefined
): Promise<{
  providerSlug: string
  apiKey: string | null
  bridgeEndpoint: string | null
  backendType: "direct_api" | "local_bridge" | "deterministic_fallback"
  model: string
}> {
  if (!binding) {
    return {
      providerSlug: "none",
      apiKey: null,
      bridgeEndpoint: null,
      backendType: "deterministic_fallback",
      model: "deterministic-fallback",
    }
  }
  if (binding.backendType === "local_bridge" && binding.bridgeEndpoint) {
    return {
      providerSlug: binding.providerSlug,
      apiKey: null,
      bridgeEndpoint: binding.bridgeEndpoint,
      backendType: "local_bridge",
      model: binding.defaultModel || "local-bridge",
    }
  }
  if (binding.backendType === "direct_api") {
    const cred = await prisma.integrationCredential.findUnique({
      where: {
        userId_providerSlug: { userId, providerSlug: binding.providerSlug },
      },
    })
    let key: string | null = null
    if (cred?.encryptedKey && cred.status !== "not_connected") {
      try {
        key = decryptSecret(cred.encryptedKey).trim() || null
      } catch {
        key = null
      }
    }
    if (!key) {
      const envFallback = await resolveUserProviderKey(userId, [
        binding.providerSlug as LlmProviderName,
      ]).catch(() => null)
      if (envFallback && envFallback.provider === binding.providerSlug) {
        key = envFallback.apiKey
      }
    }
    return {
      providerSlug: binding.providerSlug,
      apiKey: key,
      bridgeEndpoint: null,
      backendType: key ? "direct_api" : "deterministic_fallback",
      model: binding.defaultModel || binding.models[0]?.slug || "gpt-4o-mini",
    }
  }

  return {
    providerSlug: binding.providerSlug,
    apiKey: null,
    bridgeEndpoint: null,
    backendType: "deterministic_fallback",
    model: "deterministic-fallback",
  }
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
        usageAttribution: {
          include: {
            apiAccount: { select: { id: true, accountName: true, currency: true, prepaidBalance: true } },
            subscription: { select: { id: true, customPlanName: true } },
          },
        },
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
    const {
      projectId,
      prompt,
      targetBranch,
      agentId,
      agentSlug,
      bindingId,
      subscriptionId,
      apiAccountId,
      model: requestedModel,
      allowDeterministicFallback,
    } = parsed.data

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { sources: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const allBindings = await syncAndListCodingBindings(user.id)
    let selectedBinding: EnrichedCodingBinding | undefined
    if (bindingId) {
      selectedBinding = allBindings.find((b) => b.id === bindingId)
      if (!selectedBinding) {
        return NextResponse.json({ error: "Coding credential binding not found" }, { status: 404 })
      }
    } else if (apiAccountId) {
      selectedBinding = allBindings.find((b) => b.apiAccountId === apiAccountId)
    } else if (subscriptionId) {
      selectedBinding = allBindings.find((b) => b.subscriptionId === subscriptionId)
    } else {
      selectedBinding = allBindings.find((b) => b.canExecuteLive)
    }

    // Never pretend a manual/unsupported subscription (Cursor, Antigravity, etc.) ran live
    if (selectedBinding?.backendType === "manual_unsupported" && !allowDeterministicFallback) {
      return NextResponse.json(
        {
          error: `${selectedBinding.providerName} is marked manual/unsupported for automated Studio execution. Select a direct API key binding, attach a local CLI bridge, or explicitly choose deterministic fallback.`,
          code: "UNSUPPORTED_CODING_BACKEND",
          binding: selectedBinding,
        },
        { status: 422 }
      )
    }

    if (selectedBinding?.guardrailBlocked && selectedBinding.backendType !== "manual_unsupported" && !allowDeterministicFallback) {
      return NextResponse.json(
        {
          error: selectedBinding.guardrailReason || "Account balance is below configured execution guardrail.",
          code: "BALANCE_GUARDRAIL_BLOCKED",
          binding: selectedBinding,
        },
        { status: 422 }
      )
    }

    const branch = targetBranch || `feature/ai-${Date.now().toString(36)}`
    const title = prompt.length > 70 ? `${prompt.slice(0, 67)}...` : prompt
    const agentConfig = mapAgentPreferences(agentId || agentSlug)

    let resolved = await resolveBindingKey(user.id, selectedBinding)
    if (!selectedBinding && !resolved.apiKey) {
      const legacyKey = await resolveUserProviderKey(user.id, agentConfig.preferredProviders).catch(() => null)
      if (legacyKey) {
        resolved = {
          providerSlug: legacyKey.provider,
          apiKey: legacyKey.apiKey,
          bridgeEndpoint: null,
          backendType: "direct_api",
          model: requestedModel || legacyKey.model,
        }
        selectedBinding = allBindings.find(
          (b) => b.providerSlug === legacyKey.provider && b.backendType === "direct_api"
        )
      }
    }

    const chosenModel = requestedModel?.trim() || resolved.model

    // Pre-run maxCostPerRun check against catalog estimate
    const modelOption = selectedBinding?.models.find((m) => m.slug === chosenModel)
    if (
      selectedBinding?.maxCostPerRun &&
      modelOption &&
      modelOption.estimatedRunCostUsd > selectedBinding.maxCostPerRun
    ) {
      return NextResponse.json(
        {
          error: `Estimated cost ($${modelOption.estimatedRunCostUsd.toFixed(4)}) exceeds binding guardrail max ($${selectedBinding.maxCostPerRun.toFixed(2)}).`,
        },
        { status: 422 }
      )
    }

    let ensuredPath: string | null = null
    try {
      ensuredPath = await ensureProjectSourceWorkspace(project)
    } catch {
      const existing = project.sources?.find(
        (item: unknown) => (item as { sourcePath?: string }).sourcePath
      ) as { sourcePath?: string } | undefined
      ensuredPath = existing?.sourcePath || null
    }

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
          agent: selectedBinding?.label || agentConfig.displayName,
          executionMode: resolved.backendType === "deterministic_fallback" ? "local_deterministic" : "live_llm",
          provider: resolved.providerSlug,
          model: chosenModel,
          stages: [
            { name: "Repository & AST Inspection", agent: agentConfig.displayName, status: "running" },
            { name: "Multi-Step Tool Loop & Verification", agent: selectedBinding?.label || agentConfig.displayName, status: "pending" },
            { name: "Security Scan & Diff Approval Gate", agent: "Verification Scanner", status: "pending" },
          ],
        }),
        tasks: {
          create: [
            {
              title: "Inspect workspace tree and relevant source files",
              description: "Locate target modules and inspect AST symbols",
              agentRole: "Lead Architect",
              agentName: agentConfig.displayName,
              status: "completed",
              orderIndex: 0,
            },
            {
              title: "Execute bounded coding tool loop and syntax checks",
              description:
                resolved.backendType === "deterministic_fallback"
                  ? "Deterministic fallback scaffold (low confidence — no live key)"
                  : `Run ${resolved.providerSlug} (${chosenModel}) via ${resolved.backendType}`,
              agentRole: "Engineer",
              agentName: selectedBinding?.label || agentConfig.displayName,
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

    let seqCounter = 0
    const appendEvent = async (
      eventType: string,
      level: string,
      taskIndex: number,
      payload: Record<string, unknown>
    ) => {
      seqCounter += 1
      const taskId = execution.tasks[taskIndex]?.id
      const created = await prisma.agentEvent.create({
        data: {
          executionId: execution.id,
          taskId,
          seq: seqCounter,
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

    const loopResult = await runCodingAgentLoop({
      projectName: project.name,
      framework: project.framework,
      prompt,
      branch,
      sourcePath: ensuredPath,
      backendType: resolved.backendType,
      providerSlug: resolved.providerSlug,
      model: chosenModel,
      apiKey: resolved.apiKey,
      bridgeEndpoint: resolved.bridgeEndpoint,
      allowDeterministicFallback: allowDeterministicFallback ?? true,
      appendEvent,
    })

    const scan = scanExecutionDiffServerSide(loopResult.diffContent, loopResult.targetFilePath)
    await appendEvent(
      "security_scan",
      scan.findings.length > 0 ? "warning" : "info",
      2,
      {
        scanner: "modelvault-verify-engine/2.0.0",
        findingsCount: scan.findings.length,
        diffSha256: scan.diffSha256,
      }
    )

    await appendEvent("diff_ready", "action", 2, {
      summary: loopResult.editedSummary,
      branch,
      commitSha: loopResult.commitSha,
      mode: loopResult.executionMode,
      fallbackUsed: loopResult.fallbackUsed,
      confidenceLevel: loopResult.confidenceLevel,
      model: loopResult.model,
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
        inputTokens: loopResult.inputTokens,
        outputTokens: loopResult.outputTokens,
        totalTokens: loopResult.totalTokens,
        estimatedCost: loopResult.estimatedCost,
        durationMs,
        planJson: JSON.stringify({
          goal: prompt,
          agent: selectedBinding?.label || agentConfig.displayName,
          executionMode: loopResult.executionMode,
          backendType: loopResult.backendType,
          provider: loopResult.provider,
          model: loopResult.model,
          fallbackUsed: loopResult.fallbackUsed,
          fallbackReason: loopResult.fallbackReason,
          confidenceLevel: loopResult.confidenceLevel,
          toolCallsCount: loopResult.toolCallsCount,
          targetFiles: loopResult.modifiedFiles,
          hasWorkspace: Boolean(ensuredPath),
        }),
      },
    })

    await prisma.executionArtifact.create({
      data: {
        executionId: execution.id,
        type: "git_diff",
        path: loopResult.targetFilePath,
        summary: loopResult.editedSummary,
        content: loopResult.diffContent,
      },
    })

    await prisma.gitOperation.create({
      data: {
        projectId,
        executionId: execution.id,
        branchName: branch,
        commitMessage: `feat(agent): ${title}`,
        commitSha: loopResult.commitSha,
        status: loopResult.commitSha ? "committed" : "staged",
      },
    })

    // Attribute usage & deduct balance from selected managed account/subscription
    const targetAccountId =
      selectedBinding?.apiAccountId ||
      (loopResult.executionMode === "live_llm"
        ? (
            await prisma.apiAccount.findFirst({
              where: { userId: user.id, provider: { slug: loopResult.provider } },
              select: { id: true },
            })
          )?.id || null
        : null)

    let balanceBefore: number | null = null
    let balanceAfter: number | null = null
    let usageRecordId: string | null = null
    let snapshotId: string | null = null
    let accountCurrency = "USD"

    if (targetAccountId) {
      const accountRow = await prisma.apiAccount.findUnique({ where: { id: targetAccountId } })
      if (accountRow) {
        accountCurrency = accountRow.currency || "USD"
        balanceBefore = accountRow.prepaidBalance ?? 0
        if (loopResult.estimatedCost > 0) {
          const nextSpent = Number(((accountRow.totalSpent ?? 0) + loopResult.estimatedCost).toFixed(6))
          const nextBalance =
            balanceBefore > 0
              ? Number(Math.max(0, balanceBefore - loopResult.estimatedCost).toFixed(6))
              : balanceBefore
          balanceAfter = nextBalance

          await prisma.apiAccount.update({
            where: { id: accountRow.id },
            data: {
              prepaidBalance: nextBalance,
              totalSpent: nextSpent,
            },
          })

          const usageRec = await prisma.apiUsageRecord.create({
            data: {
              apiAccountId: accountRow.id,
              date: new Date(),
              model: loopResult.model,
              inputTokens: loopResult.inputTokens,
              outputTokens: loopResult.outputTokens,
              cachedTokens: loopResult.cachedTokens,
              totalTokens: loopResult.totalTokens,
              cost: loopResult.estimatedCost,
              currency: accountCurrency,
              requestCount: Math.max(1, loopResult.toolCallsCount),
              dataSource: loopResult.fallbackUsed ? "estimated" : "agent_execution",
            },
          })
          usageRecordId = usageRec.id

          const snap = await prisma.usageSnapshot.create({
            data: {
              userId: user.id,
              providerSlug: loopResult.provider,
              apiAccountId: accountRow.id,
              periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
              periodEnd: new Date(),
              inputTokens: loopResult.inputTokens,
              outputTokens: loopResult.outputTokens,
              cachedTokens: loopResult.cachedTokens,
              requests: Math.max(1, loopResult.toolCallsCount),
              cost: loopResult.estimatedCost,
              currency: accountCurrency,
              creditsRemaining: nextBalance,
              creditsUsed: nextSpent,
              dataSource: loopResult.fallbackUsed ? "estimated" : "live_api_sync",
              syncStatus: "ok",
            },
          })
          snapshotId = snap.id

          await evaluateReplenishmentForAccount(accountRow.id, "execution_guardrail").catch(() => {})
        } else {
          balanceAfter = balanceBefore
        }
      }
    } else if (selectedBinding?.subscriptionId && loopResult.totalTokens > 0) {
      await prisma.subscription.update({
        where: { id: selectedBinding.subscriptionId },
        data: {
          usedTokens: { increment: loopResult.totalTokens },
          usedRequests: { increment: 1 },
        },
      }).catch(() => {})
    }

    await prisma.executionUsageAttribution.create({
      data: {
        executionId: execution.id,
        userId: user.id,
        bindingId: selectedBinding?.id ?? null,
        subscriptionId: selectedBinding?.subscriptionId ?? null,
        apiAccountId: targetAccountId,
        usageRecordId,
        snapshotId,
        providerSlug: loopResult.provider,
        backendType: loopResult.backendType,
        model: loopResult.model,
        inputTokens: loopResult.inputTokens,
        outputTokens: loopResult.outputTokens,
        cachedTokens: loopResult.cachedTokens,
        totalTokens: loopResult.totalTokens,
        cost: loopResult.estimatedCost,
        currency: accountCurrency,
        balanceBefore,
        balanceAfter,
        fallbackUsed: loopResult.fallbackUsed,
        fallbackReason: loopResult.fallbackReason,
        confidenceLevel: loopResult.confidenceLevel,
        dataSource: loopResult.dataSource,
        toolCallsCount: loopResult.toolCallsCount,
      },
    })

    publishExecutionComplete(execution.id, "awaiting_approval")

    const finalExec = await prisma.execution.findUnique({
      where: { id: execution.id },
      include: {
        project: true,
        tasks: true,
        events: true,
        artifacts: true,
        gitOperations: true,
        usageAttribution: {
          include: {
            apiAccount: { select: { id: true, accountName: true, currency: true, prepaidBalance: true } },
            subscription: { select: { id: true, customPlanName: true } },
          },
        },
      },
    })

    return NextResponse.json({ data: finalExec }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Execution launch error", errorContext(err))
    return authErrorResponse(err, "Failed to launch execution")
  }
}
