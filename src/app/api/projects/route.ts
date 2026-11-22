import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  getUserAccessibleWorkspaceIds,
  requireWorkspaceAccess,
  resolveUserDefaultWorkspace,
} from "@/lib/permissions"
import { parseJson, safeUrlSchema } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  framework: z.enum(["nextjs", "react", "vue", "node", "python", "custom"]).optional(),
  language: z.enum(["typescript", "javascript", "python"]).optional(),
  repositoryUrl: safeUrlSchema.nullable().optional(),
  workspaceId: z.string().min(1).max(128).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { searchParams } = new URL(req.url)
    const requestedWorkspaceId = searchParams.get("workspaceId")

    let whereClause: { workspaceId: string | { in: string[] } }
    if (requestedWorkspaceId) {
      await requireWorkspaceAccess(requestedWorkspaceId, user.id, "viewer")
      whereClause = { workspaceId: requestedWorkspaceId }
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      whereClause = { workspaceId: { in: workspaceIds } }
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        sources: true,
        environments: true,
        executions: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ data: projects })
  } catch (err: unknown) {
    logger.error("Projects GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load projects")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, projectCreateSchema)
    if ("response" in parsed) return parsed.response
    const { name, description, framework, language, repositoryUrl, workspaceId } = parsed.data

    const targetWorkspace = workspaceId
      ? await requireWorkspaceAccess(workspaceId, user.id, "member")
      : await resolveUserDefaultWorkspace(user.id, "member")

    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "project"

    const project = await prisma.project.create({
      data: {
        workspaceId: targetWorkspace.workspaceId,
        name,
        slug,
        description: description || null,
        framework: framework || "nextjs",
        language: language || "typescript",
        repositoryUrl: repositoryUrl || null,
        status: "ready",
        environments: {
          create: {
            runtime: language === "python" ? "python-3.11" : "nodejs-20",
            buildCommand:
              language === "python" ? "pip install -r requirements.txt" : "npm install && npm run build",
            startCommand: language === "python" ? "python main.py" : "npm run start",
            runPort: 3000 + Math.floor(Math.random() * 500),
            status: "stopped",
          },
        },
        sources: {
          create: {
            type: repositoryUrl ? "git_clone" : "zip_upload",
            branch: "main",
            manifestJson: JSON.stringify({
              framework: framework || "Next.js 16",
              language: language || "TypeScript",
              detectedDependencies: ["react", "next", "tailwindcss", "prisma"],
              fileCount: 28,
            }),
          },
        },
      },
      include: {
        environments: true,
        sources: true,
      },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Projects POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to create project")
  }
}
