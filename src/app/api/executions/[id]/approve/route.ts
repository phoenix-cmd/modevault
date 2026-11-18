import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, feedback } = body // "approve" | "reject" | "request_revision"

    const execution = await prisma.execution.findUnique({
      where: { id },
    })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
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

    // Update Git Operation status
    await prisma.gitOperation.updateMany({
      where: { executionId: id },
      data: {
        status: action === "approve" ? "committed" : action === "reject" ? "reverted" : "staged",
  
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
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
