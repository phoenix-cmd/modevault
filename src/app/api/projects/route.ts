import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  getUserAccessibleWorkspaceIds,
  requireProjectAccess,
  requireWorkspaceAccess,
  resolveUserDefaultWorkspace,
} from "@/lib/permissions"
import {
  cloneOrScaffoldGitWorkspace,
  removeProjectWorkspace,
} from "@/lib/project-workspace"
import { stopPreview } from "@/lib/preview-manager"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export function normalizeRepositoryUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Support "owner/repo" shorthand -> https://github.com/owner/repo
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed.replace(/\.git$/i, "")}`
  }

  // Support "github.com/owner/repo" or "gitlab.com/owner/repo" without protocol
  if (/^(github\.com|gitlab\.com|bitbucket\.org)\/[A-Za-z0-9_./-]+$/i.test(trimmed)) {
    return `https://${trimmed.replace(/\.git$/i, "")}`
  }

  // Support git@github.com:owner/repo.git SSH format
  const sshMatch = trimmed.match(/^git@([A-Za-z0-9.-]+):([A-Za-z0-9_./-]+)$/i)
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, "")}`
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null
    }
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  framework: z.enum(["nextjs", "react", "vue", "node", "python", "custom"]).optional(),
  language: z.enum(["typescript", "javascript", "python"]).optional(),
  repositoryUrl: z.string().max(2048).nullable().optional(),
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
      let workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      if (workspaceIds.length === 0) {
        const def = await resolveUserDefaultWorkspace(user.id, "viewer")
        workspaceIds = [def.workspaceId]
      }
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
    const { name: rawName, description, framework, language, repositoryUrl: rawRepoUrl, workspaceId } = parsed.data

    const normalizedRepoUrl = normalizeRepositoryUrl(rawRepoUrl)
    if (rawRepoUrl && rawRepoUrl.trim() && !normalizedRepoUrl) {
      return NextResponse.json(
        { error: "Invalid repository URL. Enter an https:// Git URL or owner/repo shorthand." },
        { status: 422 }
      )
    }

    const derivedNameFromRepo = normalizedRepoUrl
      ? normalizedRepoUrl
          .replace(/\.git$/i, "")
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replace(/[-_]+/g, " ")
      : null

    const name = (rawName?.trim() || derivedNameFromRepo || "").trim()
    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    const targetWorkspace = workspaceId
      ? await requireWorkspaceAccess(workspaceId, user.id, "member")
      : await resolveUserDefaultWorkspace(user.id, "member")

    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "project"

    const project = await prisma.project.create({
      data: {
        workspaceId: targetWorkspace.workspaceId,
        name,
        slug,
        description:
          description ||
          (normalizedRepoUrl ? `Imported from Git repository: ${normalizedRepoUrl}` : null),
        framework: framework || "nextjs",
        language: language || "typescript",
        repositoryUrl: normalizedRepoUrl,
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
            type: normalizedRepoUrl ? "git_clone" : "zip_upload",
            branch: "main",
            manifestJson: JSON.stringify({
              framework: framework || "Next.js 16",
              language: language || "TypeScript",
              detectedDependencies: ["react", "next", "tailwindcss", "prisma"],
              fileCount: 4,
            }),
          },
        },
      },
      include: {
        environments: true,
        sources: true,
      },
    })

    let inspection = {
      fileName: normalizedRepoUrl || name,
      fileCount: 4,
      framework: project.framework || "nextjs",
      language: project.language || "typescript",
      dependencies: ["react", "next", "typescript"],
    }

    if (project.sources?.[0]?.id) {
      try {
        const provisioned = await cloneOrScaffoldGitWorkspace(project.id, {
          name,
          repositoryUrl: normalizedRepoUrl,
          framework: framework || "nextjs",
          language: language || "typescript",
        })

        await prisma.project.update({
          where: { id: project.id },
          data: {
            framework: provisioned.detectedFramework,
            language: provisioned.detectedLanguage,
          },
        })

        await prisma.projectSource.update({
          where: { id: project.sources[0].id },
          data: {
            sourcePath: provisioned.workspacePath,
            manifestJson: JSON.stringify({
              repositoryUrl: normalizedRepoUrl,
              cloned: provisioned.cloned,
              fileCount: provisioned.fileList.length,
              files: provisioned.fileList.slice(0, 100),
              detectedFramework: provisioned.detectedFramework,
              detectedLanguage: provisioned.detectedLanguage,
              dependencies: provisioned.detectedDependencies,
            }),
          },
        })

        project.sources[0].sourcePath = provisioned.workspacePath
        project.framework = provisioned.detectedFramework
        project.language = provisioned.detectedLanguage
        inspection = {
          fileName: normalizedRepoUrl || name,
          fileCount: provisioned.fileList.length,
          framework: provisioned.detectedFramework,
          language: provisioned.detectedLanguage,
          dependencies: provisioned.detectedDependencies.slice(0, 15),
        }
      } catch (err) {
        logger.warn("Project workspace provisioning warning", errorContext(err))
      }
    }

    return NextResponse.json({ data: project, inspection }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Projects POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to create project")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const projectId = new URL(req.url).searchParams.get("id")?.trim()
    if (!projectId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 })
    }

    await requireProjectAccess(projectId, user.id, "admin")
    await stopPreview(projectId).catch(() => {})
    await removeProjectWorkspace(projectId).catch(() => {})
    await prisma.project.delete({ where: { id: projectId } })

    return NextResponse.json({ data: { deleted: true, id: projectId } })
  } catch (err: unknown) {
    logger.error("Projects DELETE failed", errorContext(err))
    return authErrorResponse(err, "Failed to delete project")
  }
}
