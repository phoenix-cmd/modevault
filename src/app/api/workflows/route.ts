import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  getUserAccessibleWorkspaceIds,
  requireWorkspaceAccess,
  resolveUserDefaultWorkspace,
} from "@/lib/permissions"
import { validateAndSortDag, type DagEdgeInput, type DagNodeInput } from "@/lib/dag-engine"
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

    if (nodes && nodes.length > 0) {
      const dag = validateAndSortDag(
        nodes as unknown as DagNodeInput[],
        (edges || []) as unknown as DagEdgeInput[]
      )
      if (!dag.valid) {
        return NextResponse.json({ error: dag.errors.join(" ") }, { status: 422 })
      }
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const id = new URL(req.url).searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Workflow id is required" }, { status: 400 })
    }

    const existing = await prisma.workflowDefinition.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    if (existing.isTemplate || !existing.workspaceId) {
      return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 403 })
    }

    await requireWorkspaceAccess(existing.workspaceId, user.id, "member")
    await prisma.workflowDefinition.delete({ where: { id: existing.id } })

    return NextResponse.json({ data: { deleted: true, id: existing.id } })
  } catch (err: unknown) {
    logger.error("Workflows DELETE failed", errorContext(err))
    return authErrorResponse(err, "Failed to delete workflow")
  }
}
