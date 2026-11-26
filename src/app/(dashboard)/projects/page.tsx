"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import JSZip from "jszip"
import { useModalA11y } from "@/lib/use-modal-a11y"
import Link from "next/link"
import {
  AlertTriangle,
  FolderGit2,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  FileCode,
  Search,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

const CLIENT_IGNORED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  "__MACOSX",
  ".DS_Store",
  "Thumbs.db",
])

const MAX_ZIP_UPLOAD_BYTES = 25 * 1024 * 1024

function isClientIgnoredPath(relPath: string): boolean {
  const parts = relPath.replace(/\\/g, "/").split("/").filter(Boolean)
  if (parts.length === 0) return true
  return parts.some((segment) => CLIENT_IGNORED_SEGMENTS.has(segment))
}

function stripClientCommonRoot(entries: Array<{ path: string; file: File }>): {
  rootName: string | null
  entries: Array<{ path: string; file: File }>
} {
  if (entries.length === 0) return { rootName: null, entries }
  const firstSlash = entries[0]!.path.indexOf("/")
  if (firstSlash <= 0) return { rootName: null, entries }
  const firstSeg = entries[0]!.path.slice(0, firstSlash)
  const prefix = `${firstSeg}/`
  const allMatch = entries.every((e) => e.path.startsWith(prefix) && e.path.length > prefix.length)
  if (!allMatch) return { rootName: null, entries }
  return {
    rootName: firstSeg,
    entries: entries.map((e) => ({ path: e.path.slice(prefix.length), file: e.file })),
  }
}

interface FsEntryLike {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (success: (file: File) => void, error?: (err: unknown) => void) => void
  createReader?: () => {
    readEntries: (success: (entries: FsEntryLike[]) => void, error?: (err: unknown) => void) => void
  }
}

async function readEntryFiles(
  entry: FsEntryLike,
  prefix = ""
): Promise<Array<{ path: string; file: File }>> {
  const cleanName = entry.name.replace(/\\/g, "/")
  const fullPath = prefix ? `${prefix}/${cleanName}` : cleanName
  if (CLIENT_IGNORED_SEGMENTS.has(cleanName)) return []

  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, reject)
    })
    return [{ path: fullPath, file }]
  }

  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader()
    const allEntries: FsEntryLike[] = []
    while (true) {
      const batch = await new Promise<FsEntryLike[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })
      if (!batch || batch.length === 0) break
      allEntries.push(...batch)
    }
    const nested = await Promise.all(allEntries.map((child) => readEntryFiles(child, fullPath)))
    return nested.flat()
  }

  return []
}

function parseSourceMeta(source: { manifestJson?: string | null; type?: string } | undefined): {
  fileCount: number | null
  cloned: boolean | null
  provisionMode: string | null
} {
  if (!source?.manifestJson) return { fileCount: null, cloned: null, provisionMode: null }
  try {
    const parsed = JSON.parse(source.manifestJson) as {
      fileCount?: unknown
      cloned?: unknown
      provisionMode?: unknown
    }
    return {
      fileCount: typeof parsed.fileCount === "number" ? parsed.fileCount : null,
      cloned: typeof parsed.cloned === "boolean" ? parsed.cloned : null,
      provisionMode: typeof parsed.provisionMode === "string" ? parsed.provisionMode : null,
    }
  } catch {
    return { fileCount: null, cloned: null, provisionMode: null }
  }
}

function deriveProjectNameFromRepoInput(input: string): string {
  const withoutBranchPath = input
    .trim()
    .replace(/(?:\/-)?\/(?:tree|blob)\/[^?#]+.*$/i, "")
    .replace(/[?#].*$/, "")
  const cleaned = withoutBranchPath.replace(/\.git$/i, "").replace(/\/+$/, "")
  if (!cleaned) return ""
  const lastSegment = cleaned.split(/[/:]/).filter(Boolean).pop() || ""
  return lastSegment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const closeModal = useCallback(() => setModalOpen(false), [])
  const dialogRef = useModalA11y(modalOpen, closeModal)
  const [search, setSearch] = useState("")

  // Form state
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [importMode, setImportMode] = useState<"zip" | "git">("zip")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectionSummary, setSelectionSummary] = useState<{
    mode: "zip" | "folder" | "files"
    name: string
    fileCount?: number
    skippedCount?: number
    sizeBytes: number
  } | null>(null)
  const [packing, setPacking] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [inspectionResult, setInspectionResult] = useState<any | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const zipInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (modalOpen && importMode === "zip" && folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "")
      folderInputRef.current.setAttribute("directory", "")
    }
  }, [modalOpen, importMode])

  const clearSelectedArchive = () => {
    setSelectedFile(null)
    setSelectionSummary(null)
    setFormError(null)
    if (zipInputRef.current) zipInputRef.current.value = ""
    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  const handleDeleteProject = async (projId: string) => {
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(projId)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setConfirmDeleteId(null)
        await fetchProjects()
      }
    } catch (err) {
      console.error("Failed to delete project:", err)
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/projects")
      const json = await res.json()
      if (json.data) setProjects(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const applySelectedZipFile = (file: File) => {
    setFormError(null)
    if (file.size <= 0) {
      setFormError("Selected .zip file is empty (0 bytes).")
      return
    }
    if (file.size > MAX_ZIP_UPLOAD_BYTES) {
      setFormError("Selected .zip archive exceeds the 25 MB upload limit.")
      return
    }
    setSelectedFile(file)
    setSelectionSummary({
      mode: "zip",
      name: file.name,
      sizeBytes: file.size,
    })
    setProjectName((prev) => prev.trim() || file.name.replace(/\.zip$/i, ""))
  }

  const packFilesToZip = async (
    rawEntries: Array<{ path: string; file: File }>,
    mode: "folder" | "files",
    fallbackLabel: string
  ) => {
    setFormError(null)
    setPacking(true)
    try {
      const normalizedEntries = rawEntries
        .map((e) => ({ path: e.path.replace(/\\/g, "/").replace(/^\/+/, ""), file: e.file }))
        .filter((e) => e.path.length > 0)

      const kept = normalizedEntries.filter((e) => !isClientIgnoredPath(e.path))
      const skippedCount = normalizedEntries.length - kept.length

      if (kept.length === 0) {
        setFormError("No uploadable source files found (only ignored directories like node_modules or .git).")
        return
      }
      if (kept.length > 2500) {
        setFormError(`Selection contains too many files (${kept.length} > 2500). Exclude large generated assets and retry.`)
        return
      }

      const { rootName, entries } = stripClientCommonRoot(kept)
      const archiveLabel = rootName || fallbackLabel
      const zip = new JSZip()

      for (const item of entries) {
        zip.file(item.path, item.file)
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })

      if (blob.size > MAX_ZIP_UPLOAD_BYTES) {
        setFormError(
          `Packed archive (${(blob.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`
        )
        return
      }

      const safeBaseName = archiveLabel.replace(/[^a-zA-Z0-9._-]+/g, "-") || "project-folder"
      const packedFile = new File([blob], `${safeBaseName}.zip`, { type: "application/zip" })

      setSelectedFile(packedFile)
      setSelectionSummary({
        mode,
        name: archiveLabel,
        fileCount: entries.length,
        skippedCount,
        sizeBytes: packedFile.size,
      })
      setProjectName((prev) => prev.trim() || archiveLabel.replace(/[-_]+/g, " ").trim())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to package selected folder into ZIP archive.")
    } finally {
      setPacking(false)
    }
  }

  const handleZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".zip") && file.type && !file.type.includes("zip")) {
      setFormError("Please select a valid .zip archive, or use Choose folder / drag & drop.")
      return
    }
    applySelectedZipFile(file)
  }

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    e.target.value = ""
    if (fileList.length === 0) return
    const entries = fileList.map((file) => ({
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      file,
    }))
    await packFilesToZip(entries, "folder", "folder-project")
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setFormError(null)

    const items = Array.from(e.dataTransfer.items || [])
    const fsEntries: FsEntryLike[] = []
    for (const item of items) {
      const getter = (item as unknown as { webkitGetAsEntry?: () => FsEntryLike | null }).webkitGetAsEntry
      const entry = typeof getter === "function" ? getter.call(item) : null
      if (entry) fsEntries.push(entry)
    }

    if (fsEntries.length > 0) {
      const hasDirectory = fsEntries.some((entry) => entry.isDirectory)
      if (!hasDirectory && fsEntries.length === 1 && fsEntries[0]!.isFile) {
        const droppedFile = e.dataTransfer.files?.[0]
        if (
          droppedFile &&
          (droppedFile.name.toLowerCase().endsWith(".zip") || droppedFile.type.includes("zip"))
        ) {
          applySelectedZipFile(droppedFile)
          return
        }
      }
      setPacking(true)
      try {
        const nested = await Promise.all(fsEntries.map((entry) => readEntryFiles(entry)))
        const collected = nested.flat()
        await packFilesToZip(
          collected,
          hasDirectory ? "folder" : "files",
          fsEntries[0]!.name || "imported-files"
        )
      } catch (err) {
        setPacking(false)
        setFormError(err instanceof Error ? err.message : "Failed to read dropped folder or files.")
      }
      return
    }

    const droppedFiles = Array.from(e.dataTransfer.files || [])
    if (droppedFiles.length === 1) {
      const single = droppedFiles[0]!
      if (single.name.toLowerCase().endsWith(".zip") || single.type.includes("zip")) {
        applySelectedZipFile(single)
        return
      }
    }
    if (droppedFiles.length > 0) {
      const entries = droppedFiles.map((file) => ({
        path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        file,
      }))
      await packFilesToZip(entries, "files", "imported-files")
    }
  }

  const handleRepoUrlChange = (value: string) => {
    setRepoUrl(value)
    setFormError(null)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setInspectionResult(null)

    if (importMode === "zip") {
      if (!selectedFile) {
        setFormError("Please choose or drop a .zip archive file to upload.")
        return
      }
    } else {
      if (!repoUrl.trim() && !projectName.trim()) {
        setFormError("Please enter a Git repository URL or project name.")
        return
      }
    }

    const effectiveName =
      projectName.trim() ||
      (importMode === "zip" && selectedFile
        ? selectedFile.name.replace(/\.zip$/i, "")
        : deriveProjectNameFromRepoInput(repoUrl)) ||
      "Imported Project"

    setUploading(true)

    try {
      if (importMode === "zip" && selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("name", effectiveName)

        const res = await fetch("/api/projects/upload", {
          method: "POST",
          body: formData,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.error || `Failed to upload ZIP archive (HTTP ${res.status})`)
        }
        if (json.data?.inspection) {
          setInspectionResult(json.data.inspection)
        }
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: effectiveName,
            repositoryUrl: repoUrl.trim() || null,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.error || `Failed to import Git repository (HTTP ${res.status})`)
        }
        if (json.inspection) {
          setInspectionResult(json.inspection)
        }
      }

      await fetchProjects()
      setTimeout(() => {
        setModalOpen(false)
        clearSelectedArchive()
        setProjectName("")
        setRepoUrl("")
        setInspectionResult(null)
      }, 900)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to provision project")
    } finally {
      setUploading(false)
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  )

  const executionCount = projects.reduce(
    (sum, project) => sum + (project.executions?.length || 0),
    0
  )
  const provisionedSandboxCount = projects.filter((project) =>
    project.sources?.some((s: { sourcePath?: string | null }) => Boolean(s.sourcePath))
  ).length
  const runningPreviewCount = projects.filter((project) =>
    project.environments?.some((e: { status?: string }) => e.status === "running")
  ).length
  const zipCount = projects.filter(
    (project) => project.sources?.[0]?.type === "zip_upload"
  ).length
  const gitCount = projects.length - zipCount

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Workspace · Repositories"
        title="Projects"
        description="Repository register for attached codebases, provisioned sandboxes, and recorded agent execution contexts."
        action={
          <button
            onClick={() => {
              setFormError(null)
              setInspectionResult(null)
              setModalOpen(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New project
          </button>
        }
      />

      {loading ? (
        <StatBandSkeleton columns={4} />
      ) : (
        <StatBand
          columns={4}
          items={[
            { label: "Projects", value: String(projects.length), meta: "Attached to this workspace" },
            {
              label: "Local workspaces",
              value: String(provisionedSandboxCount),
              meta:
                runningPreviewCount > 0
                  ? `${runningPreviewCount} running preview · ${provisionedSandboxCount} ready`
                  : `${provisionedSandboxCount} extracted project directories`,
            },
            { label: "Executions", value: String(executionCount), meta: "Recorded agent runs" },
            { label: "Archive / Git", value: `${zipCount} / ${gitCount}`, meta: "Import source mix" },
          ]}
        />
      )}

      <section className="border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <h2 className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">Repository register</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Each entry links to its agent execution context. Import via ZIP or Git to provision a sandbox.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="Search by name or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search projects"
                className="field field-sm w-full pl-9 sm:w-64"
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              {filtered.length} shown · {projects.length} total
            </span>
          </div>
        </div>

        {loading ? (
          <div className="border-y border-line">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 border-b border-line px-3 py-4 last:border-b-0 md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_5rem] md:items-center md:gap-4 md:space-y-0">
                <div className="skeleton hidden h-2.5 w-5 md:block" />
                <div className="space-y-2">
                  <div className="skeleton h-3 w-48 max-w-full" />
                  <div className="skeleton h-2.5 w-64 max-w-full" />
                </div>
                <div className="skeleton h-2.5 w-16" />
                <div className="skeleton h-2.5 w-10" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-line-strong bg-surface/60 px-6 py-14">
            <div className="mx-auto max-w-xl text-center">
              <FolderGit2 className="mx-auto h-8 w-8 text-ink-3" strokeWidth={1.4} />
              <h3 className="mt-4 font-display text-[17px] font-medium tracking-[-0.02em] text-ink">No projects attached</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                Upload a ZIP archive or import a Git repository to provision a sandbox and begin agent runs. Repository records and execution counts will appear in this register.
              </p>
              <button
                onClick={() => {
                  setFormError(null)
                  setInspectionResult(null)
                  setModalOpen(true)
                }}
                className="btn-primary mt-5"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Create first project
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-line-strong bg-surface/60 px-6 py-12">
            <p className="text-[13px] font-medium text-ink">No matching projects</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              No repositories match “{search}”. Adjust the search to view existing records.
            </p>
            <button onClick={() => setSearch("")} className="btn-secondary btn-sm mt-4">Clear search</button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[2.5rem_minmax(0,1.5fr)_7.5rem_4.5rem_5.5rem] items-center gap-4 border-y border-line bg-surface-2/30 px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 lg:grid-cols-[2.5rem_minmax(0,1.4fr)_7.5rem_8.5rem_6.5rem_5.5rem_8rem]">
                <span>Idx</span>
                <span>Repository</span>
                <span>Stack</span>
                <span className="hidden lg:block">Runtime</span>
                <span className="hidden lg:block">Source</span>
                <span className="text-right">Runs</span>
                <span className="text-right">Action</span>
              </div>

              {filtered.map((proj, index) => {
                const env = proj.environments?.[0]
                const source = proj.sources?.[0]
                const sourceMeta = parseSourceMeta(source)
                const sourceLabel =
                  source?.type === "zip_upload"
                    ? "Archive"
                    : sourceMeta.cloned === false
                      ? "Git · Scaffold"
                      : "Git"
                return (
                  <div
                    key={proj.id}
                    className="group grid grid-cols-[2.5rem_minmax(0,1.5fr)_7.5rem_4.5rem_5.5rem] items-center gap-4 border-b border-line px-3 py-4 transition-colors duration-150 hover:bg-surface-2/40 lg:grid-cols-[2.5rem_minmax(0,1.4fr)_7.5rem_8.5rem_6.5rem_5.5rem_8rem]"
                  >
                    <span className="font-mono text-[10px] tabular-nums text-ink-3">{String(index + 1).padStart(2, "0")}</span>

                    <Link href={`/studio?projectId=${proj.id}`} className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.7} />
                        <h3 className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-ink group-hover:text-accent">{proj.name}</h3>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[12px] text-ink-3">
                        {proj.description || "Repository attached to this workspace. Open Studio to inspect files."}
                      </p>
                    </Link>

                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
                      {proj.framework?.toUpperCase() || "—"}
                      <span className="mt-0.5 block normal-case tracking-normal text-ink-3">{proj.language || "—"}</span>
                    </span>

                    <span className="hidden font-mono text-[10px] tabular-nums text-ink-2 lg:block">
                      :{env?.runPort || 3000}
                      <span className="mt-0.5 block text-ink-3">{env?.runtime || "node-20"}</span>
                    </span>

                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 lg:block">
                      {sourceLabel}
                      {sourceMeta.fileCount !== null && (
                        <span className="mt-0.5 block normal-case tracking-normal text-ink-3">
                          {sourceMeta.fileCount} files
                        </span>
                      )}
                    </span>

                    <span className="text-right font-mono text-[11px] tabular-nums text-ink">
                      {proj.executions?.length || 0}
                    </span>

                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/studio?projectId=${proj.id}`}
                        className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-accent"
                      >
                        Studio
                      </Link>
                      <Link
                        href={`/agents?projectId=${proj.id}`}
                        className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-accent"
                      >
                        Run
                      </Link>
                      {confirmDeleteId === proj.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.id)}
                          className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-danger hover:underline"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj.id)}
                          className="icon-btn h-7 w-7 hover:text-danger"
                          title={`Delete ${proj.name}`}
                          aria-label={`Delete ${proj.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="divide-y divide-line border-y border-line md:hidden">
              {filtered.map((proj, index) => {
                const env = proj.environments?.[0]
                const source = proj.sources?.[0]
                const sourceMeta = parseSourceMeta(source)
                return (
                  <div key={proj.id} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/studio?projectId=${proj.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] tabular-nums text-ink-3">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.7} />
                          <h3 className="truncate text-[13.5px] font-medium text-ink">{proj.name}</h3>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                          {proj.framework?.toUpperCase() || "—"} · {proj.language || "—"}
                          {sourceMeta.fileCount !== null ? ` · ${sourceMeta.fileCount} files` : ""} ·{" "}
                          <span className="tabular-nums text-ink-2">{proj.executions?.length || 0} runs</span>
                        </p>
                      </Link>
                      <Link
                        href={`/studio?projectId=${proj.id}`}
                        className="btn-secondary btn-sm shrink-0"
                      >
                        Studio
                      </Link>
                    </div>

                    <details className="mt-2">
                      <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 select-none">
                        Sandbox &amp; repository details
                      </summary>
                      <div className="mt-2 space-y-2 border-t border-line/70 pt-2">
                        <p className="text-[12px] leading-relaxed text-ink-3">
                          {proj.description || "Repository attached to this workspace."}
                        </p>
                        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-ink-2">
                          <span>Port :{env?.runPort || 3000} ({env?.runtime || "node-20"})</span>
                          <span>Source: {source?.type === "zip_upload" ? "Archive" : "Git"}</span>
                        </div>
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* New project modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[1px] animate-fade-in sm:p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="panel max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-float"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2
                  id="new-project-title"
                  className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink"
                >
                  Ingest repository
                </h2>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
                  New project · sandbox provisioning
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="icon-btn -mr-1.5 -mt-1"
                aria-label="Close new project dialog"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 p-5">
              <div className="segmented w-full" role="group" aria-label="Import mode">
                <button
                  type="button"
                  onClick={() => {
                    setImportMode("zip")
                    setFormError(null)
                  }}
                  aria-pressed={importMode === "zip"}
                  className={cn(
                    "segmented-item flex-1",
                    importMode === "zip" && "segmented-item-active"
                  )}
                >
                  ZIP / Folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportMode("git")
                    setFormError(null)
                  }}
                  aria-pressed={importMode === "git"}
                  className={cn(
                    "segmented-item flex-1",
                    importMode === "git" && "segmented-item-active"
                  )}
                >
                  Git repository
                </button>
              </div>

              <div>
                <label className="label" htmlFor="project-name">
                  Project name
                </label>
                <input
                  id="project-name"
                  type="text"
                  placeholder={
                    importMode === "git" && repoUrl
                      ? deriveProjectNameFromRepoInput(repoUrl) || "Acme Billing Core"
                      : "Acme Billing Core"
                  }
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value)
                    setFormError(null)
                  }}
                  className="field"
                />
                <p className="mt-1 font-mono text-[10px] text-ink-3">
                  {importMode === "zip"
                    ? "Leave blank to auto-fill from the uploaded folder or .zip name."
                    : "Leave blank to auto-fill from the Git repository name."}
                </p>
              </div>

              {importMode === "zip" ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="label">Source archive or folder</span>
                    {selectedFile && !packing && (
                      <button
                        type="button"
                        onClick={clearSelectedArchive}
                        className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 hover:text-danger"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onDrop={handleDrop}
                    className={cn(
                      "flex w-full flex-col items-center justify-center border border-dashed px-5 py-6 text-center transition-colors",
                      isDragging
                        ? "border-accent bg-accent-soft/20"
                        : selectedFile
                          ? "border-success/40 bg-success-soft/10"
                          : "border-line-strong bg-surface-2/40"
                    )}
                  >
                    <Upload
                      className={cn("mb-2 h-5 w-5", selectedFile ? "text-success" : "text-ink-3")}
                      strokeWidth={1.6}
                    />
                    <span className="text-[12.5px] font-medium text-ink">
                      {packing
                        ? "Packaging folder into compressed archive…"
                        : selectionSummary
                          ? selectionSummary.name
                          : "Drag & drop a .zip archive or project folder"}
                    </span>
                    <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      {packing
                        ? "Excluding node_modules and .git automatically"
                        : selectionSummary
                          ? `${(selectionSummary.sizeBytes / 1024).toFixed(1)} KB${
                              typeof selectionSummary.fileCount === "number"
                                ? ` · ${selectionSummary.fileCount} files`
                                : ""
                            }${
                              selectionSummary.skippedCount
                                ? ` · ${selectionSummary.skippedCount} ignored`
                                : ""
                            }`
                          : "Supports .zip files, local folders, or multiple source files (up to 25 MB)"}
                    </span>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <label
                        htmlFor="project-zip-input"
                        className="btn-secondary btn-sm cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Choose .zip file
                      </label>
                      <label
                        htmlFor="project-folder-input"
                        className="btn-secondary btn-sm cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Choose folder
                      </label>
                    </div>
                  </div>
                  <input
                    id="project-zip-input"
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
                    onChange={handleZipInputChange}
                    className="hidden"
                  />
                  <input
                    id="project-folder-input"
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={handleFolderInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="repo-url">
                    Repository URL
                  </label>
                  <input
                    id="repo-url"
                    type="text"
                    placeholder="https://github.com/org/repo or org/repo"
                    value={repoUrl}
                    onChange={(e) => handleRepoUrlChange(e.target.value)}
                    onBlur={() => {
                      if (!projectName.trim() && repoUrl.trim()) {
                        const derived = deriveProjectNameFromRepoInput(repoUrl)
                        if (derived) setProjectName(derived)
                      }
                    }}
                    className="field font-mono text-[12px]"
                  />
                  <p className="mt-1 font-mono text-[10px] text-ink-3">
                    Supports full https:// GitHub/GitLab URLs or owner/repo shorthand.
                  </p>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 border border-danger/30 bg-danger-soft/40 px-3 py-2.5 text-[12px] text-danger"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span>{formError}</span>
                </div>
              )}

              {inspectionResult && (
                <div
                  className={cn(
                    "border px-3 py-2.5",
                    inspectionResult.provisionMode === "starter_fallback"
                      ? "border-warning/30 bg-warning-soft/30 text-warning"
                      : "border-success/25 bg-success-soft text-success"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-medium">
                    {inspectionResult.provisionMode === "starter_fallback" ? (
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {inspectionResult.provisionMode === "starter_fallback"
                      ? "Remote repository unreachable — provisioned starter scaffold with origin linked"
                      : "Project inspected and verified"}
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
                    Framework {inspectionResult.framework} · {inspectionResult.fileCount} files
                    {inspectionResult.cloneError ? ` · ${inspectionResult.cloneError}` : ""}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || packing}
                  className="btn-primary"
                >
                  {packing ? "Packing folder…" : uploading ? "Provisioning…" : "Create and provision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
