import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  getUserAccessibleWorkspaceIds,
  requireWorkspaceAccess,
  resolveUserDefaultWorkspace,
} from "@/lib/permissions"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const workflowCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  category: z.enum(["development", "security", "review", "devops"]).optional(),
  workspaceId: z.string().min(1).max(128).optional(),
  nodes: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const requestedWorkspaceId = new URL(req.url).searchParams.get("workspaceId")

    let workspaceIds: string[]
    if (requestedWorkspaceId) {
      await requireWorkspaceAccess(requestedWorkspaceId, user.id, "viewer")
      workspaceIds = [requestedWorkspaceId]
    } else {
      workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
    }

    const workflows = await prisma.workflowDefinition.findMany({
      where: {
        OR: [{ isTemplate: true }, { workspaceId: { in: workspaceIds } }],
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: workflows })
  } catch (err: unknown) {
    logger.error("Workflows GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load workflows")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, workflowCreateSchema)
    if ("response" in parsed) return parsed.response
    const { name, description, category, workspaceId, nodes, edges } = parsed.data

    const targetWorkspace = workspaceId
      ? await requireWorkspaceAccess(workspaceId, user.id, "member")
      : await resolveUserDefaultWorkspace(user.id, "member")

    const workflow = await prisma.workflowDefinition.create({
      data: {
        workspaceId: targetWorkspace.workspaceId,
        name,
        description: description || "Custom developer workflow automation",
        category: category || "development",
        nodesJson: JSON.stringify(nodes || []),
        edgesJson: JSON.stringify(edges || []),
        isTemplate: false,
      },
    })

    return NextResponse.json({ data: workflow }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Workflows POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to create workflow")
  }
}
