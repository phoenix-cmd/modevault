import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { logger, errorContext } from "@/lib/logger"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
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

    await requireProjectAccess(execution.projectId, user.id, "viewer")

    return NextResponse.json({ data: execution })
  } catch (err: unknown) {
    logger.error("Execution detail GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load execution")
  }
}
