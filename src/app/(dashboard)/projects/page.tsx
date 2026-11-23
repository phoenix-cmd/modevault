"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import Link from "next/link"
import {
  AlertTriangle,
  FolderGit2,
  Plus,
  Upload,
  CheckCircle2,
  FileCode,
  Search,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand, StatBandSkeleton } from "@/components/ui/stat-band"
import { cn } from "@/lib/utils"

function deriveProjectNameFromRepoInput(input: string): string {
  const cleaned = input.trim().replace(/\.git$/i, "").replace(/\/+$/, "")
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
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [inspectionResult, setInspectionResult] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const applySelectedFile = (file: File) => {
    setFormError(null)
    if (!file.name.toLowerCase().endsWith(".zip") && file.type && !file.type.includes("zip")) {
      setFormError("Please select a valid .zip archive file.")
      return
    }
    setSelectedFile(file)
    setProjectName((prev) => prev.trim() || file.name.replace(/\.zip$/i, ""))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      applySelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      applySelectedFile(file)
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
        setSelectedFile(null)
        setProjectName("")
        setRepoUrl("")
        setFormError(null)
        setInspectionResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
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
            { label: "Sandboxes", value: String(projects.length), meta: "Provisioned runtimes" },
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
              <div className="grid grid-cols-[2.5rem_minmax(0,1.5fr)_7.5rem_4.5rem_4.5rem] items-center gap-4 border-y border-line bg-surface-2/30 px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 lg:grid-cols-[2.5rem_minmax(0,1.4fr)_7.5rem_8.5rem_6.5rem_5.5rem_4.5rem]">
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
                return (
                  <Link
                    key={proj.id}
                    href={`/agents?projectId=${proj.id}`}
                    className="group grid grid-cols-[2.5rem_minmax(0,1.5fr)_7.5rem_4.5rem_4.5rem] items-center gap-4 border-b border-line px-3 py-4 transition-colors duration-150 hover:bg-surface-2/40 lg:grid-cols-[2.5rem_minmax(0,1.4fr)_7.5rem_8.5rem_6.5rem_5.5rem_4.5rem]"
                  >
                    <span className="font-mono text-[10px] tabular-nums text-ink-3">{String(index + 1).padStart(2, "0")}</span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.7} />
                        <h3 className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-ink">{proj.name}</h3>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[12px] text-ink-3">
                        {proj.description || "Repository attached to this workspace. Open to view agent execution context."}
                      </p>
                    </div>

                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
                      {proj.framework?.toUpperCase() || "—"}
                      <span className="mt-0.5 block normal-case tracking-normal text-ink-3">{proj.language || "—"}</span>
                    </span>

                    <span className="hidden font-mono text-[10px] tabular-nums text-ink-2 lg:block">
                      :{env?.runPort || 3000}
                      <span className="mt-0.5 block text-ink-3">{env?.runtime || "node-20"}</span>
                    </span>

                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 lg:block">
                      {source?.type === "zip_upload" ? "Archive" : "Git"}
                    </span>

                    <span className="text-right font-mono text-[11px] tabular-nums text-ink">
                      {proj.executions?.length || 0}
                    </span>

                    <span className="text-right font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 transition-colors group-hover:text-accent">
                      Open
                    </span>
                  </Link>
                )
              })}
            </div>

            <div className="divide-y divide-line border-y border-line md:hidden">
              {filtered.map((proj, index) => {
                const env = proj.environments?.[0]
                const source = proj.sources?.[0]
                return (
                  <div key={proj.id} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/agents?projectId=${proj.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] tabular-nums text-ink-3">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.7} />
                          <h3 className="truncate text-[13.5px] font-medium text-ink">{proj.name}</h3>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                          {proj.framework?.toUpperCase() || "—"} · {proj.language || "—"} ·{" "}
                          <span className="tabular-nums text-ink-2">{proj.executions?.length || 0} runs</span>
                        </p>
                      </Link>
                      <Link
                        href={`/agents?projectId=${proj.id}`}
                        className="btn-secondary btn-sm shrink-0"
                      >
                        Open
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
                  ZIP archive
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
                    ? "Leave blank to auto-fill from the uploaded .zip filename."
                    : "Leave blank to auto-fill from the Git repository name."}
                </p>
              </div>

              {importMode === "zip" ? (
                <div>
                  <span className="label">Source archive</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
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
                      "flex w-full cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition-colors",
                      isDragging
                        ? "border-accent bg-accent-soft/20"
                        : selectedFile
                          ? "border-success/40 bg-success-soft/10"
                          : "border-line-strong bg-surface-2/40 hover:border-accent-line"
                    )}
                  >
                    <Upload
                      className={cn("mb-2.5 h-5 w-5", selectedFile ? "text-success" : "text-ink-3")}
                      strokeWidth={1.6}
                    />
                    <span className="text-[12.5px] font-medium text-ink">
                      {selectedFile
                        ? selectedFile.name
                        : "Click to choose or drag & drop a .zip archive"}
                    </span>
                    <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB ready for AST inspection`
                        : "ZIP containing package.json or requirements.txt (up to 25 MB)"}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed,multipart/x-zip"
                    onChange={handleFileChange}
                    className="sr-only"
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
                <div className="border border-success/25 bg-success-soft px-3 py-2.5 text-success">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Project inspected and verified
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
                    Framework {inspectionResult.framework} ·{" "}
                    {inspectionResult.fileCount} files
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
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Provisioning…" : "Create and provision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
