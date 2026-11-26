import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import {
  flattenWorkspaceTree,
  isIgnoredWorkspaceEntry,
  isSafeRelativePath,
  listWorkspaceTree,
  stripCommonRootDirectory,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import {
  ensureProjectSourceWorkspace,
  persistProjectSourceSnapshot,
} from "@/lib/project-source"

const MAX_UPLOAD_TOTAL_BYTES = 50 * 1024 * 1024
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024
const MAX_UPLOAD_FILES = 1500

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sources: {
          select: { id: true, type: true, sourcePath: true, branch: true, manifestJson: true },
        },
      },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")
    const sourcePath = await ensureProjectSourceWorkspace(project)

    const formData = await req.formData()
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)
    const rawPaths = formData.getAll("paths").map((p) => String(p))
    const preStripped = formData.get("preStripped") === "1"

    if (files.length === 0) {
      return NextResponse.json({ error: "No files selected to upload" }, { status: 400 })
    }

    const toWrite: Array<{ relativePath: string; buffer: Buffer }> = []
    let totalBytes = 0

    // If a single .zip archive was uploaded into Studio, extract its contents into the workspace
    if (
      files.length === 1 &&
      (files[0]!.name.toLowerCase().endsWith(".zip") || files[0]!.type.toLowerCase().includes("zip"))
    ) {
      const zipFile = files[0]!
      if (zipFile.size > MAX_UPLOAD_TOTAL_BYTES) {
        return NextResponse.json({ error: "ZIP archive exceeds 50 MB limit" }, { status: 413 })
      }
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
      const candidateRaw: string[] = []
      let hasSymlink = false
      zip.forEach((rel, entry) => {
        const perms = typeof entry.unixPermissions === "number" ? entry.unixPermissions : 0
        if ((perms & 0o170000) === 0o120000) {
          hasSymlink = true
          return
        }
        if (!entry.dir && isSafeRelativePath(rel.replace(/\\/g, "/"))) {
          candidateRaw.push(rel)
        }
      })
      if (hasSymlink) {
        return NextResponse.json({ error: "Symbolic links in ZIP archives are not permitted" }, { status: 422 })
      }
      const { strip } = stripCommonRootDirectory(candidateRaw, { skipStrip: preStripped })
      for (const raw of candidateRaw.slice(0, MAX_UPLOAD_FILES)) {
        const clean = strip(raw)
        if (!clean || clean.length > 512 || !isSafeRelativePath(clean) || isIgnoredWorkspaceEntry(clean)) continue
        const entry = zip.file(raw)
        if (!entry || entry.dir) continue
        const buf = await entry.async("nodebuffer")
        if (buf.byteLength > MAX_SINGLE_FILE_BYTES) continue
        totalBytes += buf.byteLength
        if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) break
        toWrite.push({ relativePath: clean, buffer: buf })
      }
    } else {
      if (files.length > MAX_UPLOAD_FILES) {
        return NextResponse.json({ error: `Too many files (${files.length} > ${MAX_UPLOAD_FILES})` }, { status: 422 })
      }
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i]!
        if (f.size > MAX_SINGLE_FILE_BYTES) {
          return NextResponse.json({ error: `File "${f.name}" exceeds 10 MB limit` }, { status: 413 })
        }
        const rel = (rawPaths[i] || f.name).replace(/\\/g, "/").replace(/^\/+/, "")
        if (!rel || rel.length > 512 || !isSafeRelativePath(rel) || isIgnoredWorkspaceEntry(rel)) continue
        const buf = Buffer.from(await f.arrayBuffer())
        totalBytes += buf.byteLength
        if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
          return NextResponse.json({ error: "Total uploaded files exceed 50 MB limit" }, { status: 413 })
        }
        toWrite.push({ relativePath: rel, buffer: buf })
      }
    }

    if (toWrite.length === 0) {
      return NextResponse.json({ error: "No valid source files found in upload" }, { status: 422 })
    }

    const BATCH_SIZE = 20
    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const batch = toWrite.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((item) => writeWorkspaceFile(sourcePath, item.relativePath, item.buffer))
      )
    }

    await persistProjectSourceSnapshot(project.id, sourcePath)
    const tree = await listWorkspaceTree(sourcePath).catch(() => [])
    const allFiles = flattenWorkspaceTree(tree)

    return NextResponse.json(
      {
        data: {
          uploadedCount: toWrite.length,
          uploadedPaths: toWrite.map((x) => x.relativePath),
          allFiles,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return authErrorResponse(err, "Failed to upload files into project")
  }
}
