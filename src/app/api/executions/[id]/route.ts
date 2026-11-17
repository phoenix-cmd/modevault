import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        project: true,
        tasks: {
          orderBy: { orderIndex: "asc" },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
        artifacts: true,
        gitOperations: true,
      },
    })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    return NextResponse.json({ data: execution })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
