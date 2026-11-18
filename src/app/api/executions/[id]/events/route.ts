import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const execution = await prisma.execution.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  })

  if (!execution) {
    return new Response("Execution not found", { status: 404 })
  }

  const encoder = new TextEncoder()
  const events = execution.events

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("retry: 3000\n\n"))
      for (const event of events) {
        const payload = JSON.stringify({
          id: event.id,
          executionId: event.executionId,
          taskId: event.taskId,
          seq: event.seq,
          eventType: event.eventType,
          level: event.level,
          payload: JSON.parse(event.payloadJson || "{}"),
          createdAt: event.createdAt,
        })
        controller.enqueue(encoder.encode(`event: ${event.eventType}\ndata: ${payload}\n\n`))
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
}
