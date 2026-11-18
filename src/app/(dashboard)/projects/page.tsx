"use client"

import { useEffect, useState, useRef } from "react"
import { useModalA11y } from "@/lib/use-modal-a11y"
import Link from "next/link"
import {
  FolderGit2,
  Plus,
  Upload,
  GitBranch,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  CheckCircle2,
  FileCode,
  Package,
  ExternalLink,
  Sparkles,
  Search,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

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

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Projects & Workspaces"
        description="Unified repositories, persistent cloud sandboxes, and agent worktree contexts."
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-charcoal px-3.5 py-2 text-xs font-semibold text-[#FDFDFD] shadow-sm hover:bg-[#202020] active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4 text-accent" />
            New Project
          </button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface pl-8.5 pr-3 py-1.5 text-xs text-ink placeholder-ink-3 outline-none focus:border-accent/40 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-2">
          <span>{projects.length} Total Projects</span>
          <span className="h-3 w-px bg-line" />
          <span className="flex items-center gap-1 text-success font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            All Sandboxes Ready
          </span>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl border border-line bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center space-y-3">
          <FolderGit2 className="h-10 w-10 text-ink-3 mx-auto" />
          <h3 className="text-sm font-semibold text-ink">No projects found</h3>
          <p className="text-xs text-ink-2 max-w-sm mx-auto">
            Upload your project ZIP archive or import a Git repository to start orchestrating coding agents.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020]"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((proj) => {
            const env = proj.environments?.[0]
            const source = proj.sources?.[0]
            return (
              <GlassCard
                key={proj.id}
                className="flex flex-col justify-between p-5 border-line bg-surface hover:border-line-strong shadow-xs transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink border border-line">
                        <FileCode className="h-4 w-4 text-accent" />
                      </span>
                      <div>
                        <h3 className="text-[13px] font-semibold text-ink leading-snug">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-ink-2">
                          {proj.framework?.toUpperCase()} • {proj.language}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-success-soft text-success border border-success/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Sandbox Active
                    </span>
                  </div>

                  <p className="mt-3 text-[12px] text-ink-2 line-clamp-2 leading-relaxed">
                    {proj.description || "Production-grade project repository attached to MODELVAULT orchestrator."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-line grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-ink-3 block">Port / Env:</span>
                      <span className="font-mono text-ink font-medium">
                        :{env?.runPort || 3000} ({env?.runtime || "node-20"})
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Source:</span>
                      <span className="font-mono text-ink truncate block">
                        {source?.type === "zip_upload" ? "Archive Upload" : "Git Clone"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[11px] text-ink-3">
                    {proj.executions?.length || 0} Executions
                  </span>
                  <Link
                    href={`/agents?projectId=${proj.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                  >
                    Open in Agent Center
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* New Project Modal (ZIP Upload & Inspection) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-2xl"
          >
            <h2 className="text-sm font-semibold text-ink pb-3 border-b border-line flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-accent" />
              Create Project & Ingest Repository
            </h2>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4 text-xs">
              {/* Import Mode Tabs */}
              <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setImportMode("zip")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    importMode === "zip"
                      ? "bg-surface text-ink shadow-xs"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  Upload ZIP Archive
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("git")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    importMode === "git"
                      ? "bg-surface text-ink shadow-xs"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  Git Repository URL
                </button>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Billing Core"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent/40"
                />
              </div>

              {importMode === "zip" ? (
                <div>
                  <label className="block text-ink font-medium mb-1">
                    Source ZIP Archive
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-ink-3 mb-2" />
                    <p className="text-xs font-semibold text-ink">
                      {selectedFile ? selectedFile.name : "Click to select .zip project archive"}
                    </p>
                    <p className="text-[11px] text-ink-2 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB ready for AST inspection`
                        : "ZIP files containing package.json or requirements.txt"}
                    </p>
                  </div>
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
                  <label className="block text-ink font-medium mb-1">
                    Repository URL (HTTPS / SSH)
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/org/repo.git"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent/40"
                  />
                </div>
              )}

              {/* Inspection live results */}
              {inspectionResult && (
                <div className="rounded-lg border border-success/20 bg-success-soft p-3 space-y-1 text-success">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Project Inspected & Verified</span>
                  </div>
                  <p className="text-[11px] text-ink">
                    Framework: <strong>{inspectionResult.framework}</strong> • Files: <strong>{inspectionResult.fileCount}</strong>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-charcoal px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#202020] disabled:opacity-50"
                >
                  {uploading ? "Inspecting & Provisioning..." : "Create & Provision Sandbox"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
