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
  readWorkspaceFileDetailed,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import {
  ensureProjectSourceWorkspace,
  persistProjectSourceSnapshot,
} from "@/lib/project-source"

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" }

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

const SOURCE_SELECT = {
  id: true,
  type: true,
  sourcePath: true,
  branch: true,
  manifestJson: true,
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
      include: { sources: { select: SOURCE_SELECT } },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404, headers: NO_STORE_HEADERS })
    }

    await requireProjectAccess(project.id, user.id, "viewer")

    let resolvedSourcePath = project.sources?.find((item) => item.sourcePath)?.sourcePath

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
          const detailed = await readWorkspaceFileDetailed(resolvedSourcePath, filePath)
          const language = inferLanguage(filePath)
          const astSummary = detailed.isBinary ? null : analyzeSourceCodeAst(filePath, detailed.content)
          return NextResponse.json(
            {
              data: {
                path: filePath,
                language,
                content: detailed.content,
                isBinary: detailed.isBinary,
                byteSize: detailed.byteSize,
                astSummary,
              },
            },
            { headers: NO_STORE_HEADERS }
          )
        } catch (err: unknown) {
          const error = err as { message?: string }
          return NextResponse.json(
            { error: error.message || "File not found" },
            { status: 404, headers: NO_STORE_HEADERS }
          )
        }
      }

      const allFiles = flattenWorkspaceTree(initialTree)
      return NextResponse.json(
        {
          data: {
            projectId: project.id,
            projectName: project.name,
            branch: project.defaultBranch,
            tree: initialTree,
            allFiles,
            hasWorkspace: true,
          },
        },
        { headers: NO_STORE_HEADERS }
      )
    }

    if (filePath) {
      return NextResponse.json(
        { error: "File not found — project has no local workspace" },
        { status: 404, headers: NO_STORE_HEADERS }
      )
    }

    return NextResponse.json(
      {
        data: {
          projectId: project.id,
          projectName: project.name,
          branch: project.defaultBranch,
          tree: [],
          allFiles: [],
          hasWorkspace: false,
        },
      },
      { headers: NO_STORE_HEADERS }
    )
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
      include: { sources: { select: SOURCE_SELECT } },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    const existing = await readWorkspaceFileDetailed(sourcePath, file).catch(() => null)
    if (existing?.isBinary) {
      return NextResponse.json(
        { error: `Cannot save text edits over binary asset "${file}".` },
        { status: 422 }
      )
    }

    await writeWorkspaceFile(sourcePath, file, content)
    await persistProjectSourceSnapshot(project.id, sourcePath)
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
      include: { sources: { select: SOURCE_SELECT } },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    await writeWorkspaceFile(sourcePath, file, content)
    await persistProjectSourceSnapshot(project.id, sourcePath)
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
      include: { sources: { select: SOURCE_SELECT } },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")

    const sourcePath = await ensureProjectSourceWorkspace(project)
    await deleteWorkspaceFile(sourcePath, filePath)
    await persistProjectSourceSnapshot(project.id, sourcePath)
    const tree = await listWorkspaceTree(sourcePath).catch(() => [])
    return NextResponse.json({
      data: { deleted: true, file: filePath, allFiles: flattenWorkspaceTree(tree) },
    })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to delete project file")
  }
}
