import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { resolveUserGithubToken } from "@/lib/github-auth"
import { requireProjectAccess } from "@/lib/permissions"
import {
  analyzeSourceCodeAst,
  deleteWorkspaceFile,
  flattenWorkspaceTree,
  listWorkspaceTree,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"

function inferLanguage(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase()
  if (extension === "ts" || extension === "tsx") return "typescript"
  if (extension === "js" || extension === "jsx") return "javascript"
  if (extension === "json") return "json"
  if (extension === "py") return "python"
  if (extension === "css") return "css"
  if (extension === "html") return "html"
  if (extension === "md") return "markdown"
  return "plaintext"
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("file")

    const project = await prisma.project.findUnique({
      where: { id },
      include: { sources: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "viewer")

    let resolvedSourcePath = (
      project.sources?.find((item: unknown) => (item as { sourcePath?: string }).sourcePath) as
        | { sourcePath?: string }
        | undefined
    )?.sourcePath

    try {
      const githubToken = await resolveUserGithubToken(user.id)
      resolvedSourcePath = await ensureProjectSourceWorkspace(project, githubToken)
    } catch {
      // Fall back to existing sourcePath if present
    }

    const initialTree = resolvedSourcePath
      ? await listWorkspaceTree(resolvedSourcePath).catch(() => [])
      : []

    if (resolvedSourcePath) {
      if (filePath) {
        try {
          const content = await readWorkspaceFile(resolvedSourcePath, filePath)
          const language = inferLanguage(filePath)
          const astSummary = analyzeSourceCodeAst(filePath, content)
          return NextResponse.json({
            data: {
              path: filePath,
              language,
              content,
              astSummary,
            },
          })
        } catch (err: unknown) {
          const error = err as { message?: string }
          return NextResponse.json({ error: error.message || "File not found" }, { status: 404 })
        }
      }

      const allFiles = flattenWorkspaceTree(initialTree)
      return NextResponse.json({
        data: {
          projectId: project.id,
          projectName: project.name,
          branch: project.defaultBranch,
          tree: initialTree,
          allFiles,
          hasWorkspace: true,
        },
      })
    }

    if (filePath) {
      return NextResponse.json({ error: "File not found — project has no local workspace" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        projectId: project.id,
        projectName: project.name,
        branch: project.defaultBranch,
        tree: [],
        allFiles: [],
        hasWorkspace: false,
      },
    })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to load project files")
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const body = await req.json()
    const file = body?.file as string
    const content = body?.content as string

    if (!file || typeof content !== "string") {
      return NextResponse.json({ error: "file and content are required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { sources: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    await writeWorkspaceFile(sourcePath, file, content)
    const astSummary = analyzeSourceCodeAst(file, content)
    return NextResponse.json({ data: { saved: true, file, astSummary } })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to save project file")
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const body = await req.json()
    const file = typeof body?.file === "string" ? body.file.trim() : ""
    const content = typeof body?.content === "string" ? body.content : ""

    if (!file) {
      return NextResponse.json({ error: "file path is required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { sources: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    await writeWorkspaceFile(sourcePath, file, content)
    const tree = await listWorkspaceTree(sourcePath).catch(() => [])
    return NextResponse.json(
      { data: { created: true, file, allFiles: flattenWorkspaceTree(tree) } },
      { status: 201 }
    )
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to create project file")
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const filePath = new URL(req.url).searchParams.get("file")?.trim() || ""

    if (!filePath) {
      return NextResponse.json({ error: "file query parameter is required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { sources: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    await deleteWorkspaceFile(sourcePath, filePath)
    const tree = await listWorkspaceTree(sourcePath).catch(() => [])
    return NextResponse.json({
      data: { deleted: true, file: filePath, allFiles: flattenWorkspaceTree(tree) },
    })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to delete project file")
  }
}
