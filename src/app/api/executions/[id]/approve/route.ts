import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
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
    else if (action === "request_revision") nextStatus = "running"

    const updated = await prisma.execution.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    })

    const taskStatus = action === "approve" ? "completed" : action === "reject" ? "failed" : "pending"
    await prisma.executionTask.updateMany({
      where: { executionId: id },
      data: { status: taskStatus },
    })

    await prisma.gitOperation.updateMany({
      where: { executionId: id },
      data: {
        status:
          action === "approve"
            ? "committed"
            : action === "reject"
            ? "reverted"
            : "staged",
      },
    })

    await prisma.agentEvent.create({
      data: {
        executionId: id,
        eventType: action === "approve" ? "approval_granted" : "approval_denied",
        level: action === "approve" ? "action" : "warning",
        payloadJson: JSON.stringify({
          action,
          feedback: feedback || null,
          reviewerId: user.id,
          reviewerEmail: user.email,
          commitSha: latestCommitSha,
          diffSha256,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      data: {
        ...updated,
        approvalProvenance: {
          reviewerId: user.id,
          commitSha: latestCommitSha,
          diffSha256,
        },
      },
    })
  } catch (err: unknown) {
    logger.error("Approval action failed", errorContext(err))
    return authErrorResponse(err, "Approval action failed")
  }
}
