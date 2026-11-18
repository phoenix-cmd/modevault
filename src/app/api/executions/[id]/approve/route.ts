import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserOrDefault } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { approvalSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const parsed = await parseJson(req, approvalSchema)
    if ("response" in parsed) return parsed.response
    const { action, feedback } = parsed.data

    const execution = await prisma.execution.findUnique({
      where: { id },
    })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    const user = await getCurrentUserOrDefault()
    try {
      await requireProjectAccess(execution.projectId, user.id, "member")
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    // Update Git Operation status
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

    // Log approval event
    await prisma.agentEvent.create({
      data: {
        executionId: id,
        eventType: action === "approve" ? "approval_granted" : "approval_denied",
        level: action === "approve" ? "action" : "warning",
        payloadJson: JSON.stringify({
          action,
          feedback: feedback || null,
          reviewerId: user.id,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    logger.error("Approval action failed", errorContext(err))
    return NextResponse.json({ error: "Approval action failed" }, { status: 500 })
  }
}
