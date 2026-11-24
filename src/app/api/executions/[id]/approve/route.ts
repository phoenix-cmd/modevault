import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import {
  commitWorkspace,
  deleteBranch,
  getLatestCommitDiff,
  mergeBranch,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"
import { publishExecutionComplete, publishExecutionEvent } from "@/lib/event-bus"
import { approvalSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

function computeDiffSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const parsed = await parseJson(req, approvalSchema)
    if ("response" in parsed) return parsed.response
    const { action, feedback, expectedCommitSha, expectedDiffHash } = parsed.data

    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        project: { include: { sources: true } },
        artifacts: true,
        gitOperations: true,
      },
    })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    await requireProjectAccess(execution.projectId, user.id, "member")

    if (
      execution.status !== "awaiting_approval" &&
      execution.status !== "running" &&
      execution.status !== "pending"
    ) {
      return NextResponse.json(
        { error: `Execution in "${execution.status}" state cannot transition via approval` },
        { status: 409 }
      )
    }

    const diffArtifact = execution.artifacts.find((a) => a.type === "git_diff")
    const diffSha256 = diffArtifact ? computeDiffSha256(diffArtifact.content || "") : null
    const latestCommitSha = execution.gitOperations[0]?.commitSha || null

    if (expectedDiffHash && diffSha256 && expectedDiffHash !== diffSha256) {
      return NextResponse.json(
        { error: "Approval rejected: diff artifact content changed since review (digest mismatch)" },
        { status: 409 }
      )
    }

    if (expectedCommitSha && latestCommitSha && expectedCommitSha !== latestCommitSha) {
      return NextResponse.json(
        { error: "Approval rejected: workspace commit SHA changed since review" },
        { status: 409 }
      )
    }

    let nextStatus = "completed"
    if (action === "reject") nextStatus = "cancelled"
    else if (action === "request_revision") nextStatus = "awaiting_approval"

    let sourcePath = execution.project?.sources?.find((s) => s.sourcePath)?.sourcePath || null
    if (!sourcePath && execution.project) {
      try {
        sourcePath = await ensureProjectSourceWorkspace(execution.project)
      } catch {
        sourcePath = null
      }
    }
    let mergeResult: { merged: boolean; commitSha: string; output: string } | null = null
    let revisedCommitSha: string | null = null

    if (sourcePath && execution.targetBranch) {
      if (action === "approve") {
        try {
          mergeResult = await mergeBranch(
            sourcePath,
            execution.targetBranch,
            execution.project?.defaultBranch || "main"
          )
        } catch (err) {
          logger.warn("Git merge during approval skipped", errorContext(err))
        }
      } else if (action === "reject") {
        await deleteBranch(sourcePath, execution.targetBranch).catch(() => {})
      } else if (action === "request_revision" && diffArtifact?.path) {
        try {
          const currentFile = await readWorkspaceFile(sourcePath, diffArtifact.path).catch(() => "")
          if (currentFile) {
            const note = (feedback || "Apply reviewer revision safeguards").replace(/\r?\n/g, " ").slice(0, 120)
            const commentLine = diffArtifact.path.endsWith(".py")
              ? `\n# Revision applied: ${note}\n`
              : `\n// Revision applied: ${note}\n`
            await writeWorkspaceFile(sourcePath, diffArtifact.path, `${currentFile.trimEnd()}${commentLine}`)
            revisedCommitSha = await commitWorkspace(sourcePath, `fix(revision): ${note}`)
            const newDiff = await getLatestCommitDiff(sourcePath)
            if (newDiff) {
              await prisma.executionArtifact.update({
                where: { id: diffArtifact.id },
                data: {
                  content: newDiff,
                  summary: `Revised patch after reviewer feedback`,
                },
              })
            }
          }
        } catch (err) {
          logger.warn("Revision workspace update skipped", errorContext(err))
        }
      }
    }

    const updated = await prisma.execution.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    })

    const taskStatus = action === "approve" ? "completed" : action === "reject" ? "failed" : "completed"
    await prisma.executionTask.updateMany({
      where: { executionId: id },
      data: { status: taskStatus, completedAt: taskStatus === "completed" ? new Date() : null },
    })

    const gitStatus =
      action === "approve"
        ? mergeResult?.merged
          ? "merged"
          : "committed"
        : action === "reject"
          ? "reverted"
          : "committed"

    await prisma.gitOperation.updateMany({
      where: { executionId: id },
      data: {
        status: gitStatus,
        ...(mergeResult?.commitSha
          ? { commitSha: mergeResult.commitSha }
          : revisedCommitSha
            ? { commitSha: revisedCommitSha }
            : {}),
      },
    })

    const lastEvent = await prisma.agentEvent.findFirst({
      where: { executionId: id },
      orderBy: { seq: "desc" },
      select: { seq: true },
    })
    const nextSeq = (lastEvent?.seq ?? 0) + 1
    const payload = {
      action,
      feedback: feedback || null,
      reviewerId: user.id,
      reviewerEmail: user.email,
      commitSha: mergeResult?.commitSha || latestCommitSha,
      merged: Boolean(mergeResult?.merged),
      diffSha256,
      timestamp: new Date().toISOString(),
    }

    const eventRecord = await prisma.agentEvent.create({
      data: {
        executionId: id,
        seq: nextSeq,
        eventType: action === "approve" ? "approval_granted" : "approval_denied",
        level: action === "approve" ? "action" : "warning",
        payloadJson: JSON.stringify(payload),
      },
    })

    publishExecutionEvent(id, {
      id: eventRecord.id,
      executionId: id,
      taskId: null,
      seq: nextSeq,
      eventType: eventRecord.eventType,
      level: eventRecord.level,
      payload,
      createdAt: eventRecord.createdAt.toISOString(),
    })

    if (nextStatus === "completed" || nextStatus === "cancelled") {
      publishExecutionComplete(id, nextStatus)
    }

    return NextResponse.json({
      data: {
        ...updated,
        gitStatus,
        merged: Boolean(mergeResult?.merged),
        approvalProvenance: {
          reviewerId: user.id,
          commitSha: mergeResult?.commitSha || latestCommitSha,
          diffSha256,
        },
      },
    })
  } catch (err: unknown) {
    logger.error("Approval action failed", errorContext(err))
    return authErrorResponse(err, "Approval action failed")
  }
}
