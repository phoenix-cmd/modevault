import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comments = await prisma.reviewComment.findMany({
      where: { executionId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: comments })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { filePath, lineNumber, comment, authorName } = body

    if (!filePath || !lineNumber || !comment) {
      return NextResponse.json(
        { error: "filePath, lineNumber, and comment are required" },
        { status: 400 }
      )
    }

    const newComment = await prisma.reviewComment.create({
      data: {
        executionId: id,
        filePath,
        lineNumber: parseInt(lineNumber, 10),
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const { commentId, status } = body

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 })
    }

    const updated = await prisma.reviewComment.update({
      where: { id: commentId },
      data: { status: status || "resolved" },
    })

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
