import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse, type AuthUser } from "@/lib/auth"
import { requireProjectAccess, type RoleName } from "@/lib/permissions"
import {
  commentCreateSchema,
  commentPatchSchema,
  parseJson,
} from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

async function assertExecutionAccess(
  executionId: string,
  minimumRole: RoleName = "viewer"
): Promise<{ user: AuthUser; projectId: string } | null> {
  const user = await requireAuthenticatedUser()
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    select: { projectId: true },
  })
  if (!execution) return null
  await requireProjectAccess(execution.projectId, user.id, minimumRole)
  return { user, projectId: execution.projectId }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await assertExecutionAccess(id, "viewer")
    if (!access) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const comments = await prisma.reviewComment.findMany({
      where: { executionId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: comments })
  } catch (err: unknown) {
    logger.error("Failed to load review comments", errorContext(err))
    return authErrorResponse(err, "Failed to load comments")
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await assertExecutionAccess(id, "member")
    if (!access) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const parsed = await parseJson(req, commentCreateSchema)
    if ("response" in parsed) return parsed.response
    const { filePath, lineNumber, comment, authorName } = parsed.data

    const effectiveAuthor = access.user.name || authorName || access.user.email

    const newComment = await prisma.reviewComment.create({
      data: {
        executionId: id,
        filePath,
        lineNumber,
        comment,
        authorName: effectiveAuthor,
        status: "open",
      },
    })

    await prisma.agentEvent.create({
      data: {
        executionId: id,
        eventType: "review_comment",
        level: "action",
        payloadJson: JSON.stringify({
          commentId: newComment.id,
          filePath,
          lineNumber,
          authorName: newComment.authorName,
          comment,
        }),
      },
    })

    return NextResponse.json({ data: newComment }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Failed to create review comment", errorContext(err))
    return authErrorResponse(err, "Failed to create comment")
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await assertExecutionAccess(id, "member")
    if (!access) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const parsed = await parseJson(req, commentPatchSchema)
    if ("response" in parsed) return parsed.response
    const { commentId, status } = parsed.data

    // Enforce that commentId belongs to the authorized executionId
    const existing = await prisma.reviewComment.findFirst({
      where: { id: commentId, executionId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Review comment not found on this execution" }, { status: 404 })
    }

    const updated = await prisma.reviewComment.update({
      where: { id: existing.id },
      data: { status: status || "resolved" },
    })

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    logger.error("Failed to update review comment", errorContext(err))
    return authErrorResponse(err, "Failed to update comment")
  }
}
