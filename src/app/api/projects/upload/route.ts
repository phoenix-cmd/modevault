import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireWorkspaceAccess, resolveUserDefaultWorkspace } from "@/lib/permissions"
import {
  ensureProjectWorkspace,
  initializeGitRepository,
  isIgnoredWorkspaceEntry,
  isSafeRelativePath,
  stripCommonRootDirectory,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import { logger, errorContext } from "@/lib/logger"

const MAX_COMPRESSED_BYTES = 25 * 1024 * 1024 // 25 MB
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024 // 100 MB
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per file
const MAX_ARCHIVE_FILES = 2500
const MAX_COMPRESSION_RATIO = 100

function isSymlinkZipEntry(zipEntry: JSZip.JSZipObject): boolean {
  const unixPerms = typeof zipEntry.unixPermissions === "number" ? zipEntry.unixPermissions : 0
  // S_IFMT = 0o170000, S_IFLNK = 0o120000
  return (unixPerms & 0o170000) === 0o120000
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const rawName = ((formData.get("name") as string) || "Imported Project").trim()
    const name = rawName.slice(0, 120) || "Imported Project"
    const requestedWorkspaceId = ((formData.get("workspaceId") as string) || "").trim()

    if (!file) {
      return NextResponse.json({ error: "No ZIP file provided" }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded ZIP file is empty" }, { status: 400 })
    }

    if (file.size > MAX_COMPRESSED_BYTES) {
      return NextResponse.json(
        { error: `ZIP archive exceeds maximum compressed size (${Math.round(MAX_COMPRESSED_BYTES / (1024 * 1024))} MB)` },
        { status: 413 }
      )
    }

    const targetWorkspace = requestedWorkspaceId
      ? await requireWorkspaceAccess(requestedWorkspaceId, user.id, "member")
      : await resolveUserDefaultWorkspace(user.id, "member")

    const arrayBuffer = await file.arrayBuffer()
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(arrayBuffer)
    } catch {
      return NextResponse.json({ error: "Malformed or unsupported ZIP archive" }, { status: 422 })
    }

    const preFilteredRawPaths: string[] = []
    let detectedFramework = "custom"
    let detectedLanguage = "javascript"
    let packageJsonContent: {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    } | null = null

    let symlinkDetected = false
    zip.forEach((relativePath, zipEntry) => {
      if (isSymlinkZipEntry(zipEntry)) {
        symlinkDetected = true
        return
      }
      if (!zipEntry.dir) {
        const normalized = relativePath.replace(/\\/g, "/")
        if (normalized.length <= 512 && isSafeRelativePath(normalized)) {
          preFilteredRawPaths.push(relativePath)
        }
      }
    })

    if (symlinkDetected) {
      return NextResponse.json(
        { error: "ZIP archive contains symbolic links, which are rejected by security policy" },
        { status: 422 }
      )
    }

    const { strip } = stripCommonRootDirectory(preFilteredRawPaths)
    const safeEntries: Array<{ rawPath: string; cleanPath: string }> = []
    for (const rawPath of preFilteredRawPaths) {
      const cleanPath = strip(rawPath)
      if (
        !cleanPath ||
        cleanPath.length > 512 ||
        !isSafeRelativePath(cleanPath) ||
        isIgnoredWorkspaceEntry(cleanPath)
      ) {
        continue
      }
      safeEntries.push({ rawPath, cleanPath })
    }

    if (safeEntries.length === 0) {
      return NextResponse.json(
        { error: "ZIP archive did not contain any supported source files" },
        { status: 422 }
      )
    }

    if (safeEntries.length > MAX_ARCHIVE_FILES) {
      return NextResponse.json(
        { error: `ZIP archive contains too many files (${safeEntries.length} > ${MAX_ARCHIVE_FILES})` },
        { status: 422 }
      )
    }

    // Decompress entries into memory buffers while enforcing total uncompressed size & compression ratio
    const extractedBuffers: Array<{ relativePath: string; buffer: Buffer }> = []
    let totalUncompressedBytes = 0

    for (const { rawPath, cleanPath } of safeEntries) {
      const zipEntry = zip.file(rawPath)
      if (!zipEntry || zipEntry.dir) continue
      const buffer = await zipEntry.async("nodebuffer")
      if (buffer.byteLength > MAX_SINGLE_FILE_BYTES) {
        return NextResponse.json(
          { error: `File "${cleanPath}" exceeds maximum single-file size (10 MB)` },
          { status: 413 }
        )
      }
      totalUncompressedBytes += buffer.byteLength
      if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        return NextResponse.json(
          { error: "ZIP archive exceeds maximum uncompressed size limit (100 MB)" },
          { status: 413 }
        )
      }
      if (
        totalUncompressedBytes > 5 * 1024 * 1024 &&
        file.size > 0 &&
        totalUncompressedBytes / Math.max(file.size, 64) > MAX_COMPRESSION_RATIO
      ) {
        return NextResponse.json(
          { error: "ZIP archive rejected due to excessive compression ratio" },
          { status: 422 }
        )
      }
      extractedBuffers.push({ relativePath: cleanPath, buffer })
    }

    const pkgEntry =
      extractedBuffers.find((e) => e.relativePath === "package.json") ||
      extractedBuffers.find((e) => e.relativePath.endsWith("/package.json"))

    const extractedPaths = extractedBuffers.map((e) => e.relativePath)

    if (pkgEntry) {
      try {
        const text = pkgEntry.buffer.toString("utf8")
        packageJsonContent = JSON.parse(text)
        const deps = { ...packageJsonContent!.dependencies, ...packageJsonContent!.devDependencies }

        if (deps["next"]) detectedFramework = "nextjs"
        else if (deps["react"]) detectedFramework = "react"
        else if (deps["vue"]) detectedFramework = "vue"
        else detectedFramework = "node"

        if (deps["typescript"] || extractedPaths.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
          detectedLanguage = "typescript"
        }
      } catch {
        // Ignore malformed package.json during framework detection
      }
    } else if (extractedPaths.some((f) => f.endsWith(".py") || f.endsWith("requirements.txt"))) {
      detectedFramework = "python"
      detectedLanguage = "python"
    } else if (extractedPaths.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      detectedLanguage = "typescript"
    }

    const detectedDependencies = packageJsonContent
      ? Object.keys({ ...packageJsonContent.dependencies, ...packageJsonContent.devDependencies })
      : ["standard-runtime"]

    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "imported-project"

    const project = await prisma.project.create({
      data: {
        workspaceId: targetWorkspace.workspaceId,
        name,
        slug,
        description: `Imported from archive: ${file.name} (${Math.round(file.size / 1024)} KB, ${extractedBuffers.length} files)`,
        framework: detectedFramework,
        language: detectedLanguage,
        status: "ready",
        environments: {
          create: {
            runtime: detectedLanguage === "python" ? "python-3.11" : "nodejs-20",
            buildCommand: detectedLanguage === "python" ? "pip install -r requirements.txt" : "npm install",
            startCommand: detectedLanguage === "python" ? "python main.py" : "npm run dev",
            runPort: 3000 + Math.floor(Math.random() * 500),
            status: "stopped",
          },
        },
        sources: {
          create: {
            type: "zip_upload",
            fileName: file.name,
            fileSize: file.size,
            branch: "main",
            manifestJson: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileCount: extractedBuffers.length,
              files: extractedBuffers.map((e) => e.relativePath).slice(0, 500),
              detectedFramework,
              detectedLanguage,
              dependencies: detectedDependencies.slice(0, 20),
            }),
          },
        },
      },
      include: {
        environments: true,
        sources: true,
      },
    })

    const workspacePath = await ensureProjectWorkspace(project.id)
    const BATCH_SIZE = 20
    for (let i = 0; i < extractedBuffers.length; i += BATCH_SIZE) {
      const batch = extractedBuffers.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((item) => writeWorkspaceFile(workspacePath, item.relativePath, item.buffer))
      )
    }
    await initializeGitRepository(workspacePath)

    if (project.sources?.[0]?.id) {
      await prisma.projectSource.update({
        where: { id: project.sources[0].id },
        data: { sourcePath: workspacePath },
      })
    }

    return NextResponse.json({
      data: {
        project,
        inspection: {
          fileName: file.name,
          fileCount: extractedBuffers.length,
          framework: detectedFramework,
          language: detectedLanguage,
          dependencies: detectedDependencies.slice(0, 15),
          previewFiles: extractedBuffers.map((e) => e.relativePath).slice(0, 15),
        },
      },
    })
  } catch (err: unknown) {
    logger.error("ZIP upload error", errorContext(err))
    return authErrorResponse(err, "Failed to process ZIP archive")
  }
}
