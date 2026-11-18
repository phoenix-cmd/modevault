import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const { id } = await params
    const execution = await db.orm.public.Execution
      .include("project")
      .include("tasks", (tasks) => tasks.orderBy((t) => t.orderIndex.asc()))
      .include("events", (events) => events.orderBy((e) => e.createdAt.asc()))
      .include("artifacts")
      .include("gitOperations")
      .first({ id })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    return NextResponse.json({ data: execution })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
