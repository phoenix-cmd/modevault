import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { subscribeExecutionEvents } from "@/lib/event-bus"
import { redactContext } from "@/lib/logger"

const TERMINAL_OR_PAUSED = new Set(["completed", "failed", "cancelled", "awaiting_approval"])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { events: { orderBy: [{ seq: "asc" }, { createdAt: "asc" }] } },
    })

    if (!execution) {
      return new Response("Execution not found", { status: 404 })
    }

    await requireProjectAccess(execution.projectId, user.id, "viewer")

    const encoder = new TextEncoder()
    const initialEvents = execution.events
    const shouldTail = !TERMINAL_OR_PAUSED.has(execution.status)

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false
        let lastSeq = 0
        const sentIds = new Set<string>()
        let unsubscribe: (() => void) | null = null
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let closeTimer: ReturnType<typeof setTimeout> | null = null

        const cleanup = () => {
          if (closed) return
          closed = true
          if (unsubscribe) unsubscribe()
          if (pollTimer) clearInterval(pollTimer)
          if (closeTimer) clearTimeout(closeTimer)
          try {
            controller.close()
          } catch {
            // Stream already closed
          }
        }

        const sendEvent = (ev: {
          id: string
          executionId: string
          taskId?: string | null
          seq: number
          eventType: string
          level: string
          payload: unknown
          createdAt: string | Date
        }) => {
          if (closed || sentIds.has(ev.id)) return
          sentIds.add(ev.id)
          if (ev.seq > lastSeq) lastSeq = ev.seq
          const payload = JSON.stringify({
            id: ev.id,
            executionId: ev.executionId,
            taskId: ev.taskId ?? null,
            seq: ev.seq,
            eventType: ev.eventType,
            level: ev.level,
            payload: redactContext(
              ev.payload && typeof ev.payload === "object"
                ? (ev.payload as Record<string, unknown>)
                : {}
            ),
            createdAt: ev.createdAt,
          })
          try {
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          } catch {
            cleanup()
          }
        }

        req.signal?.addEventListener("abort", cleanup)
        controller.enqueue(encoder.encode("retry: 3000\n\n"))

        for (const event of initialEvents) {
          let parsedPayload: unknown = {}
          try {
            parsedPayload = JSON.parse(event.payloadJson || "{}")
          } catch {
            parsedPayload = {}
          }
          sendEvent({
            id: event.id,
            executionId: event.executionId,
            taskId: event.taskId,
            seq: event.seq,
            eventType: event.eventType,
            level: event.level,
            payload: parsedPayload,
            createdAt: event.createdAt,
          })
        }

        if (!shouldTail) {
          if (!closed) {
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
            cleanup()
          }
          return
        }

        unsubscribe = subscribeExecutionEvents(
          id,
          (streamEvent) => sendEvent(streamEvent),
          () => {
            if (!closed) {
              controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
              cleanup()
            }
          }
        )

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            const [freshEvents, currentExec] = await Promise.all([
              prisma.agentEvent.findMany({
                where: { executionId: id, seq: { gt: lastSeq } },
                orderBy: { seq: "asc" },
              }),
              prisma.execution.findUnique({
                where: { id },
                select: { status: true },
              }),
            ])

            for (const ev of freshEvents) {
              let parsedPayload: unknown = {}
              try {
                parsedPayload = JSON.parse(ev.payloadJson || "{}")
              } catch {
                parsedPayload = {}
              }
              sendEvent({
                id: ev.id,
                executionId: ev.executionId,
                taskId: ev.taskId,
                seq: ev.seq,
                eventType: ev.eventType,
                level: ev.level,
                payload: parsedPayload,
                createdAt: ev.createdAt,
              })
            }

            if (!currentExec || TERMINAL_OR_PAUSED.has(currentExec.status)) {
              controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
              cleanup()
            } else {
              controller.enqueue(encoder.encode(": keep-alive\n\n"))
            }
          } catch {
            cleanup()
          }
        }, 1500)

        // Cap SSE lifetime at 45s for serverless safety; EventSource reconnects automatically via retry
        closeTimer = setTimeout(() => {
          if (!closed) {
            controller.enqueue(encoder.encode(": stream-cycle\n\n"))
            cleanup()
          }
        }, 45_000)
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
