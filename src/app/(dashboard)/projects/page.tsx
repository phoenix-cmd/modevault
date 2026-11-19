"use client"

import { useEffect, useState, useRef } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import Link from "next/link"
import {
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const dialogRef = useModalA11y(modalOpen, () => setModalOpen(false))
  const [search, setSearch] = useState("")

  // Form state
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [importMode, setImportMode] = useState<"zip" | "git">("zip")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!projectName) {
        setProjectName(file.name.replace(/\.zip$/i, ""))
      }
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setInspectionResult(null)

    try {
      if (importMode === "zip" && selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("name", projectName)

        const res = await fetch("/api/projects/upload", {
          method: "POST",
          body: formData,
        })
        const json = await res.json()
        if (json.data?.inspection) {
          setInspectionResult(json.data.inspection)
        }
      } else {
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName,
            repositoryUrl: repoUrl || null,
          }),
        })
      }

      await fetchProjects()
      setTimeout(() => {
        setModalOpen(false)
        setSelectedFile(null)
        setProjectName("")
        setRepoUrl("")
        setInspectionResult(null)
      }, 1500)
    } catch (err) {
      console.error(err)
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
    <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <PageHeader
        eyebrow="Workspace · Repositories"
        title="Projects"
        description="Unified repositories, persistent cloud sandboxes, and agent worktree contexts."
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
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
            {
              label: "Projects",
              value: String(projects.length),
              meta: "Attached to this workspace",
            },
            {
              label: "Sandboxes",
              value: String(projects.length),
              meta: "Provisioned runtimes",
            },
            {
              label: "Executions",
              value: String(executionCount),
              meta: "Recorded agent runs",
            },
            {
              label: "Archive / Git",
              value: `${zipCount} / ${gitCount}`,
              meta: "Import source mix",
            },
          ]}
        />
      )}

      <section className="border-t border-line pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <h2 className="panel-title">Repositories</h2>
            <p className="panel-subtitle">
              Each project owns its sandbox, branch history, and agent runtime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                strokeWidth={1.8}
              />
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search projects"
                className="field field-sm w-64 pl-9"
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              {filtered.length} of {projects.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="border-t border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 border-b border-line px-3 py-5 last:border-b-0"
              >
                <div className="skeleton h-2.5 w-6" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-48" />
                  <div className="skeleton h-2.5 w-72" />
                </div>
                <div className="skeleton h-2.5 w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-line bg-surface px-6 py-16 text-center">
            <FolderGit2
              className="mx-auto h-8 w-8 text-ink-3"
              strokeWidth={1.4}
            />
            <h3 className="mt-4 font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
              No projects found
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">
              Upload a ZIP archive or import a Git repository to start
              orchestrating coding agents.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-5"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Create your first project
            </button>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_8rem_9rem_7rem_7rem_2rem] items-center gap-4 border-y border-line bg-surface-2/40 px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 md:grid">
              <span>#</span>
              <span>Project</span>
              <span>Stack</span>
              <span>Runtime</span>
              <span>Source</span>
              <span>Runs</span>
              <span />
            </div>

            {filtered.map((proj, index) => {
              const env = proj.environments?.[0]
              const source = proj.sources?.[0]
              return (
                <Link
                  key={proj.id}
                  href={`/agents?projectId=${proj.id}`}
                  className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-3 py-4 transition-colors duration-150 hover:bg-surface-2/40 md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_9rem_7rem_7rem_2rem]"
                >
                  <span className="font-mono text-[10px] tabular-nums text-ink-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileCode
                        className="h-3.5 w-3.5 shrink-0 text-accent"
                        strokeWidth={1.8}
                      />
                      <h3 className="truncate text-[13px] font-medium text-ink">
                        {proj.name}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11.5px] text-ink-3">
                      {proj.description ||
                        "Production repository attached to the MODELVAULT orchestrator."}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3 md:hidden">
                      <span>
                        {proj.framework?.toUpperCase() || "UNKNOWN"} ·{" "}
                        {proj.language || "—"}
                      </span>
                      <span>
                        :{env?.runPort || 3000} ({env?.runtime || "node-20"})
                      </span>
                      <span>{proj.executions?.length || 0} runs</span>
                    </div>
                  </div>

                  <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 md:block">
                    {proj.framework?.toUpperCase() || "—"}
                    <span className="block text-ink-3">{proj.language || "—"}</span>
                  </span>

                  <span className="hidden font-mono text-[10px] text-ink-2 md:block">
                    :{env?.runPort || 3000}
                    <span className="block text-ink-3">
                      {env?.runtime || "node-20"}
                    </span>
                  </span>

                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 md:block">
                    {source?.type === "zip_upload" ? "Archive" : "Git"}
                  </span>

                  <span className="hidden font-mono text-[11px] tabular-nums text-ink-2 md:block">
                    {proj.executions?.length || 0}
                  </span>

                  <span className="flex justify-end">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 transition-colors group-hover:text-accent">
                      Open
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* New project modal */}
      {modalOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl"
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
                  onClick={() => setImportMode("zip")}
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
                  onClick={() => setImportMode("git")}
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
                  required
                  placeholder="Acme Billing Core"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="field"
                />
              </div>

              {importMode === "zip" ? (
                <div>
                  <span className="label">Source archive</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center border border-dashed border-line-strong bg-surface-2/40 px-6 py-8 text-center transition-colors hover:border-accent-line"
                  >
                    <Upload
                      className="mb-2.5 h-5 w-5 text-ink-3"
                      strokeWidth={1.6}
                    />
                    <span className="text-[12.5px] font-medium text-ink">
                      {selectedFile
                        ? selectedFile.name
                        : "Select a .zip project archive"}
                    </span>
                    <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB ready for AST inspection`
                        : "ZIP containing package.json or requirements.txt"}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
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
                    placeholder="https://github.com/org/repo.git"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="field font-mono text-[12px]"
                  />
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
