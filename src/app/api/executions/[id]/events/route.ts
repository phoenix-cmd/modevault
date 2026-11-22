import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { redactContext } from "@/lib/logger"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    })

    if (!execution) {
      return new Response("Execution not found", { status: 404 })
    }

    await requireProjectAccess(execution.projectId, user.id, "viewer")

    const encoder = new TextEncoder()
    const events = execution.events

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("retry: 3000\n\n"))
        for (const event of events) {
          let parsedPayload: unknown = {}
          try {
            parsedPayload = redactContext(JSON.parse(event.payloadJson || "{}"))
          } catch {
            parsedPayload = {}
          }
          const payload = JSON.stringify({
            id: event.id,
            executionId: event.executionId,
            taskId: event.taskId,
            seq: event.seq,
            eventType: event.eventType,
            level: event.level,
            payload: parsedPayload,
            createdAt: event.createdAt,
          })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          await new Promise((resolve) => setTimeout(resolve, 120))
        }
        controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to stream execution events")
  }
}
