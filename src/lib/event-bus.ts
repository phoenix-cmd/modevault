import { EventEmitter } from "node:events"

export interface ExecutionStreamEvent {
  id: string
  executionId: string
  taskId?: string | null
  seq: number
  eventType: string
  level: string
  payload: unknown
  createdAt: string
}

const globalForBus = globalThis as unknown as {
  __mvExecutionBus?: EventEmitter
}

const bus = globalForBus.__mvExecutionBus || new EventEmitter()
bus.setMaxListeners(100)
if (process.env.NODE_ENV !== "production") {
  globalForBus.__mvExecutionBus = bus
}

export function publishExecutionEvent(executionId: string, event: ExecutionStreamEvent) {
  bus.emit(`exec:${executionId}:event`, event)
}

export function publishExecutionComplete(executionId: string, status: string) {
  bus.emit(`exec:${executionId}:done`, { status })
}

export function subscribeExecutionEvents(
  executionId: string,
  onEvent: (event: ExecutionStreamEvent) => void,
  onDone?: (payload: { status: string }) => void
): () => void {
  const eventChannel = `exec:${executionId}:event`
  const doneChannel = `exec:${executionId}:done`

  bus.on(eventChannel, onEvent)
  if (onDone) bus.on(doneChannel, onDone)

  return () => {
    bus.off(eventChannel, onEvent)
    if (onDone) bus.off(doneChannel, onDone)
  }
}
