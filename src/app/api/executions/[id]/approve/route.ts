import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const { id } = await params
    const body = await req.json()
    const { action, feedback } = body // "approve" | "reject" | "request_revision"

    const execution = await db.orm.public.Execution.first({ id })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    let nextStatus = "completed"
    if (action === "reject") nextStatus = "cancelled"
    else if (action === "request_revision") nextStatus = "running"

    const updated = await db.orm.public.Execution
      .where({ id })
      .update({
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      })

    // Update Git Operation status
    await db.orm.public.GitOperation
      .where({ executionId: id })
      .updateAll({
        status: action === "approve" ? "committed" : action === "reject" ? "reverted" : "staged",
  
      })

    // Log approval event
    await db.orm.public.AgentEvent.create({
      executionId: id,
      eventType: action === "approve" ? "approval_granted" : "approval_denied",
      level: action === "approve" ? "action" : "warning",
      payloadJson: JSON.stringify({
        action,
        feedback: feedback || null,
        timestamp: new Date().toISOString(),
      }),
    })

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
