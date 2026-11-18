import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import {
  commentCreateSchema,
  commentPatchSchema,
  parseJson,
} from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

async function assertExecutionAccess(executionId: string): Promise<boolean> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    select: { projectId: true },
  })
  if (!execution) return false
  const user = await getCurrentUserOrDefault()
  await requireProjectAccess(execution.projectId, user.id, "viewer")
  return true
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!(await assertExecutionAccess(id))) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const comments = await prisma.reviewComment.findMany({
      where: { executionId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: comments })
  } catch (err) {
    logger.error("Failed to load review comments", errorContext(err))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!(await assertExecutionAccess(id))) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const parsed = await parseJson(req, commentCreateSchema)
    if ("response" in parsed) return parsed.response
    const { filePath, lineNumber, comment, authorName } = parsed.data

    const newComment = await prisma.reviewComment.create({
      data: {
        executionId: id,
        filePath,
        lineNumber,
        comment,
        authorName: authorName || "Lead Architect",
        status: "open",
      },
    })

    // Log comment event in execution stream
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
  } catch (err) {
    logger.error("Failed to create review comment", errorContext(err))
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!(await assertExecutionAccess(id))) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const parsed = await parseJson(req, commentPatchSchema)
    if ("response" in parsed) return parsed.response
    const { commentId, status } = parsed.data

    const updated = await prisma.reviewComment.update({
      where: { id: commentId },
      data: { status: status || "resolved" },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    logger.error("Failed to update review comment", errorContext(err))
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
